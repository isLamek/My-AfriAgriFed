// Keeps conversations and payments on AfriAgriFed.
//
// Most "pay outside the app" happens when people swap phone numbers, e-mails,
// WhatsApp links or bank details in chat. This finds those, so messages that
// contain them can be stopped before they are sent, and anything already
// written can be shown with the details hidden.
//
// The database rules apply a simpler version of the same check on the server
// (firestore.rules, database.rules.json), so a modified app cannot get round it.
// Keep the two in step: see SERVER_PHONE_PATTERN below and the rule files.

// A phone number is a long run of digits, possibly written with spaces, dashes,
// dots, brackets or a leading +. Namibian numbers have 9 to 12 digits
// (061 123456, 081 123 4567, +264 81 123 4567). Dates (2026-10-15 = 8 digits),
// prices and quantities are shorter, so 9+ digits is the line.
const PHONE = /(?:\+|\b00)?\(?\d(?:[\s().\-/]{0,2}\d){8,}/g;
// The same rule written for the server (RE2 syntax, whole-string match).
export const SERVER_PHONE_PATTERN = "[0-9]([ ().+/-]{0,2}[0-9]){8,}";

const EMAIL = /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Za-z0-9-]+)+/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|na|net|org|io|co|me|info|biz|app|link|ly|store|shop)\b(?:\/\S*)?/gi;
const MESSENGER = /\b(?:wa\.me|whatsapp|whats\s?app|watsapp|telegram|t\.me|signal\s+me|imo|facebook\.com|fb\.me|instagram|insta)\b/gi;
// "zero eight one one two three ..." : seven or more number words in a row.
const NUMBER_WORDS = /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine)[\s,.-]*){7,}/gi;
// Bank details are the other half of paying outside: "account no 6201...", IBAN-like runs.
const BANK = /\b(?:acc(?:ount)?\.?\s*(?:no|number|#)|bank\s+details|ewallet|e-wallet|blue\s*wallet|easy\s*wallet|pay\s*to\s*cell|fnb\s+ewallet)\b/gi;

const RULES = [
  { type: "phone", pattern: PHONE },
  { type: "email", pattern: EMAIL },
  { type: "link", pattern: URL },
  { type: "messenger", pattern: MESSENGER },
  { type: "phone", pattern: NUMBER_WORDS },
  { type: "payment", pattern: BANK },
];

const LABELS = {
  phone: "phone numbers",
  email: "e-mail addresses",
  link: "links",
  messenger: "WhatsApp, Telegram or social media contacts",
  payment: "bank or e-wallet details",
};

/** Every piece of contact or off-platform payment detail in a text. */
export function findContactInfo(text) {
  const found = [];
  const source = String(text || "");
  for (const { type, pattern } of RULES) {
    pattern.lastIndex = 0;
    for (const match of source.matchAll(pattern)) {
      const start = match.index;
      const end = start + match[0].length;
      // "seller@gmail.com" is one e-mail, not also a link to gmail.com.
      if (found.some((f) => start >= f.index && end <= f.index + f.text.length)) continue;
      found.push({ type, text: match[0], index: start });
    }
  }
  return found;
}

/** The same text with contact details replaced, for showing older content safely. */
export function maskContactInfo(text) {
  let out = String(text || "");
  for (const { type, pattern } of RULES) {
    pattern.lastIndex = 0;
    out = out.replace(pattern, type === "phone" ? "[number hidden]" : "[contact hidden]");
  }
  return out;
}

/**
 * Should this message be allowed? Returns { ok: true } or
 * { ok: false, message } with a plain explanation of what to remove.
 */
export function checkForContactInfo(text) {
  const found = findContactInfo(text);
  if (found.length === 0) return { ok: true };
  const kinds = [...new Set(found.map((f) => f.type))].map((t) => LABELS[t]);
  const list = kinds.length === 1 ? kinds[0] : `${kinds.slice(0, -1).join(", ")} or ${kinds[kinds.length - 1]}`;
  return {
    ok: false,
    found,
    message: `For your safety, ${list} can't be shared here. Keep the conversation and the payment on AfriAgriFed so your order stays protected.`,
  };
}

export const CHAT_NOTICE =
  "For your security, phone numbers, e-mails and links are hidden. Chat and pay here so your order is protected.";
