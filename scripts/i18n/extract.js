#!/usr/bin/env node
// Moves visible English text out of the source and into src/i18n/locales/en.js.
//
//   node scripts/i18n/extract.js                 dry run: show what would change
//   node scripts/i18n/extract.js --apply         rewrite the files and update en.js
//   node scripts/i18n/extract.js --apply Profile.js DemandBoard.js    only these files
//   node scripts/i18n/extract.js --manual        list text it will NOT touch (to do by hand)
//
// It uses the real parser (not regexes) and edits by exact character positions,
// so formatting and line endings stay as they were. It only converts text that
// is safe to convert on its own:
//   - plain text inside an element           <h2>Edit profile</h2>
//   - placeholder / title / aria-label / alt / subtitle / eyebrow ... attributes
//   - the first argument of toast.*(), alert(), confirm()
// Sentences built from several parts ("Hello {name}, you have ...") and text kept
// in data (menus, option lists, validation messages) are reported by --manual and
// written by hand with placeholders, so word order can change per language.

const fs = require("fs");
const path = require("path");
const ROOT = path.resolve(__dirname, "../..");
const parser = require(path.join(ROOT, "node_modules/@babel/parser"));
const traverse = require(path.join(ROOT, "node_modules/@babel/traverse")).default;
const { readCatalog, writeCatalog } = require("./catalogFile");

const SRC = path.join(ROOT, "src");
const EN = path.join(SRC, "i18n/locales/en.js");

// Staff-only tools and legal text stay in English (see docs/I18N.md).
const EXCLUDE = new Set([
  "AdminDashboard.js", "adminBlock.js", "AdminTestRole.js", "admin.js",
  "Legal.js", "legalContent.js", "index.js", "firebaseConfig.js", "setupTests.js", "reportWebVitals.js",
]);

const ATTRS = new Set(["placeholder", "aria-label", "title", "alt", "eyebrow", "subtitle", "dashboardTitle", "reason", "data-label"]);
const CALLS = new Set(["success", "error", "loading", "alert", "confirm"]);
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
  AppShell: "shell", PublicProfile: "member",
};

const camel = (s) => s.charAt(0).toLowerCase() + s.slice(1);
const nsFor = (file) => {
  const base = path.basename(file, ".js");
  return NAMESPACE[base] || camel(base);
};

function slug(text) {
  const words = text.replace(/[^A-Za-z0-9\s]/g, " ").trim().split(/\s+/).filter(Boolean).slice(0, 6);
  const s = words.map((w, i) => (i === 0 ? w.toLowerCase() : w[0].toUpperCase() + w.slice(1).toLowerCase())).join("");
  return (s || "text").slice(0, 44);
}

const normalise = (s) => s.replace(/\s+/g, " ").trim();
const hasLetters = (s) => /[A-Za-z]{2,}/.test(s);
const looksTechnical = (s) => /^[\w.+-]+@[\w.-]+\.\w+$/.test(s) || /^(https?:|\/|www\.)/.test(s) || /^[a-z0-9_.:-]+$/.test(s) && !s.includes(" ");

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

/** Finds what can be converted (edits) and what needs a human (manual) in one file. */
function analyse(file) {
  const code = fs.readFileSync(file, "utf8");
  const ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
  const edits = [];
  const manual = [];
  const lineOf = (node) => node.loc.start.line;
  const hasT = (p) => p.scope.hasBinding("t");

  traverse(ast, {
    JSXText(p) {
      const raw = p.node.value;
      const value = normalise(raw);
      if (!value || !hasLetters(value) || BRAND.test(value)) return;
      const parent = p.parent;
      const kids = parent.children;
      const i = kids.indexOf(p.node);
      const side = (idx, boundary) => {
        // looks at the sibling on one side; "mixed" when the sentence continues through it
        const sib = kids[idx];
        if (!sib || (sib.type === "JSXText" && !sib.value.trim())) return false;
        if (sib.type === "JSXElement" && sib.openingElement.selfClosing) return false; // an icon next to a label
        return !boundary.includes("\n"); // same line as an expression / inline element -> one sentence
      };
      const lead = raw.slice(0, raw.length - raw.trimStart().length);
      const trail = raw.slice(raw.trimEnd().length);
      // look past whitespace-only text to the real neighbour
      let prev = i - 1;
      while (prev >= 0 && kids[prev].type === "JSXText" && !kids[prev].value.trim()) prev--;
      let next = i + 1;
      while (next < kids.length && kids[next].type === "JSXText" && !kids[next].value.trim()) next++;
      const mixed = side(prev, lead) || side(next, trail);
      const elName = parent.openingElement ? parent.openingElement.name.name || "element" : "fragment";
      if (mixed) {
        manual.push({ line: lineOf(p.node), why: "sentence with parts", text: value });
        return;
      }
      if (hasT(p)) return manual.push({ line: lineOf(p.node), why: "a variable named t is in scope", text: value });
      const start = p.node.start + lead.length;
      const end = p.node.end - trail.length;
      edits.push({ start, end, kind: "text", value, ctx: String(elName), line: lineOf(p.node), wrap: (k) => `{t(${JSON.stringify(k)})}` });
    },

    JSXAttribute(p) {
      const n = p.node;
      const name = n.name.type === "JSXIdentifier" ? n.name.name : null;
      if (!ATTRS.has(name) || !n.value) return;
      if (n.value.type === "StringLiteral") {
        const value = normalise(n.value.value);
        if (!hasLetters(value) || BRAND.test(value) || looksTechnical(value)) return;
        if (hasT(p)) return manual.push({ line: lineOf(n), why: "a variable named t is in scope", text: value });
        edits.push({ start: n.value.start, end: n.value.end, kind: "attr", value, ctx: name, line: lineOf(n), wrap: (k) => `{t(${JSON.stringify(k)})}` });
      } else if (n.value.type === "JSXExpressionContainer" && n.value.expression.type === "TemplateLiteral") {
        manual.push({ line: lineOf(n), why: `${name} built from parts`, text: code.slice(n.value.start, n.value.end).slice(0, 90) });
      }
    },

    CallExpression(p) {
      const c = p.node.callee;
      const name = c.type === "MemberExpression" ? c.property.name : c.name;
      const owner = c.type === "MemberExpression" ? (c.object.name || c.object.type) : "";
      if (!CALLS.has(name)) return;
      if (c.type === "MemberExpression" && !["toast", "window"].includes(owner)) return;
      const a = p.node.arguments[0];
      if (!a) return;
      if (a.type === "StringLiteral") {
        const value = normalise(a.value);
        if (!hasLetters(value)) return;
        if (hasT(p)) return manual.push({ line: lineOf(a), why: "a variable named t is in scope", text: value });
        edits.push({ start: a.start, end: a.end, kind: "call", value, ctx: `${owner ? owner + "." : ""}${name}`, line: lineOf(a), wrap: (k) => `t(${JSON.stringify(k)})` });
      } else if (a.type === "TemplateLiteral") {
        if (a.expressions.length === 0) {
          const value = normalise(a.quasis[0].value.cooked);
          if (hasLetters(value) && !hasT(p)) edits.push({ start: a.start, end: a.end, kind: "call", value, ctx: `${owner ? owner + "." : ""}${name}`, line: lineOf(a), wrap: (k) => `t(${JSON.stringify(k)})` });
        } else {
          manual.push({ line: lineOf(a), why: `${name}() message built from parts`, text: code.slice(a.start, a.end).slice(0, 90) });
        }
      }
    },
  });

  return { code, edits, manual, ast };
}

