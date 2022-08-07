const settings = {
  extends: ['plugin:react-hooks/recommended'],
  parserOptions: {
    babelOptions: {
      presets: ['@babel/preset-react'],
    },
    requireConfigFile: false,
    ecmaVersion: 2021,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true,
    },
  },
  plugins: ['react', 'react-hooks'],
};

module.exports = settings;
