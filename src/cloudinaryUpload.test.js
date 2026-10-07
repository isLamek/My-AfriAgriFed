// Upload routing: signed through the backend when it answers, unsigned
// straight to Cloudinary when it does not (or when there is no backend).

const ENV = { ...process.env };
const realFetch = global.fetch;

afterEach(() => {
  process.env = { ...ENV };
  global.fetch = realFetch;
});

function load({ nodeEnv = "production", api, cloudName, preset } = {}) {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;
  const setOrDelete = (key, value) => (value === undefined ? delete process.env[key] : (process.env[key] = value));
  setOrDelete("REACT_APP_API_URL", api);
  setOrDelete("REACT_APP_CLOUDINARY_CLOUD_NAME", cloudName);
  setOrDelete("REACT_APP_CLOUDINARY_UPLOAD_PRESET", preset);
  return require("./cloudinaryUpload");
}

const photo = { name: "maize.jpg", type: "image/jpeg", size: 2000 };
const pdf = { name: "id.pdf", type: "application/pdf", size: 2000 };
const ok = (body) => Promise.resolve({ ok: true, json: () => Promise.resolve(body) });
const fail = (status, body) => Promise.resolve({ ok: false, status, json: () => Promise.resolve(body) });
const formEntries = (init) => Object.fromEntries(init.body.entries());

describe("checkFile", () => {
  const { checkFile } = load();

  it("accepts photos and documents of the right type and size", () => {
    expect(() => checkFile(photo, "image")).not.toThrow();
    expect(() => checkFile(pdf, "document")).not.toThrow();
  });

  it("refuses a PDF where a photo is expected, and oversized files", () => {
    expect(() => checkFile(pdf, "image")).toThrow(/isn't supported/);
    expect(() => checkFile({ ...photo, size: 50 * 1024 * 1024 }, "image")).toThrow(/larger than 10 MB/);
  });

  it("asks for a file when there is none", () => {
    expect(() => checkFile(null)).toThrow(/choose a file/i);
  });
});

describe("cleanFolder", () => {
  it("keeps only safe folder characters", () => {
    const { cleanFolder } = load();
    expect(cleanFolder("afriagrifed/users/abc123/profile")).toBe("afriagrifed/users/abc123/profile");
    expect(cleanFolder("../evil folder?x=1")).toBe("evilfolderx1");
    expect(cleanFolder("")).toBe("uploads");
  });
});

describe("uploadToCloudinary", () => {
  it("uploads unsigned with the preset when there is no backend (the live site today)", async () => {
    const { uploadToCloudinary, uploadsConfigured } = load({ cloudName: "demo", preset: "aaf_unsigned" });
    global.fetch = jest.fn(() => ok({ secure_url: "https://res.cloudinary.com/demo/x.jpg" }));

    expect(uploadsConfigured()).toBe(true);
    const result = await uploadToCloudinary(photo, "marketplace");

    expect(result.secure_url).toMatch(/^https:\/\/res\.cloudinary\.com\//);
    const [url, init] = global.fetch.mock.calls[0];
    expect(url).toBe("https://api.cloudinary.com/v1_1/demo/image/upload");
    expect(formEntries(init)).toMatchObject({ upload_preset: "aaf_unsigned", folder: "marketplace" });
  });

  it("signs through the backend when one is configured", async () => {
    const { uploadToCloudinary } = load({ api: "https://api.example.test", cloudName: "demo", preset: "aaf_unsigned" });
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => ok({ timestamp: 1, signature: "sig", apiKey: "key", cloudName: "signedcloud" }))
      .mockImplementationOnce(() => ok({ secure_url: "https://res.cloudinary.com/signedcloud/x.pdf" }));

    await uploadToCloudinary(pdf, "docs", { kind: "document" });

    expect(global.fetch.mock.calls[0][0]).toBe("https://api.example.test/api/cloudinary-signature?folder=docs");
    const [url, init] = global.fetch.mock.calls[1];
    expect(url).toBe("https://api.cloudinary.com/v1_1/signedcloud/auto/upload");
    expect(formEntries(init)).toMatchObject({ signature: "sig", api_key: "key", folder: "docs" });
    expect(formEntries(init).upload_preset).toBeUndefined();
  });

  it("falls back to the unsigned preset when the backend cannot be reached", async () => {
    const { uploadToCloudinary } = load({ api: "https://api.example.test", cloudName: "demo", preset: "aaf_unsigned" });
    global.fetch = jest
      .fn()
      .mockImplementationOnce(() => Promise.reject(new TypeError("Failed to fetch")))
      .mockImplementationOnce(() => ok({ secure_url: "https://res.cloudinary.com/demo/x.jpg" }));

    await expect(uploadToCloudinary(photo, "posts")).resolves.toMatchObject({ secure_url: expect.any(String) });
    expect(formEntries(global.fetch.mock.calls[1][1]).upload_preset).toBe("aaf_unsigned");
  });

  it("says the feature is being set up when the backend is down and there is no preset", async () => {
    const { uploadToCloudinary } = load({ api: "https://api.example.test" });
    global.fetch = jest.fn(() => fail(503, {}));
    await expect(uploadToCloudinary(photo)).rejects.toThrow(/being set up/i);
  });

  it("turns a missing preset into a plain message", async () => {
    const { uploadToCloudinary } = load({ cloudName: "demo", preset: "wrong" });
    global.fetch = jest.fn(() => fail(400, { error: { message: "Upload preset not found" } }));
    await expect(uploadToCloudinary(photo)).rejects.toThrow(/upload preset is missing or not unsigned/);
  });

  it("turns a wrong cloud name into a plain message", async () => {
    const { uploadToCloudinary } = load({ cloudName: "your-cloud-name", preset: "aaf_unsigned" });
    global.fetch = jest.fn(() => fail(401, { error: { message: "cloud_name is disabled" } }));
    await expect(uploadToCloudinary(photo)).rejects.toThrow(/cloud name is wrong/);
  });
});
