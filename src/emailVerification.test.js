jest.mock("firebase/auth", () => ({ sendEmailVerification: jest.fn() }));

const { sendEmailVerification } = require("firebase/auth");
const { RESEND_COOLDOWN_MS, checkVerified, cooldownLeftMs, needsVerification, sendVerification } = require("./emailVerification");

const user = (over = {}) => ({ uid: "u1", email: "a@example.com", emailVerified: false, isAnonymous: false, ...over });

beforeEach(() => {
  localStorage.clear();
  sendEmailVerification.mockReset();
  sendEmailVerification.mockResolvedValue(undefined);
});

describe("needsVerification", () => {
  it("is true only for a real account with an unverified e-mail", () => {
    expect(needsVerification(user())).toBe(true);
    expect(needsVerification(user({ emailVerified: true }))).toBe(false);
    expect(needsVerification(user({ isAnonymous: true }))).toBe(false);
    expect(needsVerification(user({ email: "" }))).toBe(false);
    expect(needsVerification(null)).toBe(false);
  });
});

describe("cooldownLeftMs", () => {
  it("counts down from the last send", () => {
    expect(cooldownLeftMs(0, 1000)).toBe(0);
    expect(cooldownLeftMs(1000, 1000)).toBe(RESEND_COOLDOWN_MS);
    expect(cooldownLeftMs(1000, 1000 + 20000)).toBe(RESEND_COOLDOWN_MS - 20000);
    expect(cooldownLeftMs(1000, 1000 + RESEND_COOLDOWN_MS + 1)).toBe(0);
  });
});

describe("sendVerification", () => {
  it("sends once, then asks the person to wait", async () => {
    const u = user();
    expect(await sendVerification(u, 5000)).toEqual({ sent: true });
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);

    const again = await sendVerification(u, 5000 + 10000);
    expect(again).toEqual({ sent: false, waitMs: RESEND_COOLDOWN_MS - 10000 });
    expect(sendEmailVerification).toHaveBeenCalledTimes(1);

    expect(await sendVerification(u, 5000 + RESEND_COOLDOWN_MS)).toEqual({ sent: true });
    expect(sendEmailVerification).toHaveBeenCalledTimes(2);
  });

  it("does nothing for an account that is already verified or anonymous", async () => {
    expect((await sendVerification(user({ emailVerified: true }))).sent).toBe(false);
    expect((await sendVerification(user({ isAnonymous: true }))).sent).toBe(false);
    expect(sendEmailVerification).not.toHaveBeenCalled();
  });

  it("explains a rate limit and any other failure in plain words, and never throws", async () => {
    sendEmailVerification.mockRejectedValueOnce({ code: "auth/too-many-requests" });
    expect((await sendVerification(user())).error).toMatch(/too many requests/i);
    sendEmailVerification.mockRejectedValueOnce(new Error("network down"));
    expect((await sendVerification(user({ uid: "u2" }))).error).toMatch(/could not send/i);
  });

  it("does not count a failed send against the cooldown", async () => {
    sendEmailVerification.mockRejectedValueOnce(new Error("boom"));
    await sendVerification(user(), 1000);
    expect(await sendVerification(user(), 1001)).toEqual({ sent: true });
  });
});

describe("checkVerified", () => {
  it("refreshes the sign-in token once the e-mail is verified", async () => {
    const u = { reload: jest.fn(async () => { u.emailVerified = true; }), getIdToken: jest.fn(async () => "t"), emailVerified: false };
    expect(await checkVerified(u)).toBe(true);
    expect(u.reload).toHaveBeenCalled();
    expect(u.getIdToken).toHaveBeenCalledWith(true); // force a new token so the rules see the flag
  });

  it("says no, without touching the token, while still unverified", async () => {
    const u = { reload: jest.fn(async () => {}), getIdToken: jest.fn(), emailVerified: false };
    expect(await checkVerified(u)).toBe(false);
    expect(u.getIdToken).not.toHaveBeenCalled();
  });

  it("copes with nobody signed in and with network errors", async () => {
    expect(await checkVerified(null)).toBe(false);
    expect(await checkVerified({ reload: jest.fn(async () => { throw new Error("offline"); }) })).toBe(false);
  });
});
