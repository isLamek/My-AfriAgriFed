// The browser's side of payments: it asks, the server decides.

jest.mock("./firebaseConfig", () => ({
  auth: {
    authStateReady: jest.fn(async () => {}),
    currentUser: { uid: "buyer1", getIdToken: jest.fn(async () => "ID-TOKEN") },
  },
}));
jest.mock("./telemetry", () => ({
  logTelemetryEvent: jest.fn(),
  TELEMETRY_EVENTS: { PAYMENT_INITIATED: "payment_initiated", PAYMENT_COMPLETED: "payment_completed" },
}));
jest.mock("react-hot-toast", () => {
  const toast = jest.fn();
  toast.error = jest.fn();
  return { __esModule: true, default: toast };
});

const toast = require("react-hot-toast").default;
const { auth } = require("./firebaseConfig");
const { logTelemetryEvent } = require("./telemetry");
const payments = require("./payments");
const { countWorkingDays: serverCount } = require("../server/checkout");
const { countWorkingDays: clientCount, promotionCost } = require("./promoPricing");

const reply = (status, body) => ({ ok: status >= 200 && status < 300, status, json: async () => body });

let originalLocation;
beforeEach(() => {
  global.fetch = jest.fn();
  originalLocation = window.location;
  delete window.location;
  window.location = { href: "https://site.test/dashboard" };
  toast.error.mockClear();
  logTelemetryEvent.mockClear();
  auth.currentUser = { uid: "buyer1", getIdToken: jest.fn(async () => "ID-TOKEN") };
});
afterEach(() => {
  window.location = originalLocation;
});

describe("starting a payment", () => {
  it("sends only WHAT to buy, with the sign-in token, and goes to Flutterwave", async () => {
    global.fetch.mockResolvedValue(reply(200, { link: "https://pay.test/abc", txRef: "aaf-1", amount: 120 }));
    await payments.startCheckout({ listingId: "L1", product: "Mahangu", sellerId: "seller1" });

    const [url, options] = global.fetch.mock.calls[0];
    expect(url).toMatch(/\/api\/payments\/initiate$/);
    expect(options.method).toBe("POST");
    expect(options.headers.Authorization).toBe("Bearer ID-TOKEN");
    expect(JSON.parse(options.body)).toEqual({ kind: "order", listingId: "L1" }); // no price, no payout account
    expect(window.location.href).toBe("https://pay.test/abc");
    expect(logTelemetryEvent).toHaveBeenCalledWith("payment_initiated", expect.objectContaining({ listingId: "L1" }));
  });

  it("sends the quantity when buying several, and only then", async () => {
    global.fetch.mockResolvedValue(reply(200, { link: "https://pay.test/abc" }));
    await payments.startCheckout({ listingId: "L1", quantity: 3 });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ kind: "order", listingId: "L1", quantity: 3 });
  });

  it("shows the server's message and stays put when the server refuses", async () => {
    global.fetch.mockResolvedValue(reply(409, { error: "seller_not_ready", message: "Sam hasn't set up payouts yet." }));
    await payments.startCheckout({ listingId: "L1" });
    expect(toast.error).toHaveBeenCalledWith("Sam hasn't set up payouts yet.");
    expect(window.location.href).toBe("https://site.test/dashboard");
  });

  it("explains when payments are not switched on", async () => {
    global.fetch.mockResolvedValue(reply(503, { error: "payments_not_ready", message: "Payments are being set up. Please try again soon." }));
    await payments.startCheckout({ listingId: "L1" });
    expect(toast.error).toHaveBeenCalledWith("Payments are being set up. Please try again soon.");
  });

  it("explains when the payment service cannot be reached", async () => {
    global.fetch.mockRejectedValue(new TypeError("Failed to fetch"));
    await payments.startCheckout({ listingId: "L1" });
    expect(toast.error).toHaveBeenCalledWith(expect.stringMatching(/could not reach the payment service/i));
  });

  it("asks a signed-out visitor to sign in without calling the server", async () => {
    auth.currentUser = null;
    await payments.startCheckout({ listingId: "L1" });
    expect(global.fetch).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Please sign in before buying.");
  });

  it("asks for a promotion by id only", async () => {
    global.fetch.mockResolvedValue(reply(200, { link: "https://pay.test/promo" }));
    await payments.startPromotionCheckout({ promotionId: "P1", description: "Promotion: Beans" });
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ kind: "promotion", promotionId: "P1" });
  });

  it("asks for a page by key and email, and throws so the paywall can show the reason", async () => {
    global.fetch.mockResolvedValue(reply(400, { error: "email_required", message: "An email address is needed for the receipt." }));
    await expect(payments.startAnonymousPageCheckout({ email: "x", pageKey: "data" })).rejects.toThrow("An email address is needed for the receipt.");
    expect(JSON.parse(global.fetch.mock.calls[0][1].body)).toEqual({ kind: "page_access", pageKey: "data", email: "x" });
  });
});

describe("confirming a payment", () => {
  it("returns what the server confirmed, and records one telemetry event", async () => {
    global.fetch.mockResolvedValue(reply(200, { verified: true, purpose: "order", orderId: "tx_555" }));
    await expect(payments.verifyAndFinalizePayment("555")).resolves.toEqual({ success: true, purpose: "order", refId: null, orderId: "tx_555" });
    expect(global.fetch.mock.calls[0][0]).toMatch(/\/api\/payments\/verify\/555$/);
    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe("Bearer ID-TOKEN");
    expect(logTelemetryEvent).toHaveBeenCalledTimes(1);
  });

  it("does not log a second completion when the page is reloaded", async () => {
    global.fetch.mockResolvedValue(reply(200, { verified: true, purpose: "order", orderId: "tx_555", already: true }));
    await payments.verifyAndFinalizePayment("555");
    expect(logTelemetryEvent).not.toHaveBeenCalled();
  });

  it("reports failure with the server's reason", async () => {
    global.fetch.mockResolvedValue(reply(200, { verified: false, reason: "amount_mismatch" }));
    await expect(payments.verifyAndFinalizePayment("556")).resolves.toMatchObject({ success: false });
    global.fetch.mockResolvedValue(reply(403, { error: "not_yours", message: "That payment belongs to someone else." }));
    await expect(payments.verifyAndFinalizePayment("557")).resolves.toEqual({ success: false, message: "That payment belongs to someone else." });
  });

  it("waits for the session to be restored after Flutterwave redirects back", async () => {
    let restored = false;
    auth.authStateReady.mockImplementationOnce(async () => {
      await new Promise((r) => setTimeout(r, 10));
      restored = true;
    });
    global.fetch.mockImplementation(async () => {
      expect(restored).toBe(true); // never called before the sign-in is known
      return reply(200, { verified: true, purpose: "order" });
    });
    await payments.verifyAndFinalizePayment("558");
  });
});

describe("the promotion price preview matches what the server will charge", () => {
  const ranges = [
    ["2026-10-05", "2026-10-09"], ["2026-10-05", "2026-10-11"], ["2026-10-03", "2026-10-04"],
    ["2026-10-02", "2026-10-05"], ["2026-12-24", "2027-01-05"], ["2028-02-26", "2028-03-02"], // across a leap day
    ["2026-10-09", "2026-10-05"], ["", "2026-10-05"], ["2026-13-45", "2026-10-05"],
  ];
  it.each(ranges)("%s to %s", (a, b) => {
    expect(clientCount(a, b)).toBe(serverCount(a, b));
  });
  it("is N$30 a working day", () => expect(promotionCost("2026-10-05", "2026-10-09")).toBe(150));
});
