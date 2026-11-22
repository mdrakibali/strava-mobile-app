import * as Location from 'expo-location';
import { recordingEngine } from '../engine';

jest.mock('expo-crypto', () => ({
  randomUUID: () => 'test-session-uuid',
}));

const mockSessions = new Map<string, any>();
const mockPoints = new Map<string, any[]>();

jest.mock('../db', () => ({
  sessionsRepo: {
    findActive: jest.fn(async () => null),
    create: jest.fn(async (s) => {
      mockSessions.set(s.id, { ...s, status: 'recording', pauses: [], segment: 0 });
    }),
    saveLifecycle: jest.fn(async (id, lifecycle) => {
      const s = mockSessions.get(id);
      if (s) mockSessions.set(id, { ...s, ...lifecycle });
    }),
    remove: jest.fn(async (id) => {
      mockSessions.delete(id);
      mockPoints.delete(id);
    }),
    setSave: jest.fn(async () => {}),
  },
  pointsRepo: {
    append: jest.fn(async (id, pts) => pts),
    range: jest.fn(async (id) => mockPoints.get(id) ?? []),
  },
}));

jest.mock('expo-location', () => ({
  hasStartedLocationUpdatesAsync: jest.fn(),
  startLocationUpdatesAsync: jest.fn(),
  stopLocationUpdatesAsync: jest.fn(),
  watchPositionAsync: jest.fn(),
  getForegroundPermissionsAsync: jest.fn(),
  requestForegroundPermissionsAsync: jest.fn(),
  hasServicesEnabledAsync: jest.fn(),
  Accuracy: { BestForNavigation: 6, Balanced: 3 },
  ActivityType: { Fitness: 1 },
}));

describe('RecordingEngine GPS start/resume & trackingMode', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSessions.clear();
    mockPoints.clear();
    (Location.getForegroundPermissionsAsync as jest.Mock).mockResolvedValue({ granted: true });
    (Location.hasServicesEnabledAsync as jest.Mock).mockResolvedValue(true);
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
    (Location.stopLocationUpdatesAsync as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await recordingEngine.discard().catch(() => {});
  });

  it('sets trackingMode to "background" when TaskManager starts successfully', async () => {
    recordingEngine.setAthlete('athlete-1');
    (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(undefined);

    await recordingEngine.start('Run');
    const snap = recordingEngine.getSnapshot();

    expect(snap.lifecycle.status).toBe('recording');
    expect(snap.trackingMode).toBe('background');
    expect(snap.error).toBeNull();
  });

  it('falls back to "foreground_only" with a warning when background service fails but watchPosition succeeds', async () => {
    recordingEngine.setAthlete('athlete-1');
    (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Background location not allowed in Expo Go')
    );
    (Location.watchPositionAsync as jest.Mock).mockResolvedValueOnce({
      remove: jest.fn(),
    });

    await recordingEngine.start('Run');
    const snap = recordingEngine.getSnapshot();

    expect(snap.lifecycle.status).toBe('recording');
    expect(snap.trackingMode).toBe('foreground_only');
    expect(snap.error).toContain('Background tracking unavailable');
  });

  it('fails to start and sets trackingMode to "idle" when both background and foreground fail', async () => {
    recordingEngine.setAthlete('athlete-1');
    (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Native service error')
    );
    (Location.watchPositionAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Foreground sensor failed')
    );

    await expect(recordingEngine.start('Run')).rejects.toThrow();

    const snap = recordingEngine.getSnapshot();
    expect(snap.lifecycle.status).toBe('idle');
    expect(snap.trackingMode).toBe('idle');
  });

  it('does not commit RESUME state if location updates cannot restart', async () => {
    recordingEngine.setAthlete('athlete-1');
    (Location.startLocationUpdatesAsync as jest.Mock).mockResolvedValueOnce(undefined);

    await recordingEngine.start('Run');
    await recordingEngine.pause();

    expect(recordingEngine.getSnapshot().lifecycle.status).toBe('paused');

    // Simulate location failure on resume
    (Location.hasStartedLocationUpdatesAsync as jest.Mock).mockResolvedValue(false);
    (Location.startLocationUpdatesAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Failed to restart GPS')
    );
    (Location.watchPositionAsync as jest.Mock).mockRejectedValueOnce(
      new Error('Foreground also failed')
    );

    await expect(recordingEngine.resume()).rejects.toThrow('Foreground also failed');

    const snap = recordingEngine.getSnapshot();
    // Must remain paused, not falsely claim recording
    expect(snap.lifecycle.status).toBe('paused');
    expect(snap.error).toContain('Foreground also failed');
  });
});
