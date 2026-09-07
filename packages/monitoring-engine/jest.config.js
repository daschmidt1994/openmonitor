/** @type {import('jest').Config} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  moduleNameMapper: {
    "^@openmonitor/shared$": "<rootDir>/../shared/src/index.ts",
  },
  testMatch: ["**/__tests__/**/*.test.ts"],
};
