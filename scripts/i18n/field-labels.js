#!/usr/bin/env node
// Prints the field names that people's saved answers (registration and the three
// questionnaires) are stored under, with the English label each one is shown as on the
// profile page. Output is JSON for scripts/i18n/add.js:
//
//   node scripts/i18n/field-labels.js > fields.json && node scripts/i18n/add.js fields.json
//
// The profile page shows a saved answer as "<label>: <value>". The label is looked up as
// field.<name> in the language files and falls back to a spaced-out version of the name.

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const parser = require(path.join(ROOT, "node_modules/@babel/parser"));
const traverse = require(path.join(ROOT, "node_modules/@babel/traverse")).default;

const FILES = ["Register.js", "FarmerQuestionnaire.js", "ConsumerQuestionnaire.js", "InstitutionQuestionnaire.js"];
const humanise = (key) => key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());

const keys = new Set();
function collect(node) {
  if (!node || node.type !== "ObjectExpression") return;
  for (const prop of node.properties) {
    if (prop.type !== "ObjectProperty") continue;
    const name = prop.key.type === "Identifier" ? prop.key.name : prop.key.type === "StringLiteral" ? prop.key.value : null;
    if (name && /^[A-Za-z][A-Za-z0-9]*$/.test(name)) keys.add(name);
    collect(prop.value);
  }
}

for (const file of FILES) {
  const code = fs.readFileSync(path.join(ROOT, "src", file), "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  traverse(ast, {
    CallExpression(p) {
      if (p.node.callee.name === "useState" && p.node.arguments[0]) collect(p.node.arguments[0]);
    },
    // inputs named in the markup, e.g. <input name="proofOfRegistration" />
    JSXAttribute(p) {
      if (p.node.name.name === "name" && p.node.value && p.node.value.type === "StringLiteral" && /^[a-z][A-Za-z0-9]*$/.test(p.node.value.value)) keys.add(p.node.value.value);
    },
  });
}
// document names that are saved by Register.js
for (const k of ["personalId", "proofOfResidence", "landOwnership", "businessRegistration", "taxCertificate", "institutionalLetter", "mainCrops", "region"]) keys.add(k);

const out = {};
for (const key of [...keys].sort()) out[`field.${key}`] = [humanise(key), "label of a saved answer on the profile page"];
process.stdout.write(JSON.stringify(out, null, 1));
