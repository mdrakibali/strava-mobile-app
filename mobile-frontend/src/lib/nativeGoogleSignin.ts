import { TurboModuleRegistry } from 'react-native';

/**
 * Safely probes for native @react-native-google-signin/google-signin TurboModule.
 * Returns null safely in Expo Go without throwing Invariant Violation.
 */
export const loadNativeGoogleSignin = () => {
  try {
    const isRegistered =
      TurboModuleRegistry &&
      typeof TurboModuleRegistry.get === 'function' &&
      Boolean(TurboModuleRegistry.get('RNGoogleSignin'));

    if (isRegistered) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-google-signin/google-signin');
      if (mod && mod.GoogleSignin) {
        return { GoogleSignin: mod.GoogleSignin, statusCodes: mod.statusCodes || {} };
      }
    }
  } catch (err) {
    console.warn('Native GoogleSignin probe warning:', err);
  }
  return null;
};

