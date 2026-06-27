import { defineConfig } from 'vitest/config';

// Equivalent of the former jest.config.ts:
//   - testEnvironment 'node'  ->  environment 'node' (vitest's default)
//   - testMatch               ->  include (only *.test.ts are tests, so the
//                                  non-test helpers.ts under __tests__/ is not
//                                  treated as a suite)
//   - jest globals (default)  ->  globals: true (keeps describe/it/expect as
//                                  globals; zero changes needed in test files)
//   - ts-jest preset/transform, moduleNameMapper  ->  not needed: Vite transforms
//                                  TS and resolves .js->.ts imports natively.
export default defineConfig({
	test: {
		environment: 'node',
		globals: true,
		include: ['**/__tests__/**/*.test.ts'],
	},
});
