import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';

export default [
  { ignores: ['dist'] },
  {
    plugins: { security },
    rules: {
      'security/detect-object-injection': 'warn',
      'security/detect-non-literal-fs-filename': 'warn',
      'security/detect-non-literal-regexp': 'warn',
      'security/detect-unsafe-regex': 'warn',
      'security/detect-non-literal-require': 'warn',
      'security/detect-possible-timing-attacks': 'warn',
      'security/detect-pseudoRandomBytes': 'warn',
      'security/detect-new-buffer': 'warn',
      'security/detect-child-process': 'warn',
      'security/detect-eval-with-expression': 'warn',
      'security/detect-buffer-noassert': 'warn',
      'security/detect-no-csrf-before-method-override': 'warn',
      'security/detect-disable-mustache-escape': 'warn',
      'security/detect-bidi-characters': 'warn',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.jest,
        process: 'readonly',
        __APP_IS_PROD__: 'readonly',
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    settings: { react: { version: '18.3' } },
    plugins: {
      react,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...js.configs.recommended.rules,
      ...react.configs.recommended.rules,
      ...react.configs['jsx-runtime'].rules,
      ...reactHooks.configs.recommended.rules,
      'react/jsx-no-target-blank': 'off',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/no-unknown-property': 'off',
      'react/no-unescaped-entities': 'off',
    },
  },
  {
    files: [
      '*.config.js',
      'test_connection.js',
      'seed_database.js',
      'cleanup_database.js',
      'audit_database.js',
      'check_columns.js',
      'diagnose_and_fix.js',
      'promote_to_admin.js',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
];
