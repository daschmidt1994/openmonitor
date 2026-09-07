module.exports = {
  extends: ["../config/eslint-preset.js"],
  parserOptions: {
    project: "./tsconfig.json",
  },
  ignorePatterns: ["src/__tests__"],
};
