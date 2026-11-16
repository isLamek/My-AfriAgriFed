import { countUnread, isUnread, toMillis } from "./unread";

const at = (ms) => ({ toMillis: () => ms });
const thread = (extra) => ({ participants: ["me", "you"], lastMessageAt: at(1000), lastSenderId: "you", readAt: {}, ...extra });

describe("unread conversations", () => {
  it("reads a Firestore timestamp or a plain number, and nothing else", () => {
    expect(toMillis(at(5))).toBe(5);
    expect(toMillis(7)).toBe(7);
    expect(toMillis(undefined)).toBe(0);
  });

  it("is unread when the other person wrote after the last time I opened it", () => {
    expect(isUnread(thread(), "me")).toBe(true);
    expect(isUnread(thread({ readAt: { me: at(999) } }), "me")).toBe(true);
    expect(isUnread(thread({ readAt: { me: at(1000) } }), "me")).toBe(false);
    expect(isUnread(thread({ readAt: { me: at(2000) } }), "me")).toBe(false);
  });

  it("never counts my own message, or a thread with no messages yet", () => {
    expect(isUnread(thread({ lastSenderId: "me" }), "me")).toBe(false);
    expect(isUnread({ participants: ["me", "you"] }, "me")).toBe(false);
  });

  it("counts threads, not messages", () => {
    const list = [thread(), thread({ readAt: { me: at(5000) } }), thread({ lastSenderId: "me" }), thread({ id: "d" })];
    expect(countUnread(list, "me")).toBe(2);
    expect(countUnread([], "me")).toBe(0);
    expect(countUnread(undefined, "me")).toBe(0);
  });
});
