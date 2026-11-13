module.exports = {
  parser: '@typescript-eslint/parser',
  ignorePatterns: ['src/h5web/**'],
  env: {
    browser: true,
    jest: true,
    es6: true,
    node: true,
  },
  extends: [
    'react-app',
    'plugin:react/recommended',
    'plugin:@typescript-eslint/recommended',
    'prettier',
    'plugin:cypress/recommended',
  ],
  plugins: ['prettier', 'cypress', 'import'],
  rules: {
    'react/jsx-filename-extension': 'off',
    'jsx-a11y/click-events-have-key-events': 'off',
    'prettier/prettier': [
      'error',
      {
        singleQuote: true,
        trailingComma: 'es5',
        endOfLine: 'auto',
      },
    ],
    // Disable prop-types globally
    'react/prop-types': 'off',
    // `@mui/icons-material` re-exports ~10,600 components. Vite/Rollup tree-shake it in the build,
    // but Vitest imports the barrel module by module, which cost ~3 minutes per test file (enough to
    // look like a hung suite) before it ran a single test. Deep imports are instant and are what the
    // rest of the app already uses.
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: '@mui/icons-material',
            message: "Import each icon from its own module instead, e.g. '@mui/icons-material/Edit'.",
          },
        ],
      },
    ],
    // Disable explicit-function-return-type for all files - this means we can have plain JS files not causing errors
    '@typescript-eslint/explicit-function-return-type': 'off',
  },
  overrides: [
    {
      // Whitelist explicit-function-return-type for TS files
      files: ['*.ts', '*.tsx'],
      rules: {
        '@typescript-eslint/explicit-function-return-type': [
          'error',
          {
            allowExpressions: true,
            allowTypedFunctionExpressions: true,
          },
        ],
        'import/order': [
          'error',
          {
            groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
            'newlines-between': 'always',
            alphabetize: {
              order: 'asc',
              caseInsensitive: true,
            },
          },
        ],
      },
    },
  ],
  parserOptions: {
    ecmaFeatures: {
      jsx: true,
    },
    allowImportExportEverywhere: true,
    sourceType: 'module',
  },
  settings: {
    react: {
      version: 'detect', // Tells eslint-plugin-react to automatically detect the version of React to use
    },
  },
};
