// Safe start script for Data Capture
// Kører release gate først, rydder porte, og starter Expo på en fast port.

const { spawnSync, execSync } = require("child_process");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const EXPO_PORT = process.env.EXPO_PORT || "8083";

function run(cmd, args = [], options = {}) {
  return spawnSync(cmd, args, {
    cwd: ROOT,
    stdio: "inherit",
    shell: process.platform === "win32",
    ...options,
  });
}

function killPort(port) {
  try {
    if (process.platform === "win32") {
      execSync(
        `FOR /F "tokens=5" %a in ('netstat -ano ^| findstr :${port}') do taskkill /F /PID %a`,
        { cwd: ROOT, stdio: "ignore", shell: true }
      );
    } else {
      execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null || true`, {
        cwd: ROOT,
        stdio: "ignore",
        shell: true,
      });
    }
  } catch {
    // ignore — port var muligvis fri
  }
}

console.log("🛡️  Safe start: Kører release gate først...\n");

const gate = run("node", [path.join(__dirname, "release-gate.js")], {
  stdio: "inherit",
});

if (gate.status !== 0) {
  console.log("\n🛑 Release gate fejlede. Starter ikke appen.");
  process.exit(gate.status || 1);
}

console.log("\n🧹 Safe start: Dræber eventuelle gamle Expo-processer...");
killPort(8081);
killPort(8082);
killPort(EXPO_PORT);

console.log(
  `\n🚀 Release gate OK. Starter npx expo start --clear --lan --port ${EXPO_PORT}...\n`
);

const expo = run("npx", [
  "expo",
  "start",
  "--clear",
  "--lan",
  "--port",
  EXPO_PORT,
  "--max-workers",
  "1",
]);

process.exit(expo.status || 0);
