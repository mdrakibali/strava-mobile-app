/**
 * Module flags. Everything is ON by default: the product owner asked that no existing module be
 * hidden. A module can still be switched off per build with EXPO_PUBLIC_FEATURE_<NAME>=false.
 */
const flag = (value: string | undefined) => value !== 'false';

export const FEATURES = {
  explore: flag(process.env.EXPO_PUBLIC_FEATURE_EXPLORE),
  groups: flag(process.env.EXPO_PUBLIC_FEATURE_GROUPS),
} as const;
