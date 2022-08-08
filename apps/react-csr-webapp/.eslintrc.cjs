module.exports = {
  extends: [
    require.resolve('@monostack/formatter'),
    require.resolve('@monostack/formatter/react'),
    require.resolve('@monostack/formatter/typescript'),
    require.resolve('@monostack/formatter/testing-library'),
    require.resolve('@monostack/formatter/prettier'),
    require.resolve('@monostack/formatter/jsx-a11y'),
  ],
};
