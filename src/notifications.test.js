jest.mock("firebase/firestore", () => ({ addDoc: jest.fn(), collection: jest.fn(), serverTimestamp: jest.fn() }));
jest.mock("./firebaseConfig", () => ({ db: {} }));

const { addDoc, collection, serverTimestamp } = require("firebase/firestore");
const { MAX_BODY, MAX_TITLE, notifyUser } = require("./notifications");

// This project's Jest config resets mock behaviour before every test, so it is set up here.
beforeEach(() => {
  addDoc.mockResolvedValue({});
  collection.mockImplementation((db, name) => name);
  serverTimestamp.mockReturnValue("SERVER_TIME");
});

describe("notifyUser", () => {
  it("writes exactly the fields the security rules allow", async () => {
    await notifyUser("u1", { title: "New order", body: "Paid.", link: "/track-orders" });
    expect(addDoc).toHaveBeenCalledWith("notifications", {
      userId: "u1",
      title: "New order",
      body: "Paid.",
      link: "/track-orders",
      read: false,
      createdAt: "SERVER_TIME",
    });
  });

  it("trims over-long text to the limits the rules enforce, instead of failing", async () => {
    await notifyUser("u1", { title: "T".repeat(500), body: "b".repeat(2000) });
    const sent = addDoc.mock.calls[0][1];
    expect(sent.title.length).toBeLessThanOrEqual(MAX_TITLE);
    expect(sent.body.length).toBeLessThanOrEqual(MAX_BODY);
    expect(sent.body.endsWith("…")).toBe(true);
  });

  it("leaves short text alone and defaults the link", async () => {
    await notifyUser("u1", { title: "Hi" });
    expect(addDoc.mock.calls[0][1]).toMatchObject({ title: "Hi", body: "", link: "/" });
  });

  it("sends nothing without a recipient or a title", async () => {
    await notifyUser("", { title: "x" });
    await notifyUser("u1", { title: "" });
    expect(addDoc).not.toHaveBeenCalled();
  });

  it("never throws if the database refuses", async () => {
    addDoc.mockRejectedValueOnce(new Error("permission-denied"));
    const warn = jest.spyOn(console, "warn").mockImplementation(() => {});
    await expect(notifyUser("u1", { title: "x" })).resolves.toBeUndefined();
    warn.mockRestore();
  });
});
