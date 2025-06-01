import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginReact from "eslint-plugin-react";
import pluginReactHooks from "eslint-plugin-react-hooks";
import pluginTypescript from "@typescript-eslint/eslint-plugin";
import pluginArrayDestructureCommaSpacing from "./.eslint/index.js";
import { defineConfig } from "eslint/config";

export default defineConfig([
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    {
        files: ["src/**/*.{js,mjs,cjs,ts,jsx,tsx}"],
        plugins: { js, pluginReact, pluginTypescript, pluginReactHooks, pluginArrayDestructureCommaSpacing },
        extends: ["js/recommended"],
        languageOptions: {
            globals: {
                "process": true
            },
        },
        rules: {
            indent: ["warn", 4],
            "react/function-component-definition": [
                "error",
                {
                    namedComponents: "arrow-function",
                    unnamedComponents: "arrow-function"
                }
            ],
            "react/react-in-jsx-scope": "warn",
            "@typescript-eslint/no-explicit-any": "off",
            'react/no-unknown-property': ['error', { ignore: ['preload'] }],
            'pluginArrayDestructureCommaSpacing/array-destructure-comma-spacing': 'error',
            'pluginArrayDestructureCommaSpacing/format-jsx-paren': 'error'
        }
    },
    {
        files: ["electron/**/*.{js,mjs,cjs,ts,tsx}"],
        plugins: { js, pluginTypescript },
        languageOptions: {
            globals: {
                ...globals.node,
                ...globals.es2021,
                "require": true,
                "module": true,
                "__dirname": true,
                "__filename": true
            },
            parserOptions: {
                ecmaVersion: 2021,
                sourceType: 'module'
            }
        },
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-unused-vars": "warn",
            "no-console": "off", // Often used in Electron for debugging
            "@typescript-eslint/no-require-imports": "off"
        }
    },
    {
        files: ["src/types.ts"],
        plugins: { pluginTypescript },
        extends: ["pluginTypescript/recommended"],
        rules: {
            "@typescript-eslint/no-explicit-any": "off",
            "no-unused-vars": "off"
        }
    },
    { files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"], languageOptions: { globals: globals.browser } }
]);