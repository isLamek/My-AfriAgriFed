// The checks that keep the languages honest. They run with the rest of the tests, so a
// missing translation or a sentence typed straight into a component fails the build instead
// of reaching a farmer in the wrong language.

const fs = require("fs");
const path = require("path");
const parser = require("@babel/parser");
const traverse = require("@babel/traverse").default;
const { LANGUAGES } = require("./languages");
const { CATALOGS } = require("./locales");

const SRC = path.resolve(__dirname, "..");
const en = CATALOGS.en;

const sourceFiles = (dir = SRC, out = []) => {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f);
    if (fs.statSync(p).isDirectory()) {
      if (f !== "locales" && f !== "node_modules") sourceFiles(p, out);
    } else if (/\.js$/.test(f) && !/\.test\.js$/.test(f) && f !== "setupTests.js") out.push(p);
  }
  return out;
};
const rel = (p) => path.relative(SRC, p).replace(/\\/g, "/");

const placeholders = (text) => [...String(text).matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((m) => m[1]).sort().join(",");
const PLURAL_SUFFIX = /_(zero|one|two|few|many|other)$/;

describe("the English catalog", () => {
  test("has no empty text and balanced placeholders", () => {
    const bad = Object.entries(en).filter(([, v]) => typeof v !== "string" || v.trim() === "" || (v.match(/\{/g) || []).length !== (v.match(/\}/g) || []).length);
    expect(bad.map(([k]) => k)).toEqual([]);
  });

  test("lists every key once", () => {
    const text = fs.readFileSync(path.join(__dirname, "locales/en.js"), "utf8");
    const seen = new Map();
    for (const m of text.matchAll(/^\s*"([^"]+)":/gm)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
    expect([...seen].filter(([, n]) => n > 1).map(([k]) => k)).toEqual([]);
  });

  test("every plural key comes as a pair that includes 'other'", () => {
    const bases = new Set(Object.keys(en).filter((k) => PLURAL_SUFFIX.test(k)).map((k) => k.replace(PLURAL_SUFFIX, "")));
    expect([...bases].filter((b) => !(`${b}_other` in en))).toEqual([]);
  });
});

describe("keys used in the code", () => {
  test("every literal key exists in the English catalog", () => {
    const has = (k) => k in en || ["_one", "_other", "_zero", "_few", "_many", "_two"].some((s) => `${k}${s}` in en);
    const patterns = [
      /\b(?:t|tRich)\(\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
      /\btIn\(\s*[^,()]+,\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
      /\bhasKey\(\s*[^,()]+,\s*(["'])([A-Za-z0-9_.:\- ]+)\1/g,
    ];
    const missing = [];
    for (const file of sourceFiles()) {
      const text = fs.readFileSync(file, "utf8");
      for (const rx of patterns) {
        for (const m of text.matchAll(rx)) {
          const lineStart = text.lastIndexOf("\n", m.index) + 1;
          if (/^\s*(\*|\/\/)/.test(text.slice(lineStart, m.index + 1))) continue; // inside a comment
          if (!has(m[2])) missing.push(`${m[2]}  (${rel(file)})`);
        }
      }
      for (const m of text.matchAll(/\bkey:\s*(["'])(notif\.[A-Za-z0-9_.]+)\1/g)) {
        if (!(`${m[2]}.title` in en)) missing.push(`${m[2]}.title  (${rel(file)})`);
      }
    }
    expect(missing).toEqual([]);
  });
});

// Languages that are switched on for visitors must be complete and well formed.
const live = LANGUAGES.filter((l) => l.status !== "source" && l.status !== "test");

// (describe.each refuses an empty list, so the English-only state gets its own line)
const liveCases = live.length ? live.map((l) => [l.code]) : [["(none switched on yet)"]];

describe.each(liveCases)("the %s catalog", (code) => {
  if (!live.length) {
    test("nothing to check until a language is switched on", () => expect(live).toEqual([]));
    return;
  }
  const catalog = CATALOGS[code] || {};
  const baseKeys = Object.keys(en).filter((k) => !PLURAL_SUFFIX.test(k));

  test("has a text for every English key", () => {
    const missing = baseKeys.filter((k) => !(k in catalog) && !Object.keys(catalog).some((c) => c.startsWith(`${k}_`)));
    expect(missing).toEqual([]);
  });

  test("has no keys the app does not have", () => {
    const extra = Object.keys(catalog).filter((k) => !(k in en) && !(k.replace(PLURAL_SUFFIX, "") in en) && !Object.keys(en).some((e) => e.replace(PLURAL_SUFFIX, "") === k.replace(PLURAL_SUFFIX, "")));
    expect(extra).toEqual([]);
  });

  test("keeps the same {placeholders} as English, in every text", () => {
    const wrong = [];
    for (const [k, v] of Object.entries(catalog)) {
      const english = en[k] ?? en[k.replace(PLURAL_SUFFIX, "_other")] ?? en[k.replace(PLURAL_SUFFIX, "_one")];
      if (english === undefined) continue;
      if (placeholders(v) !== placeholders(english)) wrong.push(`${k}: ${placeholders(english)} -> ${placeholders(v)}`);
    }
    expect(wrong).toEqual([]);
  });

  test("has no empty texts and none left as a to-do", () => {
    const bad = Object.entries(catalog).filter(([, v]) => typeof v !== "string" || v.trim() === "" || /^(TODO|TRANSLATE|XXX)\b/i.test(v));
    expect(bad.map(([k]) => k)).toEqual([]);
  });
});

// ---- text typed straight into components ------------------------------------------------------
// Every sentence or label a person reads must come from the catalog. This looks at the shape
// of the code: text between tags, and the usual attributes (placeholder, title, aria-label, alt).

const IGNORE_FILES = new Set([
  // admin tools and legal text stay in English by decision (see docs/I18N.md)
  "AdminDashboard.js", "AdminDelivery.js", "adminBlock.js", "AdminTestRole.js", "Legal.js", "legalContent.js",
  // not screens
  "index.js", "reportWebVitals.js",
]);
const OK_TEXT = /^(AfriAgriFed|AAF|N\$|NAD|Namibia|kg|km|mm|m\/s|°C|%|·|\|)$/;
const hasWords = (s) => /[A-Za-z]{2,}/.test(s);

// Words a JSX expression would put on the screen, looking through ?:, && and || (not into calls: t() is a call).
const textsOf = (e) => {
  if (!e) return [];
  switch (e.type) {
    case "StringLiteral":
      return [e.value];
    case "TemplateLiteral":
      return [e.quasis.map((q) => q.value.cooked).join(" ")];
    case "ConditionalExpression":
      return [...textsOf(e.consequent), ...textsOf(e.alternate)];
    case "LogicalExpression":
      return [...(e.operator === "&&" ? [] : textsOf(e.left)), ...textsOf(e.right)];
    case "ParenthesizedExpression":
      return textsOf(e.expression);
    default:
      return [];
  }
};
const readable = (s) => hasWords(s) && !OK_TEXT.test(s.trim()) && !/^(https?:|www\.|\/|#)/.test(s.trim()) && !/^[a-z]+(-[a-z0-9]+)+$/.test(s.trim()) && !/^[\w.+-]+@[\w.-]+$/.test(s.trim());

describe("text in components", () => {
  test("is read from the catalog, not typed into the markup", () => {
    const offenders = [];
    for (const file of sourceFiles()) {
      if (IGNORE_FILES.has(path.basename(file))) continue;
      const code = fs.readFileSync(file, "utf8");
      let ast;
      try {
        ast = parser.parse(code, { sourceType: "module", plugins: ["jsx"] });
      } catch {
        continue;
      }
      const add = (node, text) => offenders.push(`${rel(file)}:${node.loc.start.line}  ${text.replace(/\s+/g, " ").trim().slice(0, 70)}`);
      traverse(ast, {
        JSXText(p) {
          const text = p.node.value.replace(/\s+/g, " ").trim();
          if (text && hasWords(text) && !OK_TEXT.test(text)) add(p.node, text);
        },
        JSXAttribute(p) {
          const name = p.node.name.name;
          if (!["placeholder", "title", "aria-label", "alt", "label"].includes(name)) return;
          const v = p.node.value;
          const exprs = v && v.type === "JSXExpressionContainer" ? textsOf(v.expression) : v && v.type === "StringLiteral" ? [v.value] : [];
          for (const text of exprs) if (readable(text)) add(p.node, `${name}="${text}"`);
        },
        JSXExpressionContainer(p) {
          // {"some words"}, {cond ? "a words" : "b words"}, {`some ${x} words`} as a child
          if (p.parent.type !== "JSXElement" && p.parent.type !== "JSXFragment") return;
          for (const text of textsOf(p.node.expression)) if (readable(text)) add(p.node, text);
        },
        CallExpression(p) {
          const c = p.node.callee;
          const callee = c.type === "MemberExpression" ? `${c.object.name || ""}.${c.property.name || ""}` : c.name;
          if (!["toast.success", "toast.error", "toast", "alert", "window.alert", "window.confirm", "window.prompt", "confirm", "prompt"].includes(callee)) return;
          const a = p.node.arguments[0];
          if (a && a.type === "StringLiteral" && hasWords(a.value)) add(a, `${callee}("${a.value}")`);
          if (a && a.type === "TemplateLiteral" && hasWords(a.quasis.map((q) => q.value.cooked).join(" "))) add(a, `${callee}(\`${a.quasis[0].value.cooked}...\`)`);
          if (a && a.type === "BinaryExpression" && a.left.type === "StringLiteral" && hasWords(a.left.value)) add(a, `${callee}("${a.left.value}" + ...)`);
        },
      });
    }
    expect(offenders).toEqual([]);
  });
});
