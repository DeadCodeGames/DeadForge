/* eslint-disable @typescript-eslint/no-require-imports */
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
                "uniSansCAPS": ["Uni Sans CAPS", "Corporate Logo", ...defaultTheme.fontFamily.sans],
                "montserrat": ["Montserrat", "Noto Sans JP", ...defaultTheme.fontFamily.sans],
                "notoSans": ["Noto Sans", "Noto Sans JP", "Noto Sans KR", "Noto Sans SC", "Noto Sans TC", "Noto Sans Hebrew", ...defaultTheme.fontFamily.sans],
                "serif": ["Georgia", "Roboto Slab", "Sawarabi Mincho", ...defaultTheme.fontFamily.serif],
                "heading": ["Rajdhani", "Georgia", "Roboto Slab", "Sawarabi Mincho", ...defaultTheme.fontFamily.serif],
            },
            fontSize: {
                "0": "0px",
            },
            colors: {
                "danger": "#ED2821",
                "warning": "#FBB000",
                "success": "#43A047",
                "progress": "#1E88E5",
                "cornflowerBlue": "#6495ED",
                "purpleNotFound": "#404",
                "notQuiteBlack": "#0F0F0F",
                "notQuiteWhite": "#F0F0F0",
                "night": "#161616",
                "fullMoon": "#E9E9E9"
            },
            screens: {
                "settingsShrink": { max: "999px" },
                "hidePlayTimeStats": { max: "1150px" }
            },
            animation: {
                'fade-slide-in': 'fadeSlideIn 0.3s ease-out',
            },
            keyframes: {
                fadeSlideIn: {
                    '0%': { 
                        opacity: '0',
                        transform: 'translateX(-10px)'
                    },
                    '100%': { 
                        opacity: '1',
                        transform: 'translateX(0)'
                    },
                },
            },
        },
    },
    plugins: [
        tailwindUtils,
        fOffBorderBox,
        function ({ addUtilities }) {
            const newUtilities = {
                '.user-drag': {
                    '-webkit-user-drag': 'element',
                },
                '.no-user-drag': {
                    '-webkit-user-drag': 'none',
                },
                '.scrollbar-gutter-none': {
                    'scrollbar-gutter': 'none',
                },
                '.scrollbar-gutter-stable': {
                    'scrollbar-gutter': 'stable',
                },
                '.scrollbar-gutter-both-edges': {
                    'scrollbar-gutter': 'stable both-edges',
                },
                '.scrollbar-gutter-auto': {
                    'scrollbar-gutter': 'auto',
                },
                
            }
            addUtilities(newUtilities, ['responsive'])
        }
    ],
}