const rules = {
  "brace-style": 0,
  "@typescript-eslint/brace-style": [1, "stroustrup"],
  "no-dupe-class-members": 0,
  "no-undef": 0,
  "@typescript-eslint/consistent-type-assertions": 1,
  "@typescript-eslint/consistent-type-imports": 1,
  "no-array-constructor": 0,
  "@typescript-eslint/no-array-constructor": 1,
  "no-redeclare": 0,
  "@typescript-eslint/no-redeclare": 1,
  "no-use-before-define": 0,
  "@typescript-eslint/no-use-before-define": [
    1,
    {
      functions: false,
      classes: false,
      variables: false,
      typedefs: false,
    },
  ],
  "no-unused-expressions": 0,
  "@typescript-eslint/no-unused-expressions": [
    1,
    {
      allowShortCircuit: true,
      allowTernary: true,
      allowTaggedTemplates: true,
    },
  ],
  "no-unused-vars": 0,
  "@typescript-eslint/no-unused-vars": [
    1,
    {
      args: "none",
      ignoreRestSiblings: true,
    },
  ],
  "no-useless-constructor": 0,
  "@typescript-eslint/no-useless-constructor": 1,
  "@typescript-eslint/no-explicit-any": [1, { ignoreRestArgs: true }],
  "@typescript-eslint/explicit-module-boundary-types": 1,
};

module.exports = rules;
