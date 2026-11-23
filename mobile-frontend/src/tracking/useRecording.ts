import { useEffect, useState, useSyncExternalStore } from 'react';
import { recordingEngine, RecordingSnapshot } from './engine';
import { activeMs } from './shared';
import { syncWorker } from './sync';

/** Live recording state. Only screens that show live data should subscribe (ADR-07). */
export const useRecording = (): RecordingSnapshot =>
  useSyncExternalStore(recordingEngine.subscribe, recordingEngine.getSnapshot);

export const usePendingUploads = () =>
  useSyncExternalStore(syncWorker.subscribe, syncWorker.getPending);

/** Re-render every `ms` while `enabled` (drives the timer display; the time itself is derived). */
export const useNow = (enabled: boolean, ms = 1000) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(id);
  }, [enabled, ms]);
  return now;
};

export const isRecordingActive = (s: RecordingSnapshot) =>
  s.lifecycle.status === 'recording' || s.lifecycle.status === 'paused';

export const timerSeconds = (s: RecordingSnapshot, now: number) =>
  Math.floor(activeMs(s.lifecycle, now) / 1000);

/** Current speed, 0 when the last accepted fix is stale or the recording is paused. */
export const liveSpeed = (s: RecordingSnapshot, now: number) =>
  s.lifecycle.status === 'recording' && s.lastAcceptedAt != null && now - s.lastAcceptedAt <= 5000
    ? s.speedAtLastFixMps
    : 0;

export type GpsStatus = 'off' | 'denied' | 'acquiring' | 'good' | 'weak' | 'lost';

/** GPS quality from the most recent fix of any kind. */
export const gpsStatus = (s: RecordingSnapshot, now: number): GpsStatus => {
  if (s.permission === 'denied') return 'denied';
  if (s.permission === 'services_off') return 'off';
  const f = s.lastFix;
  if (!f) return 'acquiring';
  if (now - f.t > 15_000) return s.lifecycle.status === 'recording' ? 'lost' : 'acquiring';
  return f.acc != null && f.acc <= 20 ? 'good' : 'weak';
};
