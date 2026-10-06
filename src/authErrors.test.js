import { friendlyAuthError } from "./authErrors";

describe("friendlyAuthError", () => {
  it("explains a wrong login the same way whether the e-mail exists or not", () => {
    const messages = ["auth/invalid-credential", "auth/user-not-found", "auth/wrong-password", "auth/invalid-login-credentials"].map((code) =>
      friendlyAuthError({ code })
    );
    expect(new Set(messages).size).toBe(1);
    expect(messages[0]).toMatch(/do not match/i);
    expect(messages[0]).not.toMatch(/no account|not found|incorrect password/i); // would reveal which e-mails exist
  });

  it("covers the failures people actually hit", () => {
    expect(friendlyAuthError({ code: "auth/email-already-in-use" })).toMatch(/already exists/i);
    expect(friendlyAuthError({ code: "auth/weak-password" })).toMatch(/at least 6/);
    expect(friendlyAuthError({ code: "auth/too-many-requests" })).toMatch(/wait a few minutes/i);
    expect(friendlyAuthError({ code: "auth/network-request-failed" })).toMatch(/internet connection/i);
    expect(friendlyAuthError({ code: "auth/invalid-email" })).toMatch(/valid e-mail/i);
    expect(friendlyAuthError({ code: "auth/user-disabled" })).toMatch(/disabled/i);
    expect(friendlyAuthError({ code: "permission-denied" })).toMatch(/could not save/i);
  });

  it("never shows Firebase's raw wording for an unknown error", () => {
    const text = friendlyAuthError({ code: "auth/something-new", message: "Firebase: Error (auth/something-new)." });
    expect(text).not.toMatch(/firebase/i);
    expect(friendlyAuthError({ message: "boom" }, "Login failed.")).toBe("Login failed.");
  });

  it("copes with nothing at all", () => {
    expect(friendlyAuthError(undefined)).toMatch(/something went wrong/i);
    expect(friendlyAuthError(null, "Registration failed.")).toBe("Registration failed.");
  });
});
