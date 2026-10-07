import { normalizeUsername, profileTextProblem, publicRole, starterCard, usernameProblem } from "./publicProfile";

jest.mock("./firebaseConfig", () => ({ db: {} }));

describe("usernames", () => {
  it("lower-cases and drops a leading @", () => {
    expect(normalizeUsername("  @Ndapewa_Farms ")).toBe("ndapewa_farms");
  });

  it.each(["ndapewa", "bea_greens", "farm2026"])("accepts %s", (name) => expect(usernameProblem(name)).toBeNull());

  it("is optional", () => expect(usernameProblem("")).toBeNull());

  it.each([
    ["ab", /3 to 20/],
    ["has space", /3 to 20/],
    ["way_too_long_for_a_username", /3 to 20/],
    ["admin", /reserved/],
    ["12345", /at least one letter/],
  ])("refuses %s", (name, why) => expect(usernameProblem(name)).toMatch(why));
});

describe("public text", () => {
  it("needs a name", () => expect(profileTextProblem({ displayName: "  ", bio: "" })).toMatch(/name/));

  it("allows a normal bio", () =>
    expect(profileTextProblem({ displayName: "Bea", bio: "Mahangu and beans, Oshana. Delivery by 2026-10-07 10:00." })).toBeNull());

  it.each(["call 081 234 5678", "bea@gmail.com", "see www.example.com"])("refuses contact details: %s", (bio) =>
    expect(profileTextProblem({ displayName: "Bea", bio })).toMatch(/Messages/)
  );

  it("refuses a bio over 160 characters", () =>
    expect(profileTextProblem({ displayName: "Bea", bio: "x".repeat(161) })).toMatch(/160/));
});

describe("role shown to members", () => {
  it("follows the private account", () => {
    expect(publicRole({ userType: "farmer" })).toBe("farmer");
    expect(publicRole({ userType: "institution" })).toBe("institution");
    expect(publicRole({ userType: "consumer" })).toBe("consumer");
    expect(publicRole({ userType: "consumer", questionnaireData: { consumerType: "Retailer" } })).toBe("organization");
    expect(publicRole({ userType: "consumer", isOrganization: true })).toBe("organization");
    expect(publicRole({ userType: "farmer" }, true)).toBe("admin");
  });
});

describe("first card from sign-up details", () => {
  const user = { uid: "u1", email: "nd@aaf.test", metadata: { creationTime: "2026-10-01T10:00:00Z" } };

  it("uses the business name for organisations and the region they gave", () => {
    const card = starterCard(user, { userType: "consumer", questionnaireData: { consumerType: "Retailer", businessName: "Oshakati Fresh", region: "Oshana" } }, false);
    expect(card).toMatchObject({ displayName: "Oshakati Fresh", role: "organization", region: "Oshana", username: "" });
    expect(card.memberSince).toMatch(/2026/);
  });

  it("never copies contact details onto the public card", () => {
    const card = starterCard(user, { userType: "farmer", personalInfo: { firstName: "call", lastName: "0812345678" } }, false);
    expect(card.displayName).toBe("Member");
  });

  it("only keeps photos from the upload service", () => {
    expect(starterCard(user, { userType: "farmer", profilePicture: { url: "https://evil.example/a.jpg" } }).photoURL).toBe("");
    expect(starterCard(user, { userType: "farmer", profilePicture: { url: "https://res.cloudinary.com/x/a.jpg" } }).photoURL).toMatch(/cloudinary/);
  });
});
