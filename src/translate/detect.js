// Guesses whether a piece of text is English or Afrikaans, from how many very common
// words of each it contains. Deliberately modest: it says "I don't know" (null) for short
// text, for Oshiwambo, Otjiherero and anything else, instead of guessing wrongly and
// sending the text to a translator that cannot read it.

const EN = new Set(
  "the and is are was were to of in for with on that this it you we have has will from at be not can our your they but or if as by an all do does".split(" ")
);
const AF = new Set(
  "die en is nie van vir het ek jy ons dit om te met op wat sal kan ook maar my jou daar hier by aan na dat nou so wees was hulle julle gaan moet word".split(" ")
);
// words that exist in both languages and say nothing
const SHARED = new Set(["is", "was", "my", "as", "en", "so", "by", "na", "te", "op", "om"]);

const words = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[‘’]/g, "'")
    .match(/['a-zàâçéèêëîïôûùüÿ]+/g) || [];

/** "en", "af" or null when it cannot tell. */
export function detectLanguage(text) {
  const tokens = words(text);
  if (tokens.length < 4) return null;
  let en = 0;
  let af = 0;
  for (const w of tokens) {
    if (w === "'n") af += 2; // the Afrikaans article is a very strong sign
    if (SHARED.has(w)) continue;
    if (EN.has(w)) en += 1;
    if (AF.has(w)) af += 1;
  }
  const strongest = Math.max(en, af);
  if (strongest < 2) return null;
  if (strongest / tokens.length < 0.12) return null;
  if (en >= af * 2) return "en";
  if (af >= en * 2) return "af";
  return null;
}
