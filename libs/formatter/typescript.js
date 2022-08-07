require('@rushstack/eslint-patch/modern-module-resolution');

const merge = require('deepmerge');
const typescriptRules = require('./rules/typescript');
const typescriptSettings = require('./settings/typescript');

const config = merge(typescriptSettings, {
  overrides: [
    {
      files: ['**/*.ts?(x)'],
      rules: {
        ...typescriptRules,
      },
    },
  ],
});

module.exports = config;
