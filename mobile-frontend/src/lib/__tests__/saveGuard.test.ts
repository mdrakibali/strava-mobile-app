import { noMovementReason } from '../saveGuard';

describe('noMovementReason', () => {
  it('blocks a GPS activity where nothing moved', () => {
    expect(noMovementReason('Run', 0, 0)).toMatch(/No movement/);
    expect(noMovementReason('Ride', 4.2, 0)).toMatch(/No movement/);
  });
  it('allows real movement', () => {
    expect(noMovementReason('Run', 800, 300)).toBeNull();
    expect(noMovementReason('Walk', 12, 0)).toBeNull();
    expect(noMovementReason('Run', 3, 20)).toBeNull();
  });
  it('never blocks indoor timers, which have no distance by design', () => {
    expect(noMovementReason('Workout', 0, 0)).toBeNull();
    expect(noMovementReason('Yoga', 0, 0)).toBeNull();
  });
});
