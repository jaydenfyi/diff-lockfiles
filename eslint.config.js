import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default [
	js.configs.recommended,
	...tseslint.configs.recommended,
	{
		languageOptions: {
			ecmaVersion: 2022,
			sourceType: 'module',
			globals: { node: true, vitest: true },
		},
	},
	// Plain-JS dev scripts (e.g. the fixture generator) need Node globals
	// declared explicitly: typescript-eslint disables `no-undef` for .ts files,
	// but plain .mjs is type-checked by ESLint's core rules.
	{
		files: ['**/*.mjs'],
		languageOptions: {
			globals: {
				console: 'readonly',
				process: 'readonly',
				URL: 'readonly',
				__dirname: 'readonly',
				__filename: 'readonly',
				Buffer: 'readonly',
				global: 'writable',
			},
		},
	},
	{ ignores: ['dist/**', 'node_modules/**', '.local/**'] },
];
