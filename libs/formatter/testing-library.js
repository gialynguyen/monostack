require('@rushstack/eslint-patch/modern-module-resolution');

const merge = require('deepmerge');
const testingLibraryRules = require('./rules/testing-library');
const testingLibrarySettings = require('./settings/testing-library');

const config = merge(testingLibrarySettings, {
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.{spec,test}.*'],
      rules: {
        ...testingLibraryRules,
      },
    },
  ],
});

module.exports = config;
