import js from '@eslint/js';
import globals from 'globals';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  eslintConfigPrettier,

  // Global Ignores
  {
    ignores: [
      'node_modules/**',
      '**/*.min.js',
      'dist/**',
      'coverage/**',
      'public/**'
    ]
  },

  // ESM Config & Module Files
  {
    files: ['eslint.config.mjs', '**/*.mjs', '**/*.esm.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    }
  },

  // Backend Node.js Files
  {
    files: ['**/*.js'],
    ignores: ['assets/**', 'files/**'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
      'no-console': 'off',
      'no-undef': 'error',
      'no-useless-escape': 'warn'
    }
  },

  // Browser Frontend Files
  {
    files: ['assets/**/*.js', 'files/**/*.js'],
    ignores: ['**/*.esm.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'script',
      globals: {
        ...globals.browser,
        ...globals.es2021
      }
    },
    rules: {
      'no-unused-vars': 'off',
      'no-undef': 'error',
      'no-empty': 'warn'
    }
  }
];
