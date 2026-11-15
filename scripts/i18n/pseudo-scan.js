// Finds text on the page that was never moved into a language file.
//
// How: in a development build, switch the site to the test language (pick "Pseudo" in
// the language picker, or run  localStorage.setItem("aaf_lang", "pseudo"); location.reload()
// in the browser console). In that language every catalog text is shown wrapped like
// "[[Save]]". So any visible text WITHOUT those brackets is still hard-coded English.
//
// Paste this whole file into the browser console on any page. It returns the offenders.
// Expect a few legitimate ones: names and text that members typed themselves, brand
// names, numbers with units. Everything else needs to be moved into the catalog.
(() => {
  const OPEN = "⟦";
  const CLOSE = "⟧";
  const SKIP = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "CODE", "PRE", "TEXTAREA"]);
  const letters = /[A-Za-zÀ-ɏ]{2,}/;
  const found = new Map();
  const note = (text, where) => {
    const key = `${where} | ${text}`;
    found.set(key, (found.get(key) || 0) + 1);
  };

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const text = node.nodeValue.replace(/\s+/g, " ").trim();
    if (!text || !letters.test(text)) continue;
    const el = node.parentElement;
    if (!el || SKIP.has(el.tagName)) continue;
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    if (el.closest("[data-i18n-ignore]")) continue;
    if (text.includes(OPEN) || text.includes(CLOSE)) continue;
    note(text.slice(0, 100), el.tagName.toLowerCase());
  }

  // text people read that lives in attributes
  for (const el of document.querySelectorAll("[placeholder],[title],[aria-label],[alt]")) {
    if (el.closest("[data-i18n-ignore]")) continue;
    for (const attr of ["placeholder", "title", "aria-label", "alt"]) {
      const value = el.getAttribute(attr);
      if (value && letters.test(value) && !value.includes(OPEN)) note(value.slice(0, 100), `${el.tagName.toLowerCase()}[${attr}]`);
    }
  }
  // option labels of <select> elements are text nodes inside <option>; hidden by display:none rules above, so check them here
  for (const opt of document.querySelectorAll("option")) {
    if (opt.closest("[data-i18n-ignore]")) continue;
    const text = opt.textContent.replace(/\s+/g, " ").trim();
    if (text && letters.test(text) && !text.includes(OPEN)) note(text.slice(0, 100), "option");
  }
  return [...found.entries()].map(([k, n]) => (n > 1 ? `${k}  x${n}` : k));
})();
