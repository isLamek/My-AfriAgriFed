#!/usr/bin/env node
// Lists text that is still hard-coded English after extract.js: strings that
// look like sentences or labels but sit in code rather than in JSX text.
//
//   node scripts/i18n/leftovers.js            counts per file
//   node scripts/i18n/leftovers.js --list     every string with its line and kind
//   node scripts/i18n/leftovers.js Profile.js only that file
//
// Used while converting the app, and by src/i18n/hardcoded.test.js's helper.

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const parser = require(path.join(ROOT, "node_modules/@babel/parser"));
const traverse = require(path.join(ROOT, "node_modules/@babel/traverse")).default;

const SRC = path.join(ROOT, "src");
const EXCLUDE = new Set([
  "AdminDashboard.js", "adminBlock.js", "AdminTestRole.js", "admin.js", "Legal.js", "legalContent.js",
  "index.js", "firebaseConfig.js", "setupTests.js", "reportWebVitals.js",
  // detection patterns and token handling: nothing here is shown to people
  "contactGuard.js", "emailVerification.js",
]);

const BRAND = /^(AfriAgriFed|AAF|N\$|Namibia)$/;
const hasLetters = (s) => /[A-Za-z]{2,}/.test(s);

/** Does a string literal look like something a person reads? */
function textLike(s) {
  const v = s.replace(/\s+/g, " ").trim();
  if (v.length < 3 || !hasLetters(v) || BRAND.test(v)) return false;
  if (/^(https?:|\/|www\.|#|\.|data:|rgba?\(|[a-z]+:\/\/)/.test(v)) return false; // urls, paths, colours
  if (/^[\w.+-]+@[\w.-]+\.\w+$/.test(v)) return false; // e-mail
  if (/^[A-Z][a-z]+[.…!?]*$/.test(v)) return true; // a single capitalised word: Talk, Open, Saving...
  if (/^[a-z0-9_.:\-/[\]]+$/i.test(v) && !v.includes(" ")) return false; // one token: an id, a class, a key
  if (/^[a-z]+(-[a-z0-9]+)+( [a-z]+(-[a-z0-9]+)*)*$/.test(v)) return false; // css classes
  if (/[{}<>=;]/.test(v) && !/[A-Za-z]{3,}[ ,.!?]/.test(v)) return false; // code-ish
  return /^[A-Z]/.test(v) || v.includes(" ");
}

const NOISE_CALLEES = new Set(["console", "require", "includes", "startsWith", "endsWith", "split", "replace", "match", "test", "indexOf", "getItem", "setItem", "removeItem", "querySelector", "querySelectorAll", "getElementById", "addEventListener", "removeEventListener", "dispatchEvent", "Event", "CustomEvent", "fetch", "collection", "doc", "where", "orderBy", "query", "ref", "child", "push", "set", "get", "update", "remove", "on", "off", "once", "createElement", "getComputedStyle", "setAttribute", "classList", "toLocaleString", "toLocaleDateString", "toLocaleTimeString", "DateTimeFormat", "NumberFormat", "URLSearchParams", "append", "Error"]);

function scan(file) {
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  const found = [];
  const add = (node, value, kind) => found.push({ line: node.loc.start.line, kind, raw: value, text: value.replace(/\s+/g, " ").trim() });

  const calleeName = (c) => (c.type === "MemberExpression" ? (c.property.name || "") : c.name || "");
  const insideNoise = (p) => {
    for (let q = p.parentPath; q; q = q.parentPath) {
      const n = q.node;
      if (n.type === "ImportDeclaration" || n.type === "ExportNamedDeclaration" && n.source) return true;
      if (n.type === "CallExpression" && n.arguments.includes(p.node) && NOISE_CALLEES.has(calleeName(n.callee))) {
        // a thrown/new Error message is user-facing text; everything else listed is code plumbing
        return calleeName(n.callee) !== "Error" || false;
      }
      if (n.type === "NewExpression" && n.arguments.includes(p.node) && NOISE_CALLEES.has(n.callee.name) && n.callee.name !== "Error") return true;
      if (n.type === "BinaryExpression" && ["===", "!==", "==", "!=", "in"].includes(n.operator)) return true;
      if (n.type === "SwitchCase") return true;
      if (n.type === "JSXAttribute") {
        const nm = n.name.name;
        // attributes that are not shown text
        if (!["placeholder", "aria-label", "title", "alt", "eyebrow", "subtitle", "data-label", "dashboardTitle", "reason", "label"].includes(nm)) return true;
      }
      if (n.type === "ObjectProperty" && q.node.key === p.node) return true;
      if (n.type === "MemberExpression" && n.computed && n.property === p.node) return true;
    }
    return false;
  };

  const visit = (p, value, node) => {
    if (!textLike(value)) return;
    if (insideNoise(p)) return;
    const parent = p.parent;
    let kind = parent.type;
    if (parent.type === "ObjectProperty") kind = `prop ${parent.key.name || parent.key.value}`;
    else if (parent.type === "AssignmentExpression") kind = `assign ${code.slice(parent.left.start, parent.left.end).slice(0, 28)}`;
    else if (parent.type === "ConditionalExpression") kind = "either/or";
    else if (parent.type === "LogicalExpression") kind = `fallback ${parent.operator}`;
    else if (parent.type === "ArrayExpression") kind = "list item";
    else if (parent.type === "CallExpression") kind = `arg of ${calleeName(parent.callee)}()`;
    else if (parent.type === "NewExpression") kind = `new ${parent.callee.name}()`;
    else if (parent.type === "ReturnStatement") kind = "return";
    else if (parent.type === "JSXAttribute") kind = `attr ${parent.name.name}`;
    add(node, value, kind);
  };

  traverse(ast, {
    StringLiteral(p) {
      if (p.parent.type === "JSXAttribute" && /^(placeholder|aria-label|title|alt|eyebrow|subtitle|data-label|dashboardTitle|reason)$/.test(p.parent.name.name)) return; // extract.js handles these
      visit(p, p.node.value, p.node);
    },
    TemplateLiteral(p) {
      const text = p.node.quasis.map((q, i) => q.value.cooked + (i < p.node.expressions.length ? "{}" : "")).join("");
      visit(p, text, p.node);
    },
    JSXText(p) {
      // text extract.js left (sentences with parts) shows up here too
      const v = p.node.value.replace(/\s+/g, " ").trim();
      if (v && hasLetters(v) && !BRAND.test(v)) add(p.node, v, "jsx text (sentence part)");
    },
  });
  return found;
}

function run() {
  const args = process.argv.slice(2);
  // --emit-opt "list item,prop,return" Profile.js ... : prints a JSON of catalog entries
  // ("opt:<English text>") for data-driven labels, to feed to scripts/i18n/add.js. Those
  // texts stay in the data as they are (they may be stored values); only what is shown is translated.
  const emitIdx = args.indexOf("--emit-opt");
  if (emitIdx >= 0) {
    const kinds = args[emitIdx + 1].split(",");
    const files = args.filter((a, i) => !a.startsWith("--") && i !== emitIdx + 1);
    const out = {};
    for (const dir of [SRC, path.join(SRC, "farmview")]) {
      for (const f of fs.existsSync(dir) ? fs.readdirSync(dir) : []) {
        if (!f.endsWith(".js") || f.endsWith(".test.js") || EXCLUDE.has(f) || (files.length && !files.includes(f))) continue;
        for (const x of scan(path.join(dir, f))) {
          if (!kinds.some((k) => x.kind.startsWith(k))) continue;
          if (x.raw.includes("{}")) continue; // built from parts: by hand
          out[`opt:${x.raw}`] = [x.raw, `${x.kind} · ${f}`];
        }
      }
    }
    console.log(JSON.stringify(out, null, 1));
    return;
  }
  const list = args.includes("--list");
  const only = args.filter((a) => !a.startsWith("--"));
  let total = 0;
  const rows = [];
  for (const dir of [SRC, path.join(SRC, "farmview")]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".js") || f.endsWith(".test.js") || EXCLUDE.has(f)) continue;
      if (only.length && !only.includes(f)) continue;
      const found = scan(path.join(dir, f));
      if (found.length) rows.push({ f: path.relative(SRC, path.join(dir, f)), found });
      total += found.length;
    }
  }
  rows.sort((a, b) => b.found.length - a.found.length);
  for (const r of rows) {
    console.log(`${r.f.padEnd(34)} ${String(r.found.length).padStart(4)}`);
    if (list) for (const x of r.found) console.log(`     ${String(x.line).padStart(4)}  ${x.kind.padEnd(26)} ${x.text.slice(0, 110)}`);
  }
  console.log(`\n${total} candidate strings in ${rows.length} files`);
}

if (require.main === module) run();
module.exports = { scan, textLike, EXCLUDE };
