require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;
const path = require("path");
const { TtlCache } = require("./server/ttlCache");
const { rateLimit } = require("./server/rateLimit");
const weather = require("./server/weather");
const fires = require("./server/fires");
const checkout = require("./server/checkout");
const { initAdmin } = require("./server/firebaseAdmin");

const app = express();

// Behind a host's load balancer (Render, Railway, Fly) the real visitor IP is in
// X-Forwarded-For; set TRUST_PROXY=1 there so rate limiting sees each visitor.
if (process.env.TRUST_PROXY) app.set("trust proxy", Number(process.env.TRUST_PROXY) || 1);

// CORS_ORIGINS="https://your-site.web.app,https://your-domain.com" locks the API
// to your own website. Left empty it allows any origin (fine for local development).
const allowedOrigins = (process.env.CORS_ORIGINS || "").split(",").map((o) => o.trim()).filter(Boolean);
app.use(
  cors(
    allowedOrigins.length
      ? { origin: (origin, done) => done(null, !origin || allowedOrigins.includes(origin)) }
      : undefined
  )
);
app.use(express.json());

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FLW_SECRET_KEY,
  FLW_SECRET_HASH,
  PLATFORM_COMMISSION_RATE,
  APP_BASE_URL,
  OPEN_METEO_API_KEY,
  FIRMS_MAP_KEY,
  PORT
} = process.env;

const commissionRate = Number(PLATFORM_COMMISSION_RATE) || 0.05;
const appBaseUrl = APP_BASE_URL || "http://localhost:3000";

// Signed uploads are optional: without these three keys the site uploads
// with the unsigned preset instead (REACT_APP_CLOUDINARY_UPLOAD_PRESET), so
// the weather, fire and payment services still start.
const signedUploads = !!(CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET);
if (signedUploads) {
  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET
  });
} else {
  console.warn("Cloudinary API key/secret not set: signed uploads are off; the site uses the unsigned preset.");
}

app.get("/api/cloudinary-signature", rateLimit({ windowMs: 60000, max: 30 }), (req, res) => {
  // 503 tells the site to fall back to its unsigned upload preset.
  if (!signedUploads) return res.status(503).json({ error: "Signed uploads are not configured" });
  try {
    const folder = req.query.folder || "posts";
    const timestamp = Math.round(Date.now() / 1000);

    // IMPORTANT: every param you sign here must also be sent in the
    // upload FormData on the client (and vice versa), otherwise
    // Cloudinary returns "Invalid Signature".
    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder },
      CLOUDINARY_API_SECRET
    );

    res.json({
      timestamp,
      signature,
      apiKey: CLOUDINARY_API_KEY,
      cloudName: CLOUDINARY_CLOUD_NAME
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: "Failed to generate signature"
    });
  }
});

/*
==================================
ONLINE PAYMENTS (Flutterwave, split by commission)
The server is the only authority on prices, payouts and orders: the browser
asks to pay for a listing / promotion / page, and this server prices it,
verifies who is asking (Firebase sign-in), and records the result once
Flutterwave confirms it. See server/checkout.js and docs/SETUP_GUIDE.pdf.
Needs FLW_SECRET_KEY and Firebase admin credentials; without both it refuses
to start any payment rather than take money it cannot record.
==================================
*/
const firebaseAdmin = initAdmin(process.env);
if (!firebaseAdmin) {
  console.warn(
    "Firebase admin credentials not set (FIREBASE_SERVICE_ACCOUNT_JSON): payments are switched OFF until they are."
  );
}

checkout.register(app, {
  store: firebaseAdmin && firebaseAdmin.store,
  verifyToken: firebaseAdmin && firebaseAdmin.verifyToken,
  secretKey: FLW_SECRET_KEY || "",
  secretHash: FLW_SECRET_HASH || "",
  commissionRate,
  appBaseUrl,
  limiter: rateLimit({ windowMs: 60000, max: Number(process.env.PAYMENT_RATE_LIMIT_PER_MINUTE) || 30 }),
});

/*
==================================
WEATHER AND FIRE DATA (cached, shared by every visitor)
The browser asks this server instead of Open-Meteo / NASA directly, so the
commercial keys stay private and each provider is called once for everyone.
See docs/SETUP_GUIDE.pdf.
==================================
*/
const upstreamCache = new TtlCache();
const dataLimiter = rateLimit({ windowMs: 60000, max: Number(process.env.RATE_LIMIT_PER_MINUTE) || 120 });

const weatherService = weather.register(app, {
  cache: upstreamCache,
  apiKey: OPEN_METEO_API_KEY || "",
  limiter: dataLimiter,
  cacheFile: path.join(__dirname, ".cache", "weather-grid.json"),
});
fires.register(app, { cache: upstreamCache, mapKey: FIRMS_MAP_KEY || "", limiter: dataLimiter });

// Lets the website show only what this server can actually do.
app.get("/api/features", (req, res) => {
  res.json({
    weather: true,
    commercialWeather: !!OPEN_METEO_API_KEY,
    fires: !!FIRMS_MAP_KEY,
    payments: !!(FLW_SECRET_KEY && firebaseAdmin),
  });
});

// For the host's uptime check (Render/Railway "health check path").
app.get("/api/health", (req, res) => res.json({ ok: true, uptimeSeconds: Math.round(process.uptime()) }));

const port = PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
  if (!OPEN_METEO_API_KEY) console.warn("OPEN_METEO_API_KEY not set: using Open-Meteo's free, NON-COMMERCIAL tier.");
  if (!FIRMS_MAP_KEY) console.warn("FIRMS_MAP_KEY not set: the fire layer is switched off.");
  weatherService.startWarming();
});
