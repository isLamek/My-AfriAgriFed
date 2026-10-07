// Starts the local Firebase emulators (login, database, community posts) for testing.
// They need Java: uses the one on PATH, or a portable one in ~/tools/jdk-*.
// Data lives only on this computer and is lost when they stop (run `npm run seed` again).

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const env = { ...process.env };
const tools = path.join(os.homedir(), "tools");
if (fs.existsSync(tools)) {
  const jre = fs.readdirSync(tools).find((d) => /^jdk-/.test(d) && fs.existsSync(path.join(tools, d, "bin")));
  if (jre) {
    env.JAVA_HOME = path.join(tools, jre);
    env.PATH = `${path.join(tools, jre, "bin")}${path.delimiter}${env.PATH}`;
  }
}

const child = spawn(
  "npx",
  ["--yes", "firebase-tools", "emulators:start", "--only", "auth,firestore,database", "--project", "afriagrifed-ebc30"],
  { env, stdio: "inherit", shell: true }
);
child.on("exit", (code) => process.exit(code ?? 0));
