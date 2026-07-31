const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// The Convex functions (and the generated api client) live in the sibling
// app/ workspace, so Metro has to watch outside the project root to bundle
// them. Resolution stays pinned to mobile/node_modules.
config.watchFolders = [path.resolve(__dirname, '..', 'app', 'convex')];
config.resolver.nodeModulesPaths = [path.resolve(__dirname, 'node_modules')];

module.exports = config;
