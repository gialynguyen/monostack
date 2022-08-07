require('@rushstack/eslint-patch/modern-module-resolution');

const merge = require('deepmerge');
const jsxA11ySettings = require('./settings/jsx-a11y');
const jsxA11yRules = require('./rules/jsx-a11y');

const config = merge(jsxA11ySettings, {
  rules: {
    ...jsxA11yRules,
  },
});

module.exports = config;
