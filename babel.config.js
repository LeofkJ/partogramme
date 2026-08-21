module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          envName: "MY_ENV",
          moduleName: "@env",
          blocklist: null,
          allowlist: null,
          safe: false,
          allowUndefined: false,
          verbose: false,
        },
      ],
      // Reanimated 4 / worklets: must stay last so later plugins cannot
      // skip or rewrite the worklet transform.
      "react-native-worklets/plugin",
    ],
  };
};
