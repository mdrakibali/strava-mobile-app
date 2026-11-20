/**
 * Design tokens — single source of truth for colour, type, spacing, radius, elevation.
 * See docs/STRAVA_SCREEN_DESIGN_PLAN.md §2. Contrast ratios there are computed.
 */
import { Platform, TextStyle, ViewStyle } from 'react-native';

export const color = {
  brand: '#F25C19',
  brandPressed: '#D64C0E',
  brandText: '#C2410C',
  brandSoft: '#FFF1E8',

  ink: '#15171C',
  inkSecondary: '#4A4F5A',
  inkTertiary: '#6E7480',
  inkDisabled: '#A3A8B2',
  inverse: '#FFFFFF',

  surface: '#FFFFFF',
  canvas: '#F3F4F6',
  border: '#E3E5E9',
  borderStrong: '#C9CDD4',

  success: '#1F9D5B',
  successSoft: '#E3F5EA',
  successText: '#14532D',
  warning: '#F5C200',
  warningSoft: '#FFF7D6',
  danger: '#D92D20',
  dangerSoft: '#FDECEA',
  info: '#2563EB',

  routeStart: '#1F9D5B',
  routeEnd: '#15171C',
  overlay: 'rgba(15,17,22,0.5)',
  skeleton: '#E9EBEF',
} as const;

export type ColorToken = keyof typeof color;

export const space = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  gutter: 16,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 20,
  pill: 999,
} as const;

const tabular: TextStyle = { fontVariant: ['tabular-nums'] };

export const type = {
  display: { fontSize: 64, lineHeight: 70, fontWeight: '700', letterSpacing: -1, ...tabular },
  metricXL: { fontSize: 32, lineHeight: 38, fontWeight: '700', letterSpacing: -0.5, ...tabular },
  metricL: { fontSize: 24, lineHeight: 30, fontWeight: '700', ...tabular },
  metricM: { fontSize: 18, lineHeight: 24, fontWeight: '700', ...tabular },
  title1: { fontSize: 26, lineHeight: 32, fontWeight: '700' },
  title2: { fontSize: 20, lineHeight: 26, fontWeight: '700' },
  title3: { fontSize: 16, lineHeight: 22, fontWeight: '600' },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' },
  label: { fontSize: 13, lineHeight: 18, fontWeight: '500' },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  button: { fontSize: 16, lineHeight: 20, fontWeight: '700' },
  buttonSm: { fontSize: 14, lineHeight: 18, fontWeight: '700' },
  strip: { fontSize: 13, lineHeight: 18, fontWeight: '800', letterSpacing: 0.8 },
} satisfies Record<string, TextStyle>;

export type TypeVariant = keyof typeof type;

export const elevation = {
  floating: Platform.select<ViewStyle>({
    android: { elevation: 6 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.14,
      shadowRadius: 10,
      shadowOffset: { width: 0, height: 4 },
    },
  })!,
  sheet: Platform.select<ViewStyle>({
    android: { elevation: 12 },
    default: {
      shadowColor: '#000',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: -2 },
    },
  })!,
} as const;

export const hitSlop = { top: 8, bottom: 8, left: 8, right: 8 } as const;
export const minTouch = 44;
