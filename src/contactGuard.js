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

import { t, joinOr } from "./i18n";

// A phone number is a long run of digits, possibly written with spaces, dashes,
// dots, brackets or a leading +. Namibian numbers have 9 to 12 digits
// (061 123456, 081 123 4567, +264 81 123 4567). Dates (2026-10-15 = 8 digits),
// prices and quantities are shorter, so 9+ digits is the line. A run that
// runs into a time ("2026-10-07 10:00") is a date, not a number, so a run
// followed by ":" does not count.
const PHONE = /(?:\+|\b00)?\(?\d(?:[\s().\-/]{0,2}\d){8,}(?![\d:])/g;
// The same rule written for the server (RE2 syntax, whole-string match).
export const SERVER_PHONE_PATTERN = "[0-9]([ ().+/-]{0,2}[0-9]){8,}([^0-9:]|$)";

const EMAIL = /[A-Za-z0-9._%+-]+\s*(?:@|\(at\)|\[at\]|\sat\s)\s*[A-Za-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\]|\sdot\s)\s*[A-Za-z0-9-]+)+/gi;
const URL = /\b(?:https?:\/\/|www\.)\S+|\b[a-z0-9-]+\.(?:com|na|net|org|io|co|me|info|biz|app|link|ly|store|shop)\b(?:\/\S*)?/gi;
const MESSENGER = /\b(?:wa\.me|whatsapp|whats\s?app|watsapp|telegram|t\.me|signal\s+me|imo|facebook\.com|fb\.me|instagram|insta)\b/gi;
// "zero eight one one two three ..." : seven or more number words in a row. Spelling a number
// out is the obvious way round the digit check, so each language the site is shown in needs its
// own number words here (English; Afrikaans: nul een twee drie vier vyf ses sewe agt nege).
const NUMBER_WORDS = /\b(?:(?:zero|oh|one|two|three|four|five|six|seven|eight|nine|nul|een|twee|drie|vier|vyf|ses|sewe|agt|nege)[\s,.-]*){7,}/gi;
// Bank details are the other half of paying outside: "account no 6201...", IBAN-like runs.
// Afrikaans: rekeningnommer (account number), bankbesonderhede (bank details), e-beursie (e-wallet).
const BANK = /\b(?:acc(?:ount)?\.?\s*(?:no|number|#)|bank\s+details|ewallet|e-wallet|blue\s*wallet|easy\s*wallet|pay\s*to\s*cell|fnb\s+ewallet|rekening\s*(?:nommer|no)|bankbesonderhede|e-?beursie)\b/gi;

const RULES = [
  { type: "phone", pattern: PHONE },
  { type: "email", pattern: EMAIL },
  { type: "link", pattern: URL },
  { type: "messenger", pattern: MESSENGER },
  { type: "phone", pattern: NUMBER_WORDS },
  { type: "payment", pattern: BANK },
];

const LABEL_KEYS = {
  phone: "contactGuard.labelPhone",
  email: "contactGuard.labelEmail",
  link: "contactGuard.labelLink",
  messenger: "contactGuard.labelMessenger",
  payment: "contactGuard.labelPayment",
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
    out = out.replace(pattern, type === "phone" ? t("contactGuard.numberHidden") : t("contactGuard.contactHidden"));
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
  const kinds = [...new Set(found.map((f) => f.type))].map((type) => t(LABEL_KEYS[type]));
  const list = joinOr(kinds);
  return {
    ok: false,
    found,
    message: t("contactGuard.notAllowed", { list }),
  };
}

/** The notice at the top of a conversation, in the reader's language. */
export const chatNotice = () => t("contactGuard.chatNotice");
