#!/usr/bin/env node
// Prints catalog entries ("opt:<English>") for EVERY string in a list of plain strings,
// e.g. ["Local markets", "Middlemen", "<1 year"], in the files named. leftovers.js skips
// strings that look like code (Family-run, <1 year); this one takes them all, because in
// the questionnaires every list entry is a label people read.
//
//   node scripts/i18n/array-opts.js FarmerQuestionnaire.js ... > opts.json && node scripts/i18n/add.js opts.json

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const parser = require(path.join(ROOT, "node_modules/@babel/parser"));
const traverse = require(path.join(ROOT, "node_modules/@babel/traverse")).default;

const out = {};
for (const name of process.argv.slice(2)) {
  const code = fs.readFileSync(path.join(ROOT, "src", name), "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    ArrayExpression(p) {
      const els = p.node.elements;
      if (els.length < 2 || !els.every((e) => e && e.type === "StringLiteral")) return;
      for (const e of els) {
        const v = e.value;
        if (!/[A-Za-z]{2,}/.test(v) && !/^[<>≥≤+\d]/.test(v)) continue;
        if (!/[A-Za-z]/.test(v)) continue; // "0-25%", "$500-$2,000": numbers only, nothing to translate
        out[`opt:${v}`] = [v, `list item · ${name}`];
      }
    },
  });
}
process.stdout.write(JSON.stringify(out, null, 1));
