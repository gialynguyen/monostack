require('@rushstack/eslint-patch/modern-module-resolution');

const merge = require('deepmerge');
const prettierSettings = require('./settings/prettier');

const config = merge({
	rules: {
		"prettier/prettier": 1
	}
}, prettierSettings);

module.exports = config;
