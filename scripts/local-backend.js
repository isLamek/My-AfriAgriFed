// Starts the website's backend (server.js) for LOCAL TESTING ONLY, wired to the local Firebase
// emulators and to a FAKE payment provider, so you can walk the whole shop on your own computer:
// post a listing, buy it, pay (nobody is charged: there is no real payment), watch the order,
// hand it over, report a problem.
//
//   npm run emulators        (one terminal)
//   npm run seed             (once)
//   npm run backend:local    (this)
//   npm run start:local      (the website, port 3001)
//
// SAFETY: the backend is told to use the emulators on this computer (FIRESTORE_EMULATOR_HOST and
// FIREBASE_AUTH_EMULATOR_HOST), with a throw-away key made up right here that is valid for nothing
// else. It cannot reach your live database, and the "payments" go to a little fake server below.
// This file refuses to start if the emulators are not running.

const crypto = require("crypto");
const http = require("http");
const net = require("net");

const FAKE_FLW_PORT = 5055;

function emulatorUp(port) {
  return new Promise((resolve) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.once("connect", () => { socket.destroy(); resolve(true); });
    socket.once("error", () => resolve(false));
  });
}

/** A stand-in for Flutterwave that says yes to everything, instantly. */
function startFakeFlutterwave() {
  const payments = new Map(); // transaction id -> what was asked
  let nextId = 900000;
  const send = (res, body, status = 200) => {
    res.writeHead(status, { "Content-Type": "application/json" });
    res.end(JSON.stringify(body));
  };
  const server = http.createServer((req, res) => {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = raw ? JSON.parse(raw) : {};
      const path = req.url.replace(/^\/v3/, "");
      if (req.method === "POST" && path === "/payments") {
        const id = nextId++;
        payments.set(String(id), { tx_ref: body.tx_ref, amount: body.amount, currency: body.currency });
        console.log(`[fake payments] ${body.currency} ${body.amount} for ${body.tx_ref} (subaccounts: ${JSON.stringify(body.subaccounts)})`);
        // straight back to the website's "payment confirmed" page, as if the buyer had paid
        const link = `${body.redirect_url}?status=successful&tx_ref=${encodeURIComponent(body.tx_ref)}&transaction_id=${id}`;
        return send(res, { status: "success", data: { link } });
      }
      const verify = /^\/transactions\/(\d+)\/verify$/.exec(path);
      if (req.method === "GET" && verify) {
        const p = payments.get(verify[1]);
        if (!p) return send(res, { status: "error", message: "No transaction found" }, 404);
        return send(res, { status: "success", data: { id: Number(verify[1]), status: "successful", ...p } });
      }
      if (req.method === "GET" && path.startsWith("/banks/")) return send(res, { status: "success", data: [{ id: 1, code: "FNB", name: "First National Bank (fake)" }] });
      if (req.method === "POST" && path === "/subaccounts") return send(res, { status: "success", data: { id: 424242 } });
      send(res, { status: "error", message: "not in the fake" }, 404);
    });
  });
  server.listen(FAKE_FLW_PORT, "127.0.0.1");
  return server;
}

(async () => {
  if (!(await emulatorUp(8080)) || !(await emulatorUp(9099))) {
    console.error("The Firebase emulators are not running. Start them first with: npm run emulators");
    process.exit(1);
  }

  // Everything below is set BEFORE the backend starts, so nothing in .env can override it.
  const { privateKey } = crypto.generateKeyPairSync("rsa", { modulusLength: 2048, privateKeyEncoding: { type: "pkcs8", format: "pem" }, publicKeyEncoding: { type: "spki", format: "pem" } });
  delete process.env.FIREBASE_SERVICE_ACCOUNT_FILE;
  delete process.env.GOOGLE_APPLICATION_CREDENTIALS;
  process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";
  process.env.GCLOUD_PROJECT = "afriagrifed-ebc30";
  process.env.FIREBASE_SERVICE_ACCOUNT_JSON = JSON.stringify({
    type: "service_account",
    project_id: "afriagrifed-ebc30",
    private_key_id: "local-test-only",
    private_key: privateKey,
    client_email: "local-test@afriagrifed-ebc30.iam.gserviceaccount.com",
  });
  process.env.FLW_SECRET_KEY = "FLWSECK_TEST-local-fake";
  process.env.FLW_SECRET_HASH = "local-fake-hash";
  process.env.FLW_BASE_URL = `http://127.0.0.1:${FAKE_FLW_PORT}/v3`;
  process.env.APP_BASE_URL = "http://localhost:3001";
  process.env.PORT = process.env.PORT || "5000";
  process.env.SWEEP_SECRET = "local-sweep";

  startFakeFlutterwave();
  console.log("\n================================================================");
  console.log(" LOCAL TEST BACKEND: emulators + FAKE payments (nobody is charged)");
  console.log(` The website on http://localhost:3001 talks to this on port ${process.env.PORT}.`);
  console.log("================================================================\n");
  require("../server.js");
})();
