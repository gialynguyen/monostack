require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const reactSettings = require("./settings/react");
const reactRules = require("./rules/react");

const config = merge({ root: true }, ...reactSettings, {
  rules: {
    ...reactRules,
  },
});

module.exports = config;
