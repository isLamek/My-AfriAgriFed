#!/usr/bin/env node
// Moves visible English text out of the source and into src/i18n/locales/en.js.
//
//   node scripts/i18n/extract.js                 dry run: show what would change
//   node scripts/i18n/extract.js --apply         rewrite the files and update en.js
//   node scripts/i18n/extract.js --apply Profile.js DemandBoard.js    only these files
//   node scripts/i18n/extract.js --manual        also list text it will NOT touch (to do by hand)
//
// It uses the real parser (not regexes) and edits by exact character positions,
// so formatting and line endings stay as they were. It only converts text that
// is safe to convert on its own:
//   - plain text inside an element           <h2>Edit profile</h2>
//   - placeholder / title / aria-label / alt / subtitle / eyebrow ... attributes
//   - the first argument of toast.*(), alert(), confirm()
// Sentences built from several parts ("Hello {name}, you have ...") and text kept
// in data (menus, option lists, validation messages) are listed by --manual and
// written by hand with placeholders, so word order can change per language.

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const parser = require(path.join(ROOT, "node_modules/@babel/parser"));
const traverse = require(path.join(ROOT, "node_modules/@babel/traverse")).default;
const { readCatalog, writeCatalog } = require("./catalogFile");
const { textLike } = require("./leftovers");

const SRC = path.join(ROOT, "src");
const EN = path.join(SRC, "i18n/locales/en.js");

// Staff-only tools and legal text stay in English (see docs/I18N.md).
const EXCLUDE = new Set([
  "AdminDashboard.js", "adminBlock.js", "AdminTestRole.js", "admin.js",
  "Legal.js", "legalContent.js", "index.js", "firebaseConfig.js", "setupTests.js", "reportWebVitals.js",
]);

const ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "eyebrow", "subtitle", "dashboardTitle", "reason", "data-label"]);
const CALLS = new Set(["success", "error", "loading", "alert", "confirm", "toast"]);
const BRAND = /^(AfriAgriFed|AAF|N\$|Namibia|Open-Meteo|NASA FIRMS|OpenStreetMap|Esri|EUMETSAT|WhatsApp|Flutterwave)$/;

// Short words shared by many screens get one shared key.
const COMMON = new Set([
  "Save", "Cancel", "Delete", "Edit", "Close", "Back", "Next", "Submit", "Search", "Loading...", "Loading…",
  "Yes", "No", "Continue", "Send", "Remove", "Try again", "Reload", "Sign In", "Register", "Logout", "Profile",
]);

const NAMESPACE = {
  ConsumerDashboard: "feed", FarmerQuestionnaire: "farmerForm", ConsumerQuestionnaire: "buyerForm",
  InstitutionQuestionnaire: "institutionForm", InstitutionDashboard: "institution", DemandBoard: "demand",
  MyListings: "listings", MyOrders: "orders", OrderTracker: "tracker", DataDashboard: "data",
  StatisticsDashboard: "statistics", TrainingPrograms: "training", PageAccessGate: "pageAccess",
  AppErrorBoundary: "crash", NotificationBell: "notifications", CommunitySpaces: "spaces",
  QuickAccess: "quickAccess", SignIn: "signIn", ForgotPassword: "forgotPassword", VerifyEmail: "verifyEmail",
  MapPage: "weatherMap", MapDetails: "mapDetails", MapFarms: "farms", MarketMap: "marketMap",
  FeedMarketCard: "marketCard", ListingCard: "listing", LocationPicker: "location", AIChat: "assistant",
  PaymentCallback: "paymentResult", SiteFooter: "footer", CookieBanner: "cookies", InsightsFrame: "insights",
  AppShell: "shell",
};

const camel = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const nsFor = (file) => {
  const base = path.basename(file, ".js");
  return NAMESPACE[base] || camel(base);
};

function slug(text) {
  const words = text
    .replace(/\b(\w)\.(\w)\./g, "$1$2") // "e.g." -> "eg"
    .replace(/[^A-Za-z0-9\s]/g, " ")
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1 || /\d/.test(w))
    .slice(0, 6);
  const s = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
  return (s || "text").slice(0, 44);
}

const normalise = (s) => s.replace(/\s+/g, " ").trim();
const hasLetters = (s) => /[A-Za-z]{2,}/.test(s);
const looksTechnical = (s) => /^[\w.+-]+@[\w.-]+\.\w+$/.test(s) || /^(https?:|\/|www\.)/.test(s) || (/^[a-z0-9_.:-]+$/.test(s) && !s.includes(" "));
const isBlank = (n) => n.type === "JSXText" && !n.value.trim();

