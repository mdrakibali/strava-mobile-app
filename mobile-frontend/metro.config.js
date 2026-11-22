const { getDefaultConfig } = require('expo/metro-config');
const { withNativewind } = require('nativewind/metro');

const path = require('path');

let config = getDefaultConfig(__dirname);
// Exclude native android & ios build directories from Metro watcher to prevent ENOSPC watcher exhaustion
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList) ? config.resolver.blockList : [config.resolver.blockList].filter(Boolean)),
  /.*[/\\]android[/\\]app[/\\]\.cxx[/\\].*/,
  /.*[/\\]android[/\\]app[/\\]build[/\\].*/,
  /.*[/\\]android[/\\]\.gradle[/\\].*/,
];
// Shared, platform-free tracking core also compiled by the backend (repo-root /shared).
config.watchFolders = [...(config.watchFolders || []), path.resolve(__dirname, '../shared')];
// /shared has no node_modules of its own: resolve its imports (e.g. @babel/runtime) from the app.
config.resolver.nodeModulesPaths = [...(config.resolver.nodeModulesPaths || []), path.resolve(__dirname, 'node_modules')];
config = withNativewind(config, { input: './src/global.css' });

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