function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const showManual = args.includes("--manual");
  const only = args.filter((a) => !a.startsWith("--"));
  const files = listFiles(only);

  const catalog = readCatalog(EN);
  const byKey = new Map(catalog.map((e) => [e.key, e]));
  const byText = new Map(); // "ns|text" -> key, so the same text in one file reuses its key
  for (const e of catalog) byText.set(`${e.key.split(".")[0]}|${e.value}`, e.key);

  // which short texts appear in 2+ files (they become shared "common." keys)
  const analysed = files.map((f) => ({ file: f, ...analyse(f) }));
  const filesWith = new Map();
  for (const a of analysed) for (const e of a.edits) if (COMMON.has(e.value)) (filesWith.get(e.value) || filesWith.set(e.value, new Set()).get(e.value)).add(a.file);

  let converted = 0;
  const report = [];
  for (const a of analysed) {
    const ns = nsFor(a.file);
    let code = a.code;
    const edits = [...a.edits].sort((x, y) => y.start - x.start);
    if (!edits.length && !(showManual && a.manual.length)) continue;

    for (const e of edits) {
      let key;
      const shared = COMMON.has(e.value) && (filesWith.get(e.value) || new Set()).size >= 2;
      const group = shared ? "common" : ns;
      const existing = byText.get(`${group}|${e.value}`);
      if (existing) key = existing;
      else {
        const base = `${group}.${slug(e.value)}`;
        key = base;
        for (let n = 2; byKey.has(key); n++) key = `${base}${n}`;
        const entry = { key, value: e.value, comment: `${e.ctx} · ${path.basename(a.file)}` };
        byKey.set(key, entry);
        catalog.push(entry);
        byText.set(`${group}|${e.value}`, key);
      }
      code = code.slice(0, e.start) + e.wrap(key) + code.slice(e.end);
      converted++;
    }

    if (edits.length && apply) {
      // add the import after the last import, with the right relative path
      const rel = path.relative(path.dirname(a.file), path.join(SRC, "i18n")).replace(/\\/g, "/");
      const importPath = rel.startsWith(".") ? rel : `./${rel}`;
      if (!/from\s+["'][./]+\/i18n["']/.test(code)) {
        const last = [...a.ast.program.body].reverse().find((n) => n.type === "ImportDeclaration");
        // positions shifted by the edits above, so find the line again in the new text
        const re = /^import[\s\S]*?from\s+["'][^"']+["'];?\s*$|^import\s+["'][^"']+["'];?\s*$/gm;
        let m, pos = 0;
        while ((m = re.exec(code))) pos = m.index + m[0].length;
        const nl = code.includes("\r\n") ? "\r\n" : "\n";
        code = code.slice(0, pos) + `${nl}import { t } from "${importPath}";` + code.slice(pos);
        void last;
      }
      fs.writeFileSync(a.file, code, "utf8");
    }
    report.push({ file: path.relative(SRC, a.file), converted: edits.length, manual: a.manual });
  }

  if (apply) writeCatalog(EN, catalog, { header: "English: the source language. New text is added here first; the other languages follow (see docs/I18N.md).\nOne entry per line, JSON-quoted. The comment after an entry says where it is shown." });

  for (const r of report) {
    console.log(`${r.file.padEnd(34)} ${String(r.converted).padStart(3)} converted, ${String(r.manual.length).padStart(3)} for hand`);
    if (showManual) for (const m of r.manual) console.log(`    ${String(m.line).padStart(4)}  [${m.why}] ${m.text.slice(0, 100)}`);
  }
  console.log(`\n${apply ? "Rewrote" : "Would convert"} ${converted} strings in ${report.filter((r) => r.converted).length} files; catalog has ${catalog.length} entries.${apply ? "" : "  (dry run: add --apply)"}`);
}

run();
