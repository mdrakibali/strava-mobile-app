// Polyfill and runtime initialization for Expo Go & Hermes
if (typeof globalThis !== 'undefined') {
  if (!globalThis.__workletsModuleProxy) {
    const noop = () => {};
    const identity = (v) => v;
    globalThis.__workletsModuleProxy = {
      createSerializableNull: () => null,
      createSerializableUndefined: () => undefined,
      createSerializableBoolean: identity,
      createSerializableNumber: identity,
      createSerializableString: identity,
      createSerializableBigInt: identity,
      createSerializableImport: noop,
      createSerializableObject: identity,
      createSerializableHostObject: identity,
      createSerializableArray: identity,
      createSerializableArrayBuffer: identity,
      createSerializableMap: identity,
      createSerializableSet: identity,
      createSerializableError: noop,
      createSerializableRegExp: identity,
      createSerializableArrayBufferView: identity,
      createSerializableNonWorkletFunction: identity,
      createSerializableWorklet: identity,
      createSerializableTurboModuleLike: identity,
      createCustomSerializable: identity,
      createSerializableLEGACY: identity,
      createSynchronizable: identity,
      scheduleOnRN: noop,
      scheduleOnRuntime: noop,
      scheduleOnRuntimeWithId: noop,
      runOnRuntimeSync: noop,
      runOnRuntimeSyncWithId: noop,
      handlePromise: noop,
      reportFatalErrorOnJS: noop,
      getStaticFeatureFlag: () => false,
      setDynamicFeatureFlag: noop,
      getCurrentThreadId: () => 0,
      getUIRuntimeHolder: noop,
      getUISchedulerHolder: noop,
      loadUnpackersWithBytecode: noop,
      loadUnpackersWithCode: noop,
    };
  }
}

// Polyfill AssetRegistry for expo-asset / @expo/vector-icons in RN 0.88 / React 19
try {
  const ReactNative = require('react-native');
  const assetRegistry = require('react-native/src/asset-registry');
  if (!ReactNative.AssetRegistry) {
    Object.defineProperty(ReactNative, 'AssetRegistry', {
      get: () => assetRegistry,
      configurable: true,
      enumerable: true,
    });
  }
} catch (_e) {}

// Background location task must be registered at startup, including headless launches.
import './src/tracking/locationTask';
import 'expo-router/entry';
