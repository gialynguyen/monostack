const rules = {
  'jsx-a11y/alt-text': 1,
  'jsx-a11y/anchor-has-content': [1, { components: ['Link', 'NavLink'] }],
  'jsx-a11y/anchor-is-valid': [1, { aspects: ['noHref', 'invalidHref'] }],
  'jsx-a11y/aria-activedescendant-has-tabindex': 1,
  'jsx-a11y/aria-props': 1,
  'jsx-a11y/aria-proptypes': 1,
  'jsx-a11y/aria-role': [1, { ignoreNonDOM: true }],
  'jsx-a11y/aria-unsupported-elements': 1,
  'jsx-a11y/iframe-has-title': 1,
  'jsx-a11y/img-redundant-alt': 1,
  'jsx-a11y/lang': 1,
  'jsx-a11y/no-access-key': 1,
  'jsx-a11y/no-redundant-roles': 1,
  'jsx-a11y/role-has-required-aria-props': 1,
  'jsx-a11y/role-supports-aria-props': 1,
};

module.exports = rules;
