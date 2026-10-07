import { SERVER_PHONE_PATTERN, checkForContactInfo, findContactInfo, maskContactInfo } from "./contactGuard";

const blocked = (text) => checkForContactInfo(text).ok === false;

describe("phone numbers", () => {
  it.each([
    "call me on 0811234567",
    "081 123 4567",
    "081-123-4567",
    "+264 81 123 4567",
    "+264811234567",
    "00264 81 123 4567",
    "(061) 123 456",
    "my number is 081.123.4567 ok",
    "zero eight one one two three four five six seven",
  ])("blocks %s", (text) => expect(blocked(text)).toBe(true));

  it.each([
    "I need 1200 kg by Friday",
    "Price is N$ 1,500.00 per tonne",
    "Deliver on 2026-10-15 please",
    "Order tx_555 ref 12345678",
    "Can you do 300 bags at N$18?",
    "25/12/2026",
  ])("allows %s", (text) => expect(blocked(text)).toBe(false));
});

describe("e-mails, links and messengers", () => {
  it.each([
    "email me at seller@gmail.com",
    "seller (at) gmail (dot) com",
    "write to seller at gmail dot com",
    "see www.myfarm.com",
    "https://example.org/pay",
    "visit myfarm.na for prices",
    "wa.me/264811234567",
    "add me on WhatsApp",
    "find me on telegram",
    "pay to my FNB eWallet",
    "send it to account no 6201 please",
  ])("blocks %s", (text) => expect(blocked(text)).toBe(true));

  it.each([
    "Is the mahangu still available?",
    "I can collect at Oshakati market on Saturday.",
    "Thank you, payment done on the app.",
    "The goats are 2 years old.",
  ])("allows %s", (text) => expect(blocked(text)).toBe(false));
});

describe("messages and masking", () => {
  it("names what was found in plain words", () => {
    const result = checkForContactInfo("call 0811234567 or seller@gmail.com");
    expect(result.message).toMatch(/phone numbers or e-mail addresses can't be shared here/);
    expect(result.message).toMatch(/protected/);
  });

  it("hides details in older content but keeps the rest", () => {
    expect(maskContactInfo("Fresh tomatoes, call 081 123 4567 or email a@b.com")).toBe(
      "Fresh tomatoes, call [number hidden] or email [contact hidden]"
    );
    expect(maskContactInfo("Nothing to hide here")).toBe("Nothing to hide here");
    expect(maskContactInfo(undefined)).toBe("");
  });

  it("reports each finding with its type", () => {
    expect(findContactInfo("081 123 4567").map((f) => f.type)).toEqual(["phone"]);
    expect(findContactInfo("")).toEqual([]);
  });
});

describe("the server's simpler rule agrees on the common cases", () => {
  // firestore.rules and database.rules.json use this pattern (whole-string match there).
  const server = new RegExp(`^(?:.*${SERVER_PHONE_PATTERN}.*)$`, "s");
  it.each(["0811234567", "081 123 4567", "+264 81 123 4567", "call (061) 123 456 now"])("server also blocks %s", (t) =>
    expect(server.test(t)).toBe(true)
  );
  it.each(["1200 kg", "2026-10-15", "N$ 1,500.00", "Order 12345678"])("server also allows %s", (t) =>
    expect(server.test(t)).toBe(false)
  );
});
