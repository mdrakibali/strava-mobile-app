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

import 'expo-router/entry';
