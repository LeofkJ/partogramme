const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

config.serializer = {
  ...config.serializer,
  polyfillModuleNames: [
    ...(config.serializer?.polyfillModuleNames ?? []),
    require.resolve("./polyfills/domException.js"),
  ],
};

config.resolver = {
  ...config.resolver,
  resolveRequest: (context, moduleName, platform) => {
    if (platform === "web" && (
      moduleName === "react-native-url-polyfill/auto" ||
      moduleName === "react-native-get-random-values"
    )) {
      return { type: "empty" };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
