import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import security from 'eslint-plugin-security';

export default [
  { ignores: ['dist'] },
  security.configs.recommended,
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
    settings: { react: { version: 'detect' } },
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
      'react/jsx-no-target-blank': 'error',
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      'react/prop-types': 'off',
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'react/no-unknown-property': 'off',
      'react/no-unescaped-entities': 'off',
      // Disallow debug console.log in production source; console.warn/error are allowed
      // for legitimate catch-block error logging. Use src/api/logger.js for structured logging.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // react-hooks v7 adds React Compiler rules that flag patterns common in our existing
      // codebase. All three disabled until we adopt the React Compiler.
      'react-hooks/react-compiler': 'off',
      'react-hooks/purity': 'off',
      'react-hooks/set-state-in-effect': 'off',
      'react-hooks/static-components': 'off',
    },
  },
  {
    // logger.js intentionally uses console — it is the logging abstraction layer
    files: ['src/api/logger.js'],
    rules: { 'no-console': 'off' },
  },
  {
    // Node.js scripts — allow console and node globals
    files: [
      '*.config.js',
      'scripts/**/*.js',
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
    rules: { 'no-console': 'off' },
  },
];
