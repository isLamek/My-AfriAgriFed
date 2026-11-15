#!/usr/bin/env node
// Finds catalog keys nothing in the code asks for any more, so they are not translated for
// nothing. Dry run by default; --delete removes them from en.js.
//
//   node scripts/i18n/unused-keys.js           list them
//   node scripts/i18n/unused-keys.js --delete  remove them
//
// A key counts as used when its text appears in quotes in the code, when it is built from a
// prefix (t(`compass.${x}`) uses everything starting with "compass."), when it is a plural
// form (_one/_other) of a used key, or when it is the .title/.body of a notification key.
// opt:<English> entries are looked up by value (tv()), so they are never removed here.

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const SRC = path.join(ROOT, "src");
const EN = path.join(SRC, "i18n/locales/en.js");
const en = require(EN);

const files = [];
(function walk(dir) {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) { if (f !== "locales" && f !== "node_modules") walk(p); }
    else if (/\.js$/.test(f)) files.push(p);
  }
})(SRC);
for (const extra of ["server/checkout.js"]) files.push(path.join(ROOT, extra));

const literals = new Set();
const prefixes = new Set();
for (const file of files) {
  const text = fs.readFileSync(file, "utf8");
  for (const m of text.matchAll(/["'`]([A-Za-z][A-Za-z0-9_.:-]*)["'`]/g)) literals.add(m[1]);
  for (const m of text.matchAll(/["'`]([A-Za-z][A-Za-z0-9_.-]*\.)\$\{/g)) prefixes.add(m[1]);
  // "${base}.title" style: the base is in the code, the suffix is added by the helper
  for (const m of text.matchAll(/key:\s*[`"']([A-Za-z0-9_.]+)\$\{/g)) prefixes.add(m[1]);
}

const base = (k) => k.replace(/_(zero|one|two|few|many|other)$/, "");
const used = (k) => {
  if (k.startsWith("opt:")) return true;
  const b = base(k);
  if (literals.has(k) || literals.has(b)) return true;
  for (const p of prefixes) if (k.startsWith(p)) return true;
  const notif = b.replace(/\.(title|body)$/, "");
  if (notif !== b && literals.has(notif)) return true;
  return false;
};

const unused = Object.keys(en).filter((k) => !used(k));
if (process.argv.includes("--delete")) {
  const raw = fs.readFileSync(EN, "utf8");
  const eol = raw.includes("\r\n") ? "\r\n" : "\n";
  const kill = new Set(unused);
  const lines = raw.split(/\r?\n/).filter((line) => {
    const m = /^\s*"([^"]+)":/.exec(line);
    return !(m && kill.has(m[1]));
  });
  fs.writeFileSync(EN, lines.join(eol));
  console.log(`removed ${unused.length} unused key(s)`);
} else {
  for (const k of unused) console.log(k);
  console.log(`\n${unused.length} unused of ${Object.keys(en).length} keys`);
}
