import {
  DASH,
  defaultActivityTitle,
  formatActivityDate,
  formatCalories,
  formatClock,
  formatDistance,
  formatDuration,
  formatPace,
  formatSpeed,
  kmValue,
  paceValue,
} from '../format';

describe('distance', () => {
  it('formats km with 2 decimals below 100 km and 1 above', () => {
    expect(kmValue(5021)).toBe('5.02');
    expect(kmValue(0)).toBe('0.00');
    expect(kmValue(123456)).toBe('123.5');
    expect(formatDistance(1500)).toBe('1.50 km');
  });
  it('shows a dash for missing values, never a placeholder number', () => {
    expect(kmValue(null)).toBe(DASH);
    expect(formatDistance(undefined)).toBe(DASH);
    expect(kmValue(NaN)).toBe(DASH);
  });
});

describe('time', () => {
  it('clock shows hours only when needed (old code showed 65:00 for 1h05)', () => {
    expect(formatClock(0)).toBe('00:00');
    expect(formatClock(1713)).toBe('28:33');
    expect(formatClock(3900)).toBe('1:05:00');
    expect(formatClock(1713, true)).toBe('00:28:33');
  });
  it('compact duration', () => {
    expect(formatDuration(18)).toBe('18s');
    expect(formatDuration(2529)).toBe('42m 9s');
    expect(formatDuration(3900)).toBe('1h 5m');
    expect(formatDuration(null)).toBe(DASH);
  });
});

describe('pace and speed', () => {
  it('pace = moving time / distance, mm:ss per km', () => {
    expect(paceValue(5000, 1500)).toBe('5:00');
    expect(paceValue(5020, 1713)).toBe('5:41');
    expect(formatPace(1000, 330)).toBe('5:30 /km');
  });
  it('no pace below 50 m or without time (old code defaulted to 5:00)', () => {
    expect(paceValue(30, 60)).toBe(DASH);
    expect(paceValue(0, 0)).toBe(DASH);
    expect(paceValue(1000, 0)).toBe(DASH);
  });
  it('speed in km/h', () => {
    expect(formatSpeed(6.75)).toBe('24.3 km/h');
    expect(formatSpeed(null)).toBe(DASH);
  });
});

describe('calories display', () => {
  it('dash for missing or zero', () => {
    expect(formatCalories(null)).toBe(DASH);
    expect(formatCalories(0)).toBe(DASH);
    expect(formatCalories(1234)).toBe('1,234 Cal');
  });
});

describe('dates and titles', () => {
  const now = new Date(2026, 10, 19, 18, 0, 0);
  it('today / yesterday / full date', () => {
    expect(formatActivityDate(new Date(2026, 10, 19, 6, 42).toISOString(), now)).toMatch(/^Today at 6:42/);
    expect(formatActivityDate(new Date(2026, 10, 18, 7, 5).toISOString(), now)).toMatch(/^Yesterday at 7:05/);
    expect(formatActivityDate(new Date(2026, 10, 1, 9, 44).toISOString(), now)).toMatch(/^November 1, 2026 at 9:44/);
    expect(formatActivityDate(undefined, now)).toBe('');
  });
  it('default title by time of day', () => {
    expect(defaultActivityTitle('Run', new Date(2026, 0, 1, 6))).toBe('Morning Run');
    expect(defaultActivityTitle('Ride', new Date(2026, 0, 1, 13))).toBe('Afternoon Ride');
    expect(defaultActivityTitle('Walk', new Date(2026, 0, 1, 19))).toBe('Evening Walk');
    expect(defaultActivityTitle('Hike', new Date(2026, 0, 1, 23))).toBe('Night Hike');
    expect(defaultActivityTitle('Hike', new Date(2026, 0, 1, 3))).toBe('Night Hike');
  });
});
