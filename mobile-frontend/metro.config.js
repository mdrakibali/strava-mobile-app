const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

let config = getDefaultConfig(__dirname);
config = withNativewind(config);

const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // If the importing module is from node_modules (e.g. expo-asset, expo-font, @expo/vector-icons),
  // ensure "react-native" resolves to the real react-native package, not react-native-css/components.
  if (moduleName === 'react-native' && context.originModulePath.includes('node_modules')) {
    // Calling context.resolveRequest directly bypasses the react-native-css component replacement
    return context.resolveRequest(context, moduleName, platform);
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
