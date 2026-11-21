// ESLint de la app (src/), los scripts y las pruebas. Mismo criterio que INROCONTA: lo recomendado de JS y TS, las reglas de
// los hooks de React, y al final eslint-config-prettier (el formato lo decide Prettier, no ESLint).
import js from '@eslint/js';
import prettier from 'eslint-config-prettier';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    { ignores: ['node_modules/', '.next/', '.next-*/', 'next-env.d.ts', 'diseno/', 'referencia/', 'ejemplos/'] },
    {
        files: ['**/*.{ts,tsx,mts,js,mjs}'],
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        languageOptions: { globals: globals.node },
        rules: {
            // `_` delante: a propósito sin usar.
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' }],
        },
    },
    {
        files: ['src/**/*.{ts,tsx}'],
        plugins: { 'react-hooks': reactHooks },
        languageOptions: { globals: { ...globals.browser, ...globals.node } },
        rules: { 'react-hooks/rules-of-hooks': 'error', 'react-hooks/exhaustive-deps': 'warn' },
    },
    prettier,
);
