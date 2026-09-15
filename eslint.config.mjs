import { fixupPluginRules } from '@eslint/compat';
import js from '@eslint/js';
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import prettierConfig from 'eslint-config-prettier';
import cypress from 'eslint-plugin-cypress';
import importPlugin from 'eslint-plugin-import';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import prettier from 'eslint-plugin-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';

export default [
  { ignores: ['src/h5web/**', 'build/**', 'coverage/**', '.yarn/**', 'cypress/screenshots/**'] },
  {
    files: ['**/*.{js,jsx,ts,tsx,mjs,cjs}'],
    languageOptions: {
      parser: tsParser,
      parserOptions: { ecmaFeatures: { jsx: true } },
      globals: { ...globals.browser, ...globals.node },
    },
    // These plugins still use APIs removed in ESLint 10.
    plugins: {
      '@typescript-eslint': tsPlugin,
      import: fixupPluginRules(importPlugin),
      'jsx-a11y': fixupPluginRules(jsxA11y),
      prettier,
      react: fixupPluginRules(react),
      'react-hooks': reactHooks,
    },
    settings: { react: { version: 'detect' } },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      ...tsPlugin.configs['eslint-recommended'].overrides[0].rules,
      ...tsPlugin.configs.recommended.rules,
      ...prettierConfig.rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react/prop-types': 'off',
      'react/jsx-filename-extension': 'off',
      'jsx-a11y/click-events-have-key-events': 'off',
      'jsx-a11y/no-autofocus': ['error', { ignoreNonDOM: true }],
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/explicit-function-return-type': 'off',
      'prettier/prettier': ['error', { singleQuote: true, trailingComma: 'es5', endOfLine: 'auto' }],
    },
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/explicit-function-return-type': [
        'error',
        { allowExpressions: true, allowTypedFunctionExpressions: true },
      ],
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', ['parent', 'sibling', 'index'], 'object', 'type'],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
    },
  },
  { ...cypress.configs.recommended, files: ['cypress/**/*.{js,jsx,ts,tsx}'] },
];
