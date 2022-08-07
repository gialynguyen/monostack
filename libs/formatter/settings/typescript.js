const fs = require("fs");
const path = require("path");

const tsConfig = fs.existsSync("tsconfig.json")
  ? path.resolve("tsconfig.json")
  : undefined;

const settings = {
  extends: ["plugin:@typescript-eslint/recommended"],
  parser: "@typescript-eslint/parser",
  plugins: ["@typescript-eslint"],
  overrides: [
    {
      files: ["**/*.ts?(x)"],
      parser: "@typescript-eslint/parser",
      extends: ["plugin:import/typescript"],
      parserOptions: {
        sourceType: "module",
        project: tsConfig,
        ecmaFeatures: {
          jsx: true,
        },
        warnOnUnsupportedTypeScriptVersion: true,
      },
    },
  ],
};

module.exports = settings;
