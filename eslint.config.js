const {
  defineConfig,
} = require('eslint/config');

const globals = require('globals');
const jest = require('eslint-plugin-jest');
const js = require('@eslint/js');

const {
  FlatCompat,
} = require('@eslint/eslintrc');

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
  allConfig: js.configs.all,
});

module.exports = defineConfig([{
  languageOptions: {
    globals: {
      ...Object.fromEntries(Object.entries(globals.browser).map(([key]) => [key, 'off'])),
      ...globals.jest,
      Atomics: 'readonly',
      SharedArrayBuffer: 'readonly',
    },

    ecmaVersion: 2018,
    sourceType: 'module',
    parserOptions: {},
  },

  extends: compat.extends('airbnb-base', 'plugin:jest/all'),

  plugins: {
    jest,
  },

  rules: {
    'max-classes-per-file': 'off',
    'no-underscore-dangle': 'off',
    'no-console': 'off',
    'no-shadow': 'off',
    'no-restricted-syntax': ['error', 'LabeledStatement', 'WithStatement'],
  },
}, {
  files: ['**/*.js'],
  ignores: ['**/babel.config.js'],
}]);