function listFiles(only) {
  const out = [];
  for (const dir of [SRC, path.join(SRC, "farmview")]) {
    if (!fs.existsSync(dir)) continue;
    for (const f of fs.readdirSync(dir)) {
      if (!f.endsWith(".js") || f.endsWith(".test.js") || EXCLUDE.has(f)) continue;
      if (only.length && !only.includes(f)) continue;
      out.push(path.join(dir, f));
    }
  }
  return out;
}

/** Is this string literal text shown to people, in a place that is safe to translate? Returns a context label or null. */
function expressionContext(p) {
  const parent = p.parent;
  // errors.field = "message"
  if (parent.type === "AssignmentExpression" && parent.right === p.node && parent.left.type === "MemberExpression") {
    const obj = parent.left.object;
    const objName = obj.type === "Identifier" ? obj.name : obj.type === "MemberExpression" && obj.property.name ? obj.property.name : "";
    if (/^(new)?errors?$/i.test(objName)) return "validation message";
  }
  // setError("message"), setStatus("..."), setMessage("...")
  if (parent.type === "CallExpression" && parent.arguments[0] === p.node && parent.callee.type === "Identifier" && /^set[A-Z]\w*$/.test(parent.callee.name)) {
    return /\s/.test(p.node.value) ? parent.callee.name : null; // two or more words: a message, not a mode name
  }
  // function Gate({ title = "Verify your e-mail" }): default text, read when the function is called
  if (parent.type === "AssignmentPattern" && parent.right === p.node && /\s/.test(p.node.value)) return "default text";
  // new Error("message") is shown to people through toast.error(error.message)
  if (parent.type === "NewExpression" && parent.callee.name === "Error" && parent.arguments[0] === p.node) return "error message";
  // text in an either/or or fallback inside what is drawn on screen
  let q = p;
  let branch = false;
  for (let up = p.parentPath; up; up = up.parentPath) {
    const n = up.node;
    if (n.type === "ConditionalExpression" || n.type === "LogicalExpression" || n.type === "ParenthesizedExpression") {
      if (n.type === "ConditionalExpression" && n.test === q.node) return null; // a test, not a result
      if (n.type === "LogicalExpression" && n.left === q.node && n.operator !== "&&") branch = branch; // left side is the value, not text
      branch = true;
      q = up;
      continue;
    }
    if (n.type === "CallExpression" && branch && n.arguments.includes(q.node)) {
      const c = n.callee;
      const name = c.type === "MemberExpression" ? c.property.name : c.name;
      const owner = c.type === "MemberExpression" ? c.object.name : "";
      if ((owner === "toast" && CALLS.has(name)) || (c.type === "Identifier" && (name === "toast" || /^set[A-Z]\w*$/.test(name)))) return `${owner ? owner + "." : ""}${name}`;
      return null;
    }
    if (n.type === "JSXExpressionContainer") {
      const owner = up.parent;
      if (!branch) return null; // a bare literal in braces is handled as plain text elsewhere
      if (owner.type === "JSXElement" || owner.type === "JSXFragment") return "either/or";
      if (owner.type === "JSXAttribute" && ATTRS.has(owner.name.name)) return owner.name.name;
      return null;
    }
    return null;
  }
  return null;
}

