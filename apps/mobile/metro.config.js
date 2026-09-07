const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");
const config = getDefaultConfig(projectRoot);

config.watchFolders = [
  "api-client",
  "config",
  "design-tokens",
  "domain",
  "test-fixtures",
  "validation"
].map((packageName) => path.resolve(workspaceRoot, "packages", packageName));
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules")
];
config.resolver.blockList = [
  /ios\/Pods\/.*/,
  /ios\/build\/.*/,
  /android\/\.gradle\/.*/,
  /android\/build\/.*/
];

module.exports = config;
