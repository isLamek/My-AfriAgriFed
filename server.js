require("dotenv").config();

const express = require("express");
const cors = require("cors");
const cloudinary = require("cloudinary").v2;

const app = express();

// In production, lock this down to your frontend's origin instead of "*"
app.use(cors());
app.use(express.json());

const {
  CLOUDINARY_CLOUD_NAME,
  CLOUDINARY_API_KEY,
  CLOUDINARY_API_SECRET,
  FLW_SECRET_KEY,
  FLW_SECRET_HASH,
  PLATFORM_COMMISSION_RATE,
  APP_BASE_URL,
  PORT
} = process.env;

const commissionRate = Number(PLATFORM_COMMISSION_RATE) || 0.05;
const appBaseUrl = APP_BASE_URL || "http://localhost:3000";
const FLW_BASE_URL = "https://api.flutterwave.com/v3";

if (
  !CLOUDINARY_CLOUD_NAME ||
  !CLOUDINARY_API_KEY ||
  !CLOUDINARY_API_SECRET
) {
  console.error(
    "Missing Cloudinary env vars. Set CLOUDINARY_CLOUD_NAME, " +
    "CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET in your .env file."
  );
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  api_key: CLOUDINARY_API_KEY,
  api_secret: CLOUDINARY_API_SECRET
});

app.get("/api/cloudinary-signature", (req, res) => {
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
Buyer pays the full price -> Flutterwave splits it automatically:
  platform keeps `commissionRate`, the rest is routed to the seller's
  Flutterwave subaccount. Requires FLW_SECRET_KEY in .env - see .env.example.
==================================
*/

function requireFlutterwaveKey(res) {
  if (!FLW_SECRET_KEY) {
    res.status(500).json({
      error: "Payments are not configured yet. Set FLW_SECRET_KEY in .env (see .env.example)."
    });
    return false;
  }
  return true;
}

// Bank list for the payout-setup dropdown, so sellers pick a bank name
// instead of typing a Flutterwave bank code from memory.
app.get("/api/payments/banks", async (req, res) => {
  if (!requireFlutterwaveKey(res)) return;

  const country = req.query.country || "NA";

  try {
    const response = await fetch(`${FLW_BASE_URL}/banks/${country}`, {
      headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` }
    });

    const data = await response.json();

    if (data.status !== "success") {
      return res.status(400).json({ error: data.message || "Could not load bank list" });
    }

    res.json({ banks: data.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to load bank list" });
  }
});

// One-time setup per seller: creates the Flutterwave subaccount that
// receives their share of every sale. Store the returned subaccount_id on
// the seller's user document so future payments can reference it.
app.post("/api/payments/subaccounts", async (req, res) => {
  if (!requireFlutterwaveKey(res)) return;

  const { businessName, businessEmail, accountBank, accountNumber, sellerId } = req.body;

  if (!businessName || !accountBank || !accountNumber || !sellerId) {
    return res.status(400).json({
      error: "businessName, accountBank, accountNumber and sellerId are required"
    });
  }

  try {
    const response = await fetch(`${FLW_BASE_URL}/subaccounts`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        account_bank: accountBank,
        account_number: accountNumber,
        business_name: businessName,
        business_email: businessEmail,
        split_type: "percentage",
        split_value: 1 - commissionRate,
        meta: [{ metaname: "sellerId", metavalue: sellerId }]
      })
    });

    const data = await response.json();

    if (data.status !== "success") {
      return res.status(400).json({ error: data.message || "Could not create subaccount" });
    }

    res.json({ subaccountId: data.data.id, fullResponse: data.data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to create Flutterwave subaccount" });
  }
});

// Starts a checkout: returns a Flutterwave-hosted payment link that
// automatically splits the payment between platform and seller on success.
app.post("/api/payments/initiate", async (req, res) => {
  if (!requireFlutterwaveKey(res)) return;

  const {
    amount,
    currency = "NAD",
    customerEmail,
    customerName,
    productName,
    sellerSubaccountId,
    buyerId,
    sellerId
  } = req.body;

  if (!amount || !customerEmail) {
    return res.status(400).json({
      error: "amount and customerEmail are required"
    });
  }

  const txRef = `aaf-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  try {
    const payload = {
      tx_ref: txRef,
      amount,
      currency,
      redirect_url: `${appBaseUrl}/payment-callback`,
      customer: { email: customerEmail, name: customerName },
      customizations: { title: "AfriAgriFed", description: productName || "Marketplace order" },
      meta: { buyerId, sellerId, productName }
    };

    // Marketplace orders split to the seller's subaccount; platform-only
    // charges (e.g. promotion fees) have no seller and go entirely to the
    // main account, so this is only added when one is provided.
    if (sellerSubaccountId) {
      payload.subaccounts = [{ id: sellerSubaccountId }];
    }

    const response = await fetch(`${FLW_BASE_URL}/payments`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${FLW_SECRET_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (data.status !== "success") {
      return res.status(400).json({ error: data.message || "Could not start payment" });
    }

    res.json({ link: data.data.link, txRef });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to initiate payment" });
  }
});

// The frontend calls this after Flutterwave redirects back, to confirm the
// charge actually succeeded before it writes an "orders" record to
// Firestore (the frontend holds the Firebase Auth session, this server
// doesn't have Firebase Admin credentials - see scripts/seedAdmins.js for
// how to add those if you want verification to happen server-side instead).
app.get("/api/payments/verify/:transactionId", async (req, res) => {
  if (!requireFlutterwaveKey(res)) return;

  try {
    const response = await fetch(
      `${FLW_BASE_URL}/transactions/${req.params.transactionId}/verify`,
      { headers: { Authorization: `Bearer ${FLW_SECRET_KEY}` } }
    );

    const data = await response.json();
    const isSuccessful = data.status === "success" && data.data?.status === "successful";

    res.json({ verified: isSuccessful, transaction: data.data || null });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Failed to verify payment" });
  }
});

// Flutterwave webhook (Dashboard -> Settings -> Webhooks). Verifies the
// signature and logs the event. Wire this to Firestore with the Admin SDK
// (scripts/seedAdmins.js explains how to get a service account key) if you
// want order confirmation to not depend on the buyer's browser staying open.
app.post("/api/payments/webhook", (req, res) => {
  const signature = req.headers["verif-hash"];

  if (!FLW_SECRET_HASH || signature !== FLW_SECRET_HASH) {
    return res.status(401).end();
  }

  console.log("Flutterwave webhook event:", JSON.stringify(req.body));
  res.status(200).end();
});

const port = PORT || 5000;
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
