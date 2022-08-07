const settings = {
  plugins: ['jest', 'jest-dom', 'testing-library'],
  env: {
    node: true,
  },
  overrides: [
    {
      files: ['**/__tests__/**/*', '**/*.{spec,test}.*'],
      env: {
        'jest/globals': true,
      },
    },
  ],
};

module.exports = settings;
