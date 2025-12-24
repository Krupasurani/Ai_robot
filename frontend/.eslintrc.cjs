/**
 *  @type {import('eslint').ESLint.ConfigData}
 */
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  plugins: ['perfectionist', 'unused-imports', '@typescript-eslint', 'prettier'],
  extends: ['airbnb', 'airbnb-typescript', 'airbnb/hooks', 'prettier'],
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 'latest',
    ecmaFeatures: { jsx: true },
    project: './tsconfig.json',
  },
  ignorePatterns: [
    'src/components/walktour/**/*',
    'src/components/nav-basic/**/*',
    'src/components/mega-menu/**/*',
    'src/components/orbiting-circles/**/*',
    'src/components/platform-orbits/**/*',
    'src/components/organizational-chart/**/*',
  ],
  settings: {
    'import/resolver': {
      typescript: {
        project: './tsconfig.json',
      },
    },
  },
  /**
   * 0 ~ 'off'
   * 1 ~ 'warn'
   * 2 ~ 'error'
   */
  rules: {
    // general
    'no-alert': 0,
    camelcase: 0,
    'no-console': 0,
    'no-unused-vars': 0,
    'no-nested-ternary': 0,
    'no-param-reassign': 0,
    'no-underscore-dangle': 0,
    'no-restricted-exports': 0,
    'no-promise-executor-return': 0,
    'no-else-return': 0,
    'consistent-return': 0,
    radix: 0,
    'object-shorthand': 0,
    'arrow-body-style': 0,
    'import/prefer-default-export': 0,
    'import/no-extraneous-dependencies': 0,
    'import/order': 0,
    'import/no-duplicates': 0,
    'import/newline-after-import': 0,
    'prefer-destructuring': [1, { object: true, array: false }],
    // typescript
    '@typescript-eslint/naming-convention': 0,
    '@typescript-eslint/no-use-before-define': 0,
    '@typescript-eslint/consistent-type-exports': 0,
    '@typescript-eslint/consistent-type-imports': 0,
    '@typescript-eslint/no-unused-vars': [
      1,
      { args: 'none', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/no-shadow': 0,
    '@typescript-eslint/no-redeclare': 0,
    // react
    'react/no-children-prop': 0,
    'react/react-in-jsx-scope': 0,
    'react/no-array-index-key': 0,
    'react/prop-types': 0,
    'react/require-default-props': 0,
    'react/jsx-props-no-spreading': 0,
    'react/function-component-definition': 0,
    'react/jsx-no-duplicate-props': [1, { ignoreCase: false }],
    'react/jsx-no-useless-fragment': 0,
    'react/no-unstable-nested-components': 0,
    'react/button-has-type': 0,
    'react/jsx-boolean-value': 0,
    'react/no-danger': 0,
    'react/jsx-no-constructed-context-values': 0,
    // jsx-a11y
    'jsx-a11y/anchor-is-valid': 0,
    'jsx-a11y/control-has-associated-label': 0,
    'jsx-a11y/click-events-have-key-events': 0,
    'jsx-a11y/no-static-element-interactions': 0,
    'jsx-a11y/no-noninteractive-element-interactions': 0,
    'jsx-a11y/label-has-associated-control': 0,
    // unused imports
    'unused-imports/no-unused-imports': 1,
    'unused-imports/no-unused-vars': [
      0,
      { vars: 'all', varsIgnorePattern: '^_', args: 'after-used', argsIgnorePattern: '^_' },
    ],
    // react-hooks - relaxed but keep rules-of-hooks as error (critical)
    'react-hooks/exhaustive-deps': 1,
    // perfectionist - disabled or relaxed to reduce noise
    'perfectionist/sort-exports': 0,
    'perfectionist/sort-named-imports': 0,
    'perfectionist/sort-named-exports': 0,
    'perfectionist/sort-imports': 0,
  },
};
