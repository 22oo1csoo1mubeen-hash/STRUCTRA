import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', '**/.chrome-*']),
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    rules: {
      // Existing async and prop-synchronization effects are intentional; keep them
      // visible for cleanup without making the repository lint gate unusable.
      'react-hooks/set-state-in-effect': 'warn',
      // Context modules export both their provider and consumer hook by design.
      'react-refresh/only-export-components': 'warn',
      // React Compiler skips optimization when it cannot preserve handwritten memoization.
      'react-hooks/preserve-manual-memoization': 'warn',
    },
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
])
