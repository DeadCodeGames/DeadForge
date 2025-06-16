const nodemon = require("nodemon");
const { exec, spawn } = require("child_process");
const path = require("path");

let firstRun = true;
let electronProcess = null;

function buildElectron() {
  return new Promise((resolve, reject) => {
    const tsc = exec('npm run electron:build');
    tsc.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`tsc exited with code ${code}`));
    });
  });
}

function launchElectron(isFirstRun) {
  if (electronProcess) {
    electronProcess.kill();
  }

  const electronPath = path.join(__dirname, '..', 'node_modules', 'electron', 'dist', 'electron.exe');
  const args = [".", "--trace-warnings", "--protocol-launcher"];
  if (isFirstRun) args.push("--first-run");

  electronProcess = spawn(electronPath, args, {
    stdio: "inherit",
    env: { ...process.env }
  });

  electronProcess.on("close", (code) => {
    console.log(`[electron] exited with code ${code}`);
    electronProcess = null;
    if (code === 777) {
      console.log('electron exited with code 777, restarting');
      launchElectron(false);
    }
  });
}

nodemon({
  watch: ["electron"],
  ext: "ts js json",
});

nodemon.on("start", async () => {
  console.log("[nodemon] Initial start");
  try {
    await buildElectron();
    launchElectron(firstRun);
    firstRun = false;
  } catch (err) {
    console.error("Build failed:", err.message);
  }
});

/* nodemon.on("restart", async () => {
  console.log("[nodemon] Files changed, rebuilding and restarting Electron…");
  try {
    await buildElectron();
    launchElectron(false);
  } catch (err) {
    console.error("Build failed:", err.message);
  }
}); */
