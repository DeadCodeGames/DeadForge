const { resolve } = require('path');
const { readFileSync, writeFileSync } = require('fs');
const ReactDOMServer = require('react-dom/server');
const React = require('react');
const { minify } = require('html-minifier-terser');

const InitialLoader = require('../src/components/Loader/InitialLoader')
  .default;

async function postBuild() {
  try {
    const loaderHTML = ReactDOMServer.renderToString(
      React.createElement(InitialLoader)
    );

    const indexPath = resolve(__dirname, '../build/index.html');
    let indexHTML = readFileSync(indexPath, 'utf8');

    const cssMatches = [
      ...indexHTML.matchAll(/<link\s+href="([^"]+\.css)"[^>]*>/g),
    ];
    const jsMatches = [
      ...indexHTML.matchAll(/<script\s+[^>]*src="([^"]+\.js)"[^>]*><\/script>/g),
    ];

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

    indexHTML = indexHTML.replace(
      /<html lang="en">/,
      `<html lang="en" class="dark">`
    );

    const minified = await minify(indexHTML, {
      collapseWhitespace: true,
      removeComments: true,
      minifyCSS: true,
      minifyJS: true,
    });

    writeFileSync(indexPath, minified, 'utf8');
    console.log('✅ Post-build modifications complete.');
  } catch (err) {
    console.error('❌ Post-build modifications failed:', err);
  }
}

postBuild();
