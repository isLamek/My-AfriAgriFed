#!/usr/bin/env node
// Lists catalog keys that the code asks for but en.js does not have (they would show up as
// the raw key on screen). Looks at literal keys only: t("a.b"), tRich("a.b"), tIn(lang, "a.b"),
// hasKey(lang, "a.b"), and keys in "key: 'a.b'" style objects handed to notifyUser.
const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const en = require(path.join(SRC, "i18n/locales/en.js"));

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== "locales" && f !== "node_modules") walk(p); }
    else if (/\.js$/.test(f) && !/\.test\.js$/.test(f)) files.push(p);
  }
})(SRC);

const plural = (k) => [k, `${k}_one`, `${k}_other`, `${k}_zero`, `${k}_few`, `${k}_many`, `${k}_two`];
const has = (k) => plural(k).some((x) => x in en);
const RX = [
  /\b(?:t|tRich)\(\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
  /\btIn\(\s*[^,()]+,\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
  /\bhasKey\(\s*[^,()]+,\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
];
const missing = new Map();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const rx of RX) {
    for (const m of text.matchAll(rx)) {
      const key = m[2];
      const lineStart = text.lastIndexOf("\n", m.index) + 1;
      if (/^\s*(\*|\/\/)/.test(text.slice(lineStart, m.index + 1))) continue; // inside a comment
      if (!has(key)) {
        const line = text.slice(0, m.index).split("\n").length;
        missing.set(key, `${path.relative(ROOT, file)}:${line}`);
      }
    }
  }
  // notification keys: key: "notif.x" needs notif.x.title
  for (const m of text.matchAll(/\bkey:\s*(["'])(notif\.[A-Za-z0-9_.]+)\1/g)) {
    if (!(`${m[2]}.title` in en)) missing.set(`${m[2]}.title`, path.relative(ROOT, file));
  }
}
if (process.argv.includes("--json")) console.log(JSON.stringify([...missing.keys()]));
else if (missing.size) {
  for (const [k, where] of missing) console.log(`${k}   ${where}`);
  console.log(`\n${missing.size} missing key(s)`);
} else console.log("every literal key exists in en.js");
process.exit(missing.size ? 1 : 0);
