require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const prettierSettings = require("./settings/prettier");

const config = merge({ root: true }, ...prettierSettings);

module.exports = config;
