require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const jestRules = require("./rules/jest");
const jestSettings = require("./settings/jest");

const config = merge({ root: true }, ...jestSettings, {
  overrides: [
    {
      files: ["**/__tests__/**/*", "**/*.{spec,test}.*"],
      rules: {
        ...jestRules,
      },
    },
  ],
});

module.exports = config;
