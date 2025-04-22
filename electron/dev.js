const nodemon = require("nodemon");
const { exec, spawn } = require("child_process");

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

  const args = ["."];
  if (isFirstRun) args.push("--first-run");

  electronProcess = spawn("electron", args, {
    stdio: "inherit",
    env: { ...process.env }
  });

  console.log(electronProcess)

  electronProcess.on("close", (code) => {
    console.log(`[electron] exited with code ${code}`);
    electronProcess = null;
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
