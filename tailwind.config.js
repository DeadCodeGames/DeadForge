/** @type {import('tailwindcss').Config} */
const defaultTheme = require("tailwindcss/defaultTheme");
const tailwindUtils = require('@dead404code/tailwind-utilities');
const fOffBorderBox = require('@dead404code/tailwind-remove-base-border-box');
module.exports = {
    darkMode: ["class"],
    content: ["src/**/*.{ts,tsx}"],
    theme: {
        extend: {
            fontFamily: {
                "consolas": ["Consolas", "Courier New", 'Courier', 'monospace'],
                "uniSansCAPS": ["Uni Sans CAPS", ...defaultTheme.fontFamily.sans],
                "montserrat": ["Montserrat", "Noto Sans JP", ...defaultTheme.fontFamily.sans],
            },
            keyframes: {
                "heartPulse": {
                    '0%, 25%, 60%': { transform: 'scale(1)' },
                    '5%, 35%': { transform: 'scale(1.25)' },
                }
            },
            animation: {
                'heart-pulse': 'heartPulse 0.9375s linear infinite',
            },
        },
    },
    plugins: [
        tailwindUtils,
        fOffBorderBox,
    ],
}