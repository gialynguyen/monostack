module.exports = {
  extends: ["stylelint-prettier/recommended", "stylelint-config-recess-order"],
  plugins: ["stylelint-prettier", "stylelint-color-format"],
  rules: {
    "order/properties-alphabetical-order": null,
    "prettier/prettier": true,
    "color-format/format": {
      format: "rgb",
    },
    "color-named": "never", // Disallow the use of color names
  },
};
