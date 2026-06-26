import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: { node: true, jest: true },
    },
    rules: {
      'no-param-reassign': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  { ignores: ['dist/**', 'node_modules/**'] },
];
