const { BrowserWindow } = require('@electron/remote');

const minimizeBtn = document.querySelector("div#window>div#controls>div#minimize");
const maximizeBtn = document.querySelector("div#window>div#controls>div#maximize");
const closeBtn = document.querySelector("div#window>div#controls>div#close");

minimizeBtn.addEventListener('click', () => {
    console.log("minimizing");
    const window = BrowserWindow.getFocusedWindow();
    console.log(window);
    window.minimize();
    console.log("minimized");
});

maximizeBtn.addEventListener('click', () => {
  const window = BrowserWindow.getFocusedWindow();
  if (window.isMaximized()) {
    window.restore();
  } else {
    window.maximize();
  }
});

closeBtn.addEventListener('click', () => {
  const window = BrowserWindow.getFocusedWindow();
  window.close();
});