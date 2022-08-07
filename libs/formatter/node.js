require("@rushstack/eslint-patch/modern-module-resolution");

const merge = require("deepmerge");
const nodejsSettings = require("./settings/node");

const config = merge({ root: true }, ...nodejsSettings);

module.exports = config;
