#!/usr/bin/env node
// Works on one language file (src/i18n/locales/<code>.js) next to the English source.
//
//   node scripts/i18n/lang.js status af                 how much is translated, what is left
//   node scripts/i18n/lang.js todo af [from] [count]    the next untranslated texts, to translate
//   node scripts/i18n/lang.js apply af batch.json       add {"key": "translated text"} to the file
//   node scripts/i18n/lang.js csv af out.csv            a spreadsheet for a native-speaker review
//   node scripts/i18n/lang.js import af reviewed.csv    read a reviewed spreadsheet back in
//   node scripts/i18n/lang.js check af                  placeholders, empties, leftovers
//
// Every text keeps the English {placeholders} (names, numbers); apply/import refuse a text
// that drops or renames one, because that would show "{name}" or a blank to a person.

const fs = require("fs");
const path = require("path");
const { readCatalog, writeCatalog } = require("./catalogFile");

const ROOT = path.resolve(__dirname, "../..");
const LOCALES = path.join(ROOT, "src/i18n/locales");
const file = (code) => path.join(LOCALES, `${code}.js`);

const [cmd, code, ...rest] = process.argv.slice(2);
if (!cmd || !code) {
  console.log(fs.readFileSync(__filename, "utf8").split("\n").slice(1, 14).join("\n").replace(/^\/\/ ?/gm, ""));
  process.exit(1);
}

const PLURAL = /_(zero|one|two|few|many|other)$/;
const en = readCatalog(file("en"));
const enMap = new Map(en.map((e) => [e.key, e]));
const have = new Map(readCatalog(file(code)).map((e) => [e.key, e]));
const ph = (s) => [...String(s).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort().join(",");

function problems(key, text) {
  const out = [];
  const source = enMap.get(key) || enMap.get(key.replace(PLURAL, "_other"));
  if (!source) return [`${key}: no such key in English`];
  if (typeof text !== "string" || !text.trim()) out.push(`${key}: empty`);
  else if (ph(text) !== ph(source.value)) out.push(`${key}: placeholders {${ph(source.value)}} expected, got {${ph(text)}}`);
  return out;
}

function save(map) {
  // same order and groups as English; keys English no longer has are dropped
  const entries = en.filter((e) => map.has(e.key)).map((e) => ({ key: e.key, value: map.get(e.key).value, comment: map.get(e.key).comment || "" }));
  writeCatalog(file(code), entries, {
    header: `${code}: translation of the English text (src/i18n/locales/en.js). Keep every {placeholder} exactly as it is.\nOne entry per line; the comment after each entry is the English source.`,
    enSource: new Map(en.map((e) => [e.key, e.value])),
  });
}

if (cmd === "status") {
  const todo = en.filter((e) => !have.has(e.key));
  const extra = [...have.keys()].filter((k) => !enMap.has(k));
  console.log(`${code}: ${have.size - extra.length} of ${en.length} translated, ${todo.length} to do, ${extra.length} not in English`);
  const words = todo.reduce((n, e) => n + e.value.split(/\s+/).length, 0);
  console.log(`about ${words} English words left`);
} else if (cmd === "todo") {
  const from = Number(rest[0] || 0);
  const count = Number(rest[1] || 120);
  const todo = en.filter((e) => !have.has(e.key));
  for (const e of todo.slice(from, from + count)) console.log(`${e.key} | ${e.value}${e.comment ? `   [${e.comment.replace(/ · .*$/, "")}]` : ""}`);
  console.log(`\n${Math.min(count, Math.max(0, todo.length - from))} shown, ${todo.length} to do in all`);
} else if (cmd === "apply") {
  const batch = JSON.parse(fs.readFileSync(rest[0], "utf8"));
  const bad = [];
  for (const [key, text] of Object.entries(batch)) {
    const p = problems(key, text);
    if (p.length) bad.push(...p);
    else have.set(key, { key, value: text.trim(), comment: "" });
  }
  if (bad.length) console.log(`${bad.length} refused:\n${bad.join("\n")}`);
  save(have);
  console.log(`${code}: ${[...have.keys()].filter((k) => enMap.has(k)).length} of ${en.length} translated`);
  process.exit(bad.length ? 1 : 0);
} else if (cmd === "csv") {
  const q = (s) => `"${String(s).replace(/"/g, '""')}"`;
  const rows = [["key", "where it appears", "English", code, "your notes"].map(q).join(",")];
  for (const e of en) {
    const t = have.get(e.key);
    rows.push([e.key, e.comment.replace(/ · .*$/, ""), e.value, t ? t.value : "", ""].map(q).join(","));
  }
  fs.writeFileSync(rest[0], "﻿" + rows.join("\r\n") + "\r\n", "utf8");
  console.log(`wrote ${rest[0]}: ${en.length} rows`);
} else if (cmd === "import") {
  const text = fs.readFileSync(rest[0], "utf8").replace(/^﻿/, "");
  // minimal CSV reader (quoted fields, doubled quotes, newlines inside quotes)
  const rows = [];
  let row = [], cell = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++; }
      else if (c === '"') inQ = false;
      else cell += c;
    } else if (c === '"') inQ = true;
    else if (c === ",") { row.push(cell); cell = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.length > 1 || row[0]) rows.push(row); row = []; }
    else cell += c;
  }
  if (cell || row.length) { row.push(cell); rows.push(row); }
  const bad = [];
  let changed = 0;
  for (const r of rows.slice(1)) {
    const [key, , , value] = r;
    if (!value || !value.trim()) continue;
    const p = problems(key, value);
    if (p.length) { bad.push(...p); continue; }
    if (!have.has(key) || have.get(key).value !== value.trim()) changed++;
    have.set(key, { key, value: value.trim(), comment: "" });
  }
  if (bad.length) console.log(`${bad.length} refused:\n${bad.join("\n")}`);
  save(have);
  console.log(`${changed} changed, ${have.size} in the file`);
  process.exit(bad.length ? 1 : 0);
} else if (cmd === "check") {
  const bad = [];
  for (const e of en) {
    const t = have.get(e.key);
    if (!t) { bad.push(`${e.key}: missing`); continue; }
    bad.push(...problems(e.key, t.value));
  }
  for (const k of have.keys()) if (!enMap.has(k)) bad.push(`${k}: not in English`);
  console.log(bad.length ? bad.slice(0, 50).join("\n") + `\n${bad.length} problem(s)` : `${code}: complete, ${en.length} texts`);
  process.exit(bad.length ? 1 : 0);
} else {
  console.log(`unknown command ${cmd}`);
  process.exit(1);
}
