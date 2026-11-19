const fs = require('fs');
const path = require('path');

const assetJsPath = path.join(__dirname, '../node_modules/expo-asset/build/Asset.js');

if (fs.existsSync(assetJsPath)) {
  let content = fs.readFileSync(assetJsPath, 'utf8');

  const target1 = "import { AssetRegistry } from 'react-native';";
  const replacement1 = `import { AssetRegistry as _RNAssetRegistry } from 'react-native';
let AssetRegistry = _RNAssetRegistry;
try {
  if (!AssetRegistry || !AssetRegistry.getAssetByID) {
    AssetRegistry = require('react-native/src/asset-registry') || require('react-native/src/private/assets/AssetRegistry').AssetRegistry;
  }
} catch (_e) {}`;

  const target2 = "const meta = AssetRegistry.getAssetByID(assetModule);";
  const replacement2 = `const registry = AssetRegistry || (typeof require !== 'undefined' ? (require('react-native/src/asset-registry') || require('react-native').AssetRegistry) : null);
        const meta = registry?.getAssetByID ? registry.getAssetByID(assetModule) : (resolveAssetSource(assetModule) || { name: 'asset', type: 'ttf' });`;

  let modified = false;
  if (content.includes(target1)) {
    content = content.replace(target1, replacement1);
    modified = true;
  }
  if (content.includes(target2)) {
    content = content.replace(target2, replacement2);
    modified = true;
  }

  if (modified) {
    fs.writeFileSync(assetJsPath, content, 'utf8');
    console.log('[patch-asset] Patched expo-asset Asset.js successfully');
  }
}