/** Finds what can be converted (edits) and what needs a human (manual) in one file. */
function analyse(file) {
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  const edits = [];
  const manual = [];
  const lineOf = (node) => node.loc.start.line;
  // a *different* variable named t in scope would shadow the translation function
  // (the import of t from the i18n module itself is fine)
  const hasT = (p) => {
    const b = p.scope.getBinding("t");
    return !!b && !(b.kind === "module" && b.path.parent && b.path.parent.source && /i18n$/.test(b.path.parent.source.value));
  };
  const wrapJsx = (k) => `{t(${JSON.stringify(k)})}`;
  const wrapCall = (k) => `t(${JSON.stringify(k)})`;

  traverse(ast, {
    JSXText(p) {
      // Babel turns CRLF into LF inside JSX text, so positions must be measured
      // on the real source slice, never on node.value (that drifts by one per line break).
      const raw = code.slice(p.node.start, p.node.end);
      const value = normalise(p.node.value);
      if (!value || !hasLetters(value) || BRAND.test(value)) return;
      const kids = p.parent.children;
      const i = kids.indexOf(p.node);
      const lead = raw.slice(0, raw.length - raw.trimStart().length);
      const trail = raw.slice(raw.trimEnd().length);
      let prev = i - 1;
      while (prev >= 0 && isBlank(kids[prev])) prev--;
      let next = i + 1;
      while (next < kids.length && isBlank(kids[next])) next++;
      // The sentence continues through a neighbour when that neighbour is an
      // expression or an inline element on the same line (no line break between).
      const continues = (idx, boundary) => {
        const sib = kids[idx];
        if (!sib) return false;
        if (sib.type === "JSXElement" && sib.openingElement.selfClosing) return false; // an icon beside a label
        return !/[\r\n]/.test(boundary);
      };
      // Text inside an inline element (<strong>, <a>, <Link> ...) that sits within a sentence
      // is part of that sentence: translating it alone would split the sentence.
      const INLINE = new Set(["strong", "em", "b", "i", "u", "a", "Link", "span", "code", "small", "mark", "abbr"]);
      const parentName = p.parent.type === "JSXElement" ? p.parent.openingElement.name.name : null;
      let insideSentence = false;
      if (parentName && INLINE.has(parentName)) {
        const grand = p.parentPath.parent;
        const sibs = grand && grand.children ? grand.children : [];
        insideSentence = sibs.some((s) => s !== p.parent && s.type === "JSXText" && hasLetters(normalise(s.value)));
      }
      const mixed = insideSentence || continues(prev, lead) || continues(next, trail);
      const elName = p.parent.openingElement ? p.parent.openingElement.name.name || "element" : "fragment";
      if (mixed) return void manual.push({ line: lineOf(p.node), why: "sentence with parts", text: value });
      if (hasT(p)) return void manual.push({ line: lineOf(p.node), why: "a variable named t is in scope", text: value });
      edits.push({ start: p.node.start + lead.length, end: p.node.end - trail.length, value, ctx: String(elName), wrap: wrapJsx });
    },

    JSXAttribute(p) {
      const n = p.node;
      const name = n.name.type === "JSXIdentifier" ? n.name.name : null;
      if (!ATTRS.has(name) || !n.value) return;
      if (n.value.type === "StringLiteral") {
        const value = normalise(n.value.value);
        if (!hasLetters(value) || BRAND.test(value) || looksTechnical(value)) return;
        if (hasT(p)) return void manual.push({ line: lineOf(n), why: "a variable named t is in scope", text: value });
        edits.push({ start: n.value.start, end: n.value.end, value, ctx: name, wrap: wrapJsx });
      } else if (n.value.type === "JSXExpressionContainer" && n.value.expression.type === "TemplateLiteral") {
        manual.push({ line: lineOf(n), why: `${name} built from parts`, text: code.slice(n.value.start, n.value.end).slice(0, 90) });
      }
    },

    // Text inside expressions: {busy ? "Saving..." : "Save"}, {name || "Not provided"},
    // errors.title = "...", setError("..."), new Error("..."). Only inside functions: code
    // at the top of a file runs once at start-up, so t() there would freeze the language.
    StringLiteral(p) {
      if (!p.getFunctionParent()) return;
      const n = p.node;
      const value = normalise(n.value);
      if (!textLike(value)) return;
      const ctx = expressionContext(p);
      if (!ctx) return;
      if (hasT(p)) return void manual.push({ line: lineOf(n), why: "a variable named t is in scope", text: value });
      edits.push({ start: n.start, end: n.end, value, ctx, wrap: wrapCall });
    },

    CallExpression(p) {
      const c = p.node.callee;
      const name = c.type === "MemberExpression" ? c.property.name : c.name;
      const owner = c.type === "MemberExpression" ? c.object.name || c.object.type : "";
      if (!CALLS.has(name)) return;
      if (c.type === "MemberExpression" && !["toast", "window"].includes(owner)) return;
      const a = p.node.arguments[0];
      if (!a) return;
      const ctx = `${owner ? owner + "." : ""}${name}`;
      if (a.type === "StringLiteral") {
        const value = normalise(a.value);
        if (!hasLetters(value)) return;
        if (hasT(p)) return void manual.push({ line: lineOf(a), why: "a variable named t is in scope", text: value });
        edits.push({ start: a.start, end: a.end, value, ctx, wrap: wrapCall });
      } else if (a.type === "TemplateLiteral") {
        if (a.expressions.length === 0) {
          const value = normalise(a.quasis[0].value.cooked);
          if (hasLetters(value) && !hasT(p)) edits.push({ start: a.start, end: a.end, value, ctx, wrap: wrapCall });
        } else {
          manual.push({ line: lineOf(a), why: `${name}() message built from parts`, text: code.slice(a.start, a.end).slice(0, 90) });
        }
      }
    },
  });

  return { code, edits, manual, ast };
}

