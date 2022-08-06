require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const coreRules = require("./rules/core");

const config = merge({ root: true }, coreRules);

module.exports = config;
