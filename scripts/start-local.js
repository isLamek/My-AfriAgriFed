// Starts the website in local-test mode: it talks to the Firebase emulators on this
// computer (see scripts/emulators.js), never to the live database.

const { spawn } = require("child_process");

const env = {
  ...process.env,
  REACT_APP_USE_EMULATORS: "true",
  BROWSER: "none",
  PORT: process.env.PORT || "3001",
};

const child = spawn("npx", ["react-scripts", "start"], { env, stdio: "inherit", shell: true });
child.on("exit", (code) => process.exit(code ?? 0));