const eolCounts = (s) => ({
  lone: (s.match(/\r(?!\n)/g) || []).length,
  crlf: (s.match(/\r\n/g) || []).length,
  lf: (s.match(/(?<!\r)\n/g) || []).length,
});

function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const showManual = args.includes("--manual");
  const only = args.filter((a) => !a.startsWith("--"));
  const files = listFiles(only);

  const catalog = readCatalog(EN);
  const byKey = new Map(catalog.map((e) => [e.key, e]));
  const byText = new Map(); // "group|text" -> key, so the same text in one file reuses its key
  for (const e of catalog) byText.set(`${e.key.split(".")[0]}|${e.value}`, e.key);

  const analysed = files.map((f) => ({ file: f, ...analyse(f) }));
  // short texts that appear in 2+ files become shared "common." keys
  const filesWith = new Map();
  for (const a of analysed) {
    for (const e of a.edits) {
      if (!COMMON.has(e.value)) continue;
      if (!filesWith.has(e.value)) filesWith.set(e.value, new Set());
      filesWith.get(e.value).add(a.file);
    }
  }

  let converted = 0;
  const report = [];
  for (const a of analysed) {
    const ns = nsFor(a.file);
    const edits = [...a.edits].sort((x, y) => x.start - y.start);
    if (!edits.length && !(showManual && a.manual.length)) continue;

    // keys are assigned in source order...
    const planned = edits.map((e) => {
      const shared = COMMON.has(e.value) && (filesWith.get(e.value) || new Set()).size >= 2;
      const group = shared ? "common" : ns;
      let key = byText.get(`${group}|${e.value}`);
      if (!key) {
        const base = `${group}.${slug(e.value)}`;
        key = base;
        for (let n = 2; byKey.has(key); n++) key = `${base}${n}`;
        const entry = { key, value: e.value, comment: `${e.ctx} · ${path.basename(a.file)}` };
        byKey.set(key, entry);
        catalog.push(entry);
        byText.set(`${group}|${e.value}`, key);
      }
      converted++;
      return { ...e, key };
    });

    // ...and the edits are applied back to front, so earlier positions stay valid
    let code = a.code;
    for (const e of [...planned].sort((x, y) => y.start - x.start)) code = code.slice(0, e.start) + e.wrap(e.key) + code.slice(e.end);

    if (planned.length && apply) {
      const rel = path.relative(path.dirname(a.file), path.join(SRC, "i18n")).replace(/\\/g, "/");
      const importPath = rel.startsWith(".") ? rel : `./${rel}`;
      if (!/from\s+["'][./]+\/i18n["']/.test(code)) {
        const re = /^import[\s\S]*?from\s+["'][^"']+["'];?[ \t]*$|^import\s+["'][^"']+["'];?[ \t]*$/gm;
        let m;
        let pos = 0;
        while ((m = re.exec(code))) pos = m.index + m[0].length;
        const nl = a.code.includes("\r\n") ? "\r\n" : "\n";
        code = code.slice(0, pos) + `${nl}import { t } from "${importPath}";` + code.slice(pos);
      }
      // never change a file's line endings
      const before = eolCounts(a.code);
      const after = eolCounts(code);
      if (after.lone || (before.lf === 0) !== (after.lf === 0) || (before.crlf === 0) !== (after.crlf === 0)) {
        throw new Error(`${path.basename(a.file)}: line endings would change (before ${JSON.stringify(before)}, after ${JSON.stringify(after)}); nothing written`);
      }
      fs.writeFileSync(a.file, code, "utf8");
    }
    report.push({ file: path.relative(SRC, a.file), converted: planned.length, manual: a.manual });
  }

  if (apply) {
    writeCatalog(EN, catalog, {
      header: "English: the source language. New text is added here first; the other languages follow (see docs/I18N.md).\nOne entry per line, JSON-quoted. The comment after an entry says where it is shown.",
    });
  }

  for (const r of report) {
    console.log(`${r.file.padEnd(34)} ${String(r.converted).padStart(3)} converted, ${String(r.manual.length).padStart(3)} for hand`);
    if (showManual) for (const m of r.manual) console.log(`    ${String(m.line).padStart(4)}  [${m.why}] ${m.text.slice(0, 100)}`);
  }
  console.log(`\n${apply ? "Rewrote" : "Would convert"} ${converted} strings in ${report.filter((r) => r.converted).length} files; catalog has ${catalog.length} entries.${apply ? "" : "  (dry run: add --apply)"}`);
}

run();
