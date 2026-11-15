#!/usr/bin/env node
// Adds English entries to src/i18n/locales/en.js from a JSON file, for text that
// extract.js cannot convert by itself (sentences with placeholders, option lists).
//
//   node scripts/i18n/add.js entries.json
//
// entries.json:  { "profile.completeness": "Your profile is {percent}% complete.",
//                  "opt:Crop farming": ["Crop farming", "farming type checkbox"] }
// A value is the English text, or [text, comment]. A key that already exists with
// different text is an error (so two screens can never silently share a key).

const fs = require("fs");
const path = require("path");
const { readCatalog, writeCatalog } = require("./catalogFile");

const EN = path.resolve(__dirname, "../../src/i18n/locales/en.js");
const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/i18n/add.js entries.json");
  process.exit(1);
}

const incoming = JSON.parse(fs.readFileSync(file, "utf8"));
const catalog = readCatalog(EN);
const byKey = new Map(catalog.map((e) => [e.key, e]));
let added = 0;
let same = 0;
for (const [key, raw] of Object.entries(incoming)) {
  const [value, comment = ""] = Array.isArray(raw) ? raw : [raw, ""];
  const existing = byKey.get(key);
  if (existing) {
    if (existing.value !== value) throw new Error(`"${key}" already exists with different text:\n  have: ${existing.value}\n  new:  ${value}`);
    same++;
    continue;
  }
  const entry = { key, value, comment };
  byKey.set(key, entry);
  catalog.push(entry);
  added++;
}
writeCatalog(EN, catalog, {
  header: "English: the source language. New text is added here first; the other languages follow (see docs/I18N.md).\nOne entry per line, JSON-quoted. The comment after an entry says where it is shown.",
});
console.log(`added ${added}, already present ${same}; catalog now has ${catalog.length} entries`);
