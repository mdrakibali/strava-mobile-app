/**
 * MVP scope flags (docs/STRAVA_ARCHITECTURE_DECISIONS.md ADR-15).
 * Out-of-scope modules stay in the codebase but are unreachable from navigation unless enabled
 * via EXPO_PUBLIC_FEATURE_<NAME>=true.
 */
const flag = (value: string | undefined) => value === 'true';

export const FEATURES = {
  explore: flag(process.env.EXPO_PUBLIC_FEATURE_EXPLORE),
  groups: flag(process.env.EXPO_PUBLIC_FEATURE_GROUPS),
} as const;
