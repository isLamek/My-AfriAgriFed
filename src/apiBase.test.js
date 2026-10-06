// Where the backend is, per environment. Read at load time, so each case loads a fresh copy.

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

function load({ nodeEnv, url }) {
  jest.resetModules();
  process.env.NODE_ENV = nodeEnv;
  if (url === undefined) delete process.env.REACT_APP_API_URL;
  else process.env.REACT_APP_API_URL = url;
  return require("./apiBase");
}

describe("API_BASE_URL", () => {
  it("uses the local backend in development when nothing is set", () => {
    const api = load({ nodeEnv: "development" });
    expect(api.API_BASE_URL).toBe("http://localhost:5000");
    expect(api.backendConfigured()).toBe(true);
  });

  it("has NO backend in a live build when nothing is set, instead of pointing visitors at localhost", () => {
    const api = load({ nodeEnv: "production" });
    expect(api.API_BASE_URL).toBe("");
    expect(api.backendConfigured()).toBe(false);
    expect(api.NO_BACKEND_MESSAGE).toMatch(/being set up/i);
  });

  it("treats a blank setting the same as no setting", () => {
    expect(load({ nodeEnv: "production", url: "   " }).API_BASE_URL).toBe("");
  });

  it("uses the configured address, without trailing slashes, in any environment", () => {
    expect(load({ nodeEnv: "production", url: "https://api.example.test//" }).API_BASE_URL).toBe("https://api.example.test");
    expect(load({ nodeEnv: "development", url: "https://api.example.test" }).API_BASE_URL).toBe("https://api.example.test");
  });
});

describe("things that need the backend say so when there is none", () => {
  it("uploads refuse with a plain message", async () => {
    load({ nodeEnv: "production" });
    const { uploadToCloudinary } = require("./cloudinairyUpload");
    await expect(uploadToCloudinary({ name: "x.png" })).rejects.toThrow(/being set up/i);
  });
});
