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
            },
            fontSize: {
                "0": "0px",
            },
            colors: {
                "cornflowerBlue": "#6495ED",
                "purpleNotFound": "#404",
                "notQuiteBlack": "#0F0F0F",
                "notQuiteWhite": "#F0F0F0",
                "night": "#161616",
                "fullMoon": "#E9E9E9"
            },
            screens: {
                "settingsShrink": {max: "999px"}
            }
        },
    },
    plugins: [
        tailwindUtils,
        fOffBorderBox,
    ],
}