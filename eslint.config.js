import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', '.scratch/**', 'versions/**', 'html/**'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      'max-lines': ['error', { max: 220, skipBlankLines: true, skipComments: true }],
      'max-lines-per-function': ['error', { max: 30, skipBlankLines: true, skipComments: true }],
      'max-params': ['error', 4],
    },
  },
  { files: ['**/*.test.ts'], rules: { 'max-lines-per-function': 'off' } },
);
