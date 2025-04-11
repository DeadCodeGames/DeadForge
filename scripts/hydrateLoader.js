const fs = require('fs');
const path = require('path');
const React = require('react');
const ReactDOMServer = require('react-dom/server');
const { minify } = require('html-minifier-terser');


const loaderPath = path.resolve(__dirname, '../src/components/Loader/InitialLoader.tsx');
require('@babel/register')({
  extensions: ['.js', '.jsx', '.ts', '.tsx'],
  presets: ['@babel/preset-react', '@babel/preset-typescript'],
  ignore: [/node_modules/],
});
const InitialLoader = require(loaderPath).default;
const loaderHTML = ReactDOMServer.renderToString(React.createElement(InitialLoader));


const indexPath = path.resolve(__dirname, '../build/index.html');
let indexHTML = fs.readFileSync(indexPath, 'utf8');


const cssMatches = [...indexHTML.matchAll(/<link\s+href="([^"]+\.css)"[^>]*>/g)];
const jsMatches = [...indexHTML.matchAll(/<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/g)];

let preloadLinks = '';


cssMatches.forEach((match) => {
  preloadLinks += `<link rel="preload" as="style" href="${match[1]}">\n`;
});


jsMatches.forEach((match) => {
  preloadLinks += `<link rel="preload" as="script" href="${match[1]}">\n`;
});


indexHTML = indexHTML.replace('<head>', `<head>${preloadLinks}`);


indexHTML = indexHTML.replace(
  /<div id="root"><\/div>/,
  `<div id="root">${loaderHTML}</div>`
);

indexHTML = indexHTML.replace(/<html lang="en">/, `<html lang="en" class="dark">`)


minify(indexHTML, {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
}).then((minified) => {
  fs.writeFileSync(indexPath, minified, 'utf8');
  console.log('✅ Post-build modifications complete.');
}).catch((err) => {
  console.error('❌ Minification failed:', err);
});
