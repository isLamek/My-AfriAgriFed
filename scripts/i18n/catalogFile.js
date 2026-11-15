// Reads and writes the language files (src/i18n/locales/<code>.js).
//
// The format is deliberately strict so people and tools can both edit it:
//
//   // ---- profile ----
//   "profile.editProfile": "Edit profile", // button · Profile.js
//
// one entry per line, JSON-quoted key and text, an optional // comment, and a
// "// ---- name ----" line before each group. Other languages also carry the
// English source in the comment (// en: ...) so translators see both.

const fs = require("fs");

const ENTRY = /^\s*("(?:[^"\\]|\\.)*")\s*:\s*("(?:[^"\\]|\\.)*")\s*,?\s*(?:\/\/\s?(.*))?$/;

function readCatalog(file) {
  if (!fs.existsSync(file)) return [];
  const entries = [];
  const lines = fs.readFileSync(file, "utf8").replace(/\r\n/g, "\n").split("\n");
  lines.forEach((line, i) => {
    if (!line.trim() || /^\s*(\/\/|module\.exports|\};?\s*$)/.test(line)) return;
    const m = ENTRY.exec(line);
    if (!m) throw new Error(`${file}:${i + 1}: not a catalog entry: ${line.slice(0, 80)}`);
    entries.push({ key: JSON.parse(m[1]), value: JSON.parse(m[2]), comment: m[3] || "" });
  });
  return entries;
}

const group = (key) => (key.startsWith("opt:") ? "opt" : key.split(".")[0]);

function writeCatalog(file, entries, { header, enSource } = {}) {
  const seen = new Set();
  const byGroup = new Map();
  for (const e of entries) {
    if (seen.has(e.key)) throw new Error(`${file}: duplicate key ${e.key}`);
    seen.add(e.key);
    const g = group(e.key);
    if (!byGroup.has(g)) byGroup.set(g, []);
    byGroup.get(g).push(e);
  }
  const out = [];
  if (header) out.push(...header.split("\n").map((l) => (l ? `// ${l}` : "//")));
  out.push("module.exports = {");
  const names = [...byGroup.keys()].sort((a, b) => (a === "common" ? -1 : b === "common" ? 1 : a.localeCompare(b)));
  for (const g of names) {
    out.push(`  // ---- ${g} ----`);
    for (const e of byGroup.get(g)) {
      let comment = e.comment;
      if (enSource && enSource.has(e.key)) comment = `en: ${enSource.get(e.key).replace(/\s+/g, " ")}`;
      out.push(`  ${JSON.stringify(e.key)}: ${JSON.stringify(e.value)},${comment ? ` // ${comment}` : ""}`);
    }
  }
  out.push("};", "");
  fs.writeFileSync(file, out.join("\n"), "utf8");
}

module.exports = { readCatalog, writeCatalog, group };
