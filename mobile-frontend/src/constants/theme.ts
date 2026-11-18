export const Colors = {
  // Brand Athletic Colors
  primary: '#FC4C02', // Strava iconic Athletic Orange
  primaryDark: '#E34402',
  primaryLight: '#FFF2EB',
  
  // Surfaces & Backgrounds (Crisp Light Theme)
  background: '#FFFFFF',
  surface: '#F8F9FA',
  surfaceHover: '#F1F3F5',
  card: '#FFFFFF',
  
  // Borders & Dividers
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  divider: '#EAECEF',
  
  // Typography
  textPrimary: '#111827',
  textSecondary: '#4B5563',
  textMuted: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Metric & Status Indicators
  success: '#10B981', // PR / Record green
  gold: '#F59E0B',    // KOM / Trophy crown gold
  heartRate: '#EF4444', // Red HR
  pace: '#3B82F6',     // Blue Pace
  elevation: '#8B5CF6',// Purple Elevation
  cadence: '#EC4899',  // Pink Cadence
  power: '#F97316',    // Orange Power
  
  // Overlays & Modals
  overlay: 'rgba(0, 0, 0, 0.5)',
  tint: '#FC4C02',
} as const;

export const Typography = {
  fontFamily: {
    sans: 'System',
    mono: 'monospace',
  },
  fontSize: {
    xs: 11,
    sm: 13,
    base: 15,
    md: 17,
    lg: 20,
    xl: 24,
    xxl: 30,
    display: 38,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const BorderRadius = {
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
};

export const Shadows = {
  card: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  elevated: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
};
