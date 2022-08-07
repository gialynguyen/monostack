const settings = {
  parser: '@babel/eslint-parser',
  extends: ['eslint:recommended'],
  plugins: ['import', 'simple-import-sort'],
  env: {
    es6: true,
    browser: true,
    commonjs: true,
  },
};

module.exports = settings;
