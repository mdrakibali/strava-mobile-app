import { estimateCalories, metFor } from '../calories';

describe('estimateCalories (MET method)', () => {
  it('returns null when there is nothing meaningful to estimate', () => {
    expect(estimateCalories('Run', 0, 0)).toBeNull();
    expect(estimateCalories('Run', 100, 10)).toBeNull(); // < 30 s
    expect(estimateCalories('Workout', 5000, 1800)).toBeNull(); // unsupported sport
  });

  it('5 km run in 30 min at 70 kg ≈ 10 km/h → MET ≈ 10 → ≈ 350 kcal', () => {
    const kcal = estimateCalories('Run', 5000, 1800, 70)!;
    expect(kcal).toBeGreaterThan(320);
    expect(kcal).toBeLessThan(380);
  });

  it('scales linearly with body weight', () => {
    const a = estimateCalories('Run', 5000, 1800, 60)!;
    const b = estimateCalories('Run', 5000, 1800, 90)!;
    expect(b / a).toBeCloseTo(1.5, 1);
  });

  it('a ride burns fewer kcal per km than a run (old formula charged 60–65 kcal/km for any sport)', () => {
    const run = estimateCalories('Run', 10000, 3600, 70)! / 10;
    const ride = estimateCalories('Ride', 25000, 3600, 70)! / 25;
    expect(ride).toBeLessThan(run);
  });

  it('MET is clamped at the table ends and interpolated between anchors', () => {
    expect(metFor('Walk', 0.1)).toBeCloseTo(2.8);
    expect(metFor('Run', 10)).toBeCloseTo(14.5);
    const mid = metFor('Run', 9 / 3.6)!; // 9 km/h between 8.0 (8.3) and 9.7 (9.8)
    expect(mid).toBeGreaterThan(8.3);
    expect(mid).toBeLessThan(9.8);
    expect(metFor('Hike', 1)).toBe(6.0);
  });
});
