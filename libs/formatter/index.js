require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const coreRules = require("./rules/core");
const coreSettings = require("./settings/core");

const config = merge({ root: true }, ...coreSettings, {
  rules: {
    ...coreRules,
  },
});

module.exports = config;
