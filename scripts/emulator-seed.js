// Fills the LOCAL Firebase emulators with test accounts and sample data, so every
// dashboard can be opened and tested without touching the live database.
//
//   1. Start the emulators:  npm run emulators        (needs Java; see docs/TESTING.md)
//   2. In another window:    npm run seed
//   3. Start the app:        npm run start:local      (talks to the emulators only)
//   4. Sign in with any account below.
//
// SAFETY: this script refuses to run unless it is pointed at emulators on this
// computer. It cannot write to the real database.

const EMULATOR_HOSTS = {
  FIRESTORE_EMULATOR_HOST: "127.0.0.1:8080",
  FIREBASE_AUTH_EMULATOR_HOST: "127.0.0.1:9099",
  FIREBASE_DATABASE_EMULATOR_HOST: "127.0.0.1:9000",
};
Object.assign(process.env, EMULATOR_HOSTS);
for (const [name, value] of Object.entries(EMULATOR_HOSTS)) {
  if (!/^(127\.0\.0\.1|localhost):\d+$/.test(process.env[name] || "")) {
    console.error(`Refusing to run: ${name} is not a local emulator (${value}).`);
    process.exit(1);
  }
}

const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, Timestamp } = require("firebase-admin/firestore");
const { getDatabase } = require("firebase-admin/database");

const PROJECT_ID = "afriagrifed-ebc30";
const RTDB_NS = "afriagrifed-ebc30-default-rtdb";

initializeApp({ projectId: PROJECT_ID, databaseURL: `http://127.0.0.1:9000?ns=${RTDB_NS}` });
const auth = getAuth();
const db = getFirestore();
const rtdb = getDatabase();

// Test-only password, used for every account below. These accounts exist only in
// the local emulators on this computer.
const PASSWORD = "Test-AfriAgriFed-2026";

const ACCOUNTS = [
  { key: "admin", email: "admin@aaf.test", name: "Ada Admin", admin: "founder" },
  { key: "farmer", email: "farmer@aaf.test", name: "Ndapewa Shikongo", userType: "farmer", approved: true, region: "Oshana" },
  { key: "farmer2", email: "farmer2@aaf.test", name: "Tomas Haufiku", userType: "farmer", approved: true, region: "Ohangwena" },
  { key: "pending", email: "pending@aaf.test", name: "Penda Pending", userType: "farmer", approved: false },
  { key: "buyer", email: "buyer@aaf.test", name: "Bea Buyer", userType: "consumer", approved: false },
  { key: "org", email: "org@aaf.test", name: "Ongwediva Fresh Market", userType: "consumer", organization: "Retailer" },
  { key: "institution", email: "institution@aaf.test", name: "UNAM Ogongo Campus", userType: "institution", approved: true },
  { key: "carrier", email: "carrier@aaf.test", name: "Kaleb Haimbili", userType: "consumer" }, // an approved carrier (see carriers/ below)
  { key: "carrier2", email: "carrier2@aaf.test", name: "Penda Transport", userType: "consumer" }, // a carrier waiting for approval
];

const now = Date.now();
const ago = (minutes) => Timestamp.fromMillis(now - minutes * 60000);
const isoDay = (offsetDays) => new Date(now + offsetDays * 86400000).toISOString().slice(0, 10);

function profile(a, uid) {
  const approved = a.approved === true;
  return {
    uid,
    userType: a.userType,
    isOrganization: !!a.organization,
    approved,
    status: approved ? "verified" : "pending",
    personalInfo: {
      firstName: a.name.split(" ")[0],
      lastName: a.name.split(" ").slice(1).join(" "),
      email: a.email,
      nationality: "Namibian",
    },
    accountStatus: {
      registrationStatus: approved ? "verified" : "pending",
      documentStatus: a.userType === "consumer" ? "not_required" : approved ? "approved" : "submitted",
    },
    questionnaireData: a.organization
      ? { consumerType: a.organization, businessName: a.name }
      : a.userType === "institution"
      ? { institutionName: a.name }
      : a.userType === "farmer"
      ? { region: a.region || "Oshana", mainCrops: "Mahangu, cowpeas" }
      : {},
    documents: {},
    ...(approved ? { adminReview: { reviewedBy: "seed", notes: "Seeded test account" } } : {}),
    ...(a.key === "farmer" ? { flutterwaveSubaccountId: "RS_TEST_SEED" } : {}),
    createdAt: ago(60 * 24 * 10),
  };
}

async function upsertUser(a) {
  let user;
  try {
    user = await auth.getUserByEmail(a.email);
  } catch {
    user = await auth.createUser({ email: a.email, password: PASSWORD, displayName: a.name, emailVerified: true });
  }
  await auth.updateUser(user.uid, { password: PASSWORD, displayName: a.name, emailVerified: true });
  return user.uid;
}

async function main() {
  const uid = {};
  for (const a of ACCOUNTS) uid[a.key] = await upsertUser(a);

  const batch = db.batch();
  const set = (path, data) => batch.set(db.doc(path), data);

  // ---- accounts ----------------------------------------------------------------
  for (const a of ACCOUNTS) {
    if (a.admin) {
      set(`admins/${a.email}`, { email: a.email, uid: uid[a.key], role: a.admin, addedBy: "seed", addedAt: ago(60) });
    } else {
      set(`users/${uid[a.key]}`, profile(a, uid[a.key]));
    }
  }
  set("system/bootstrap", { founderClaimed: true, claimedBy: "admin@aaf.test", claimedAt: ago(60) });
  set("publicStats/summary", { users: ACCOUNTS.length, updatedAt: ago(5) });

  // ---- marketplace -----------------------------------------------------------------
  const listings = [
    { id: "lst_mahangu", seller: "farmer", product: "Mahangu (pearl millet)", price: 18, unit: "kg", quantity: 400, location: { lat: -17.788, lng: 15.699, label: "Oshakati", region: "Oshana" }, delivery: { collect: true, platform: true, own: { enabled: true, baseFee: 25, perKm: 6, maxKm: 60 } } },
    { id: "lst_cowpeas", seller: "farmer", product: "Cowpeas (omakunde)", price: 32, unit: "kg", quantity: 4, location: { lat: -17.79, lng: 15.72, label: "Near Oshakati", region: "Oshana" }, delivery: { collect: true, platform: false, own: { enabled: true, baseFee: 15, perKm: 4, maxKm: 30 } } },
    { id: "lst_spinach", seller: "farmer2", product: "Fresh spinach", price: 15, unit: "bunch", quantity: 0 },
    { id: "lst_goat", seller: "farmer2", product: "Boer goat (live)", price: 1800, unit: "unit", quantity: 6, location: { lat: -22.57, lng: 17.083, label: "Windhoek", region: "Khomas" } },
  ];
  for (const l of listings) {
    const seller = ACCOUNTS.find((a) => a.key === l.seller);
    set(`marketPrices/${l.id}`, {
      product: l.product,
      price: l.price,
      unit: l.unit,
      quantity: l.quantity,
      imageUrl: "",
      sellerId: uid[l.seller],
      sellerName: seller.name,
      sellerSubaccountId: l.seller === "farmer" ? "RS_TEST_SEED" : null,
      location: l.location || null,
      ...(l.delivery ? { delivery: l.delivery } : {}),
      createdAt: ago(60 * 24 * 2),
    });
  }

  // ---- demand board ----------------------------------------------------------------
  set("demandRequests/dem_school", {
    title: "Weekly mahangu for school feeding",
    product: "Mahangu",
    quantityNeeded: 1200,
    unit: "kg",
    deadline: isoDay(14),
    notes: "Delivery to Ongwediva. Clean, dry grain.",
    location: { lat: -17.785, lng: 15.767, label: "Ongwediva", region: "Oshana" },
    buyerId: uid.org,
    buyerName: "Ongwediva Fresh Market",
    buyerType: "consumer",
    status: "open",
    createdAt: ago(60 * 30),
  });
  set("demandRequests/dem_school/pledges/plg_1", {
    farmerId: uid.farmer,
    farmerName: "Ndapewa Shikongo",
    quantity: 300,
    note: "Ready in 5 days",
    createdAt: ago(60 * 20),
  });
  set("demandRequests/dem_school/messages/msg_1", {
    authorId: uid.org,
    authorName: "Ongwediva Fresh Market",
    text: "Can anyone deliver before the 15th?",
    createdAt: ago(60 * 19),
  });

  // ---- learning -----------------------------------------------------------------------
  set("institutionResearchArticles/art_1", {
    title: "Mahangu yields after early planting in Oshana",
    summary: "Three seasons of trial plots show early November planting raised yields by about 18%.",
    category: "Research",
    sourceName: "UNAM Ogongo Campus",
    articleUrl: "",
    image: { url: "https://res.cloudinary.com/demo/image/upload/sample.jpg" },
    pdf: null,
    authorId: uid.institution,
    authorEmail: "institution@aaf.test",
    respondsToProblemId: null,
    createdAt: ago(60 * 24 * 3),
  });
  set("researchProblems/prb_1", {
    title: "Birds eating mahangu before harvest",
    description: "What works against quelea birds on small fields?",
    submittedBy: uid.farmer,
    submittedByName: "Ndapewa Shikongo",
    status: "open",
    createdAt: ago(60 * 24 * 4),
  });
  set("trainingPrograms/trn_1", {
    title: "Soil health and composting workshop",
    description: "Hands-on day: compost, mulching and keeping soil moisture.",
    mode: "In-person",
    location: "Ogongo Campus",
    startDate: isoDay(10),
    videoUrl: "",
    institutionId: uid.institution,
    institutionName: "UNAM Ogongo Campus",
    createdAt: ago(60 * 24),
  });
  set("internships/int_1", {
    title: "Harvest season placement",
    description: "Help with harvest, storage and marketing for 4 weeks.",
    location: "Oshakati",
    slots: 2,
    type: "offer",
    postedByRole: "farmer",
    postedById: uid.farmer,
    postedByName: "Ndapewa Shikongo",
    postedByEmail: "farmer@aaf.test",
    status: "open",
    createdAt: ago(60 * 24),
  });

  // ---- promotions -----------------------------------------------------------------------
  set("promotions/pro_1", {
    productName: "Mahangu (pearl millet)",
    description: "Clean, sun-dried mahangu from Oshana. Bulk prices for schools.",
    startDate: isoDay(-1),
    endDate: isoDay(6),
    imageUrl: "",
    farmerId: uid.farmer,
    farmerName: "Ndapewa Shikongo",
    workingDays: 5,
    cost: 150,
    status: "active",
    paidAmount: 150,
    transactionId: "seed",
    createdAt: ago(60 * 24),
  });

  // ---- carriers: one approved (can take jobs), one waiting for the admin ------------------------------
  set(`carriers/${uid.carrier}`, { name: "Kaleb Haimbili", phone: "+264811110000", vehicle: { type: "bakkie", description: "White Toyota Hilux", plate: "N 4521 W" }, regions: ["Oshana", "Ohangwena"], available: true, status: "approved", createdAt: ago(60 * 24 * 3), updatedAt: ago(60 * 24 * 3) });
  set(`carriers/${uid.carrier2}`, { name: "Penda Transport", phone: "+264812220000", vehicle: { type: "truck", description: "Isuzu 3-ton", plate: "N 889 W" }, regions: ["Oshana"], available: true, status: "pending", createdAt: ago(60 * 24), updatedAt: ago(60 * 24) });

  // ---- orders in different states, for trying the whole delivery flow ----------------------------------
  // Handover code for every seeded order (the buyer sees it on the order card): 123456
  const drop = { lat: -17.785, lng: 15.767, label: "Near Ongwediva", landmark: "Blue gate behind the Engen garage, Ongwediva", contactName: "Bea Buyer", contactPhone: "+264811234567" };
  const pickup = { lat: -17.788, lng: 15.699, label: "Oshakati", region: "Oshana" };
  const mahangu = { listingId: "lst_mahangu", product: "Mahangu (pearl millet)", quantity: 10, unit: "kg", unitPrice: 18 };

  // 2: a carrier order the seller has accepted and not yet asked a carrier for; 3: a collection nobody has accepted yet
  set("orders/tx_seed_2", {
    buyerId: uid.buyer, buyerName: "Bea Buyer", sellerId: uid.farmer, sellerName: "Ndapewa Shikongo",
    product: "Mahangu (pearl millet)", listingId: "lst_mahangu", quantity: 50, unit: "kg", unitPrice: 18,
    items: [{ ...mahangu, quantity: 50 }], itemsTotal: 900, deliveryFee: 68,
    fulfilment: { method: "platform", deliveryFee: 68, km: 11.2, etaMinutes: 43, vehicle: "bakkie", pickup, address: drop, window: "morning", note: "Please phone at the gate" },
    stockApplied: true, oversold: false, amount: 968, currency: "NAD", transactionId: "seed2", txRef: "aaf-seed-2", status: "confirmed",
    statusHistory: [
      { status: "paid", by: uid.buyer, at: now - 5 * 3600000, note: "Payment received" },
      { status: "confirmed", by: uid.farmer, at: now - 4 * 3600000 },
    ],
    createdAt: ago(300), updatedAt: ago(240),
  });
  set("orders/tx_seed_3", {
    buyerId: uid.buyer, buyerName: "Bea Buyer", sellerId: uid.farmer, sellerName: "Ndapewa Shikongo",
    product: "Cowpeas (omakunde)", listingId: "lst_cowpeas", quantity: 2, unit: "kg", unitPrice: 32,
    items: [{ listingId: "lst_cowpeas", product: "Cowpeas (omakunde)", quantity: 2, unit: "kg", unitPrice: 32 }], itemsTotal: 64, deliveryFee: 0,
    fulfilment: { method: "collect", deliveryFee: 0, pickup },
    stockApplied: true, oversold: false, amount: 64, currency: "NAD", transactionId: "seed3", txRef: "aaf-seed-3", status: "paid",
    statusHistory: [{ status: "paid", by: uid.buyer, at: now - 20 * 60000, note: "Payment received" }],
    createdAt: ago(20), updatedAt: ago(20),
  });

  // 4: a carrier (Kaleb) has the job and the seller has marked it ready: he can collect it now.
  // 5: a carrier job anyone approved can take from the board.
  const platformOrder = (n, status, extra = {}) => ({
    buyerId: uid.buyer, buyerName: "Bea Buyer", sellerId: uid.farmer, sellerName: "Ndapewa Shikongo",
    product: "Mahangu (pearl millet)", listingId: "lst_mahangu", quantity: 30, unit: "kg", unitPrice: 18,
    items: [{ ...mahangu, quantity: 30 }], itemsTotal: 540, deliveryFee: 62,
    fulfilment: { method: "platform", deliveryFee: 62, km: 9.1, etaMinutes: 40, vehicle: "bakkie", pickup, address: drop, ...(extra.fulfilment || {}) },
    stockApplied: true, oversold: false, amount: 602, currency: "NAD", transactionId: `seed${n}`, txRef: `aaf-seed-${n}`, status,
    statusHistory: [
      { status: "paid", by: uid.buyer, at: now - 6 * 3600000, note: "Payment received" },
      { status: "confirmed", by: uid.farmer, at: now - 5 * 3600000 },
      ...(status === "dispatched" ? [{ status: "dispatched", by: uid.farmer, at: now - 3600000 }] : []),
    ],
    createdAt: ago(360), updatedAt: ago(60),
  });
  const jobFor = (id, order, carrier) => ({
    orderId: id, sellerId: uid.farmer, buyerId: uid.buyer, status: carrier ? "claimed" : "open", vehicle: "bakkie", km: 9.1, fee: 62, carrierPay: 52.7, weightKg: 30,
    what: "Mahangu (pearl millet)", pickup: { lat: -17.79, lng: 15.7, label: "Oshakati", region: "Oshana" }, dropoff: { lat: -17.78, lng: 15.77, label: "Near Ongwediva" },
    window: "anytime", readyAt: now - 3600000, carrierId: carrier ? uid.carrier : null, carrierName: carrier ? "Kaleb Haimbili" : "", createdAt: now - 4 * 3600000,
  });
  set("orders/tx_seed_4", platformOrder(4, "dispatched", { fulfilment: { carrier: { uid: uid.carrier, name: "Kaleb Haimbili", vehicle: { type: "bakkie", description: "White Toyota Hilux", plate: "N 4521 W" } } } }));
  set("deliveryJobs/tx_seed_4", jobFor("tx_seed_4", null, true));
  set("deliveryPrivate/tx_seed_4", { sellerId: uid.farmer, buyerId: uid.buyer, carrierId: uid.carrier, pickup: { ...pickup, phone: "+264810001111", note: "Brown gate, ask for Ndapewa" }, dropoff: drop, note: "" });
  set("orders/tx_seed_5", platformOrder(5, "confirmed"));
  set("deliveryJobs/tx_seed_5", jobFor("tx_seed_5", null, false));
  set("deliveryPrivate/tx_seed_5", { sellerId: uid.farmer, buyerId: uid.buyer, carrierId: null, pickup: { ...pickup, phone: "+264810001111", note: "" }, dropoff: drop, note: "" });
  set("orderTracking/tx_seed_4", { orderId: "tx_seed_4", buyerId: uid.buyer, sellerId: uid.farmer, carrierId: uid.carrier, lat: -17.79, lng: 15.72, speedKmh: 55, at: now });
  for (const id of ["tx_seed_1", "tx_seed_2", "tx_seed_3", "tx_seed_4", "tx_seed_5"]) set(`orderSecrets/${id}`, { buyerId: uid.buyer, code: "123456", tries: 0, createdAt: now });

  // ---- an order already in progress ---------------------------------------------------------
  set("orders/tx_seed_1", {
    buyerId: uid.buyer,
    buyerName: "Bea Buyer",
    sellerId: uid.farmer,
    sellerName: "Ndapewa Shikongo",
    product: "Mahangu (pearl millet)",
    listingId: "lst_mahangu",
    quantity: 10,
    unit: "kg",
    unitPrice: 18,
    items: [mahangu],
    itemsTotal: 180,
    deliveryFee: 53,
    fulfilment: { method: "seller", deliveryFee: 53, km: 4.5, etaMinutes: 35, pickup, address: drop },
    stockApplied: true,
    oversold: false,
    amount: 233,
    currency: "NAD",
    transactionId: "seed1",
    txRef: "aaf-seed-1",
    status: "confirmed",
    statusHistory: [
      { status: "paid", by: uid.buyer, at: now - 3 * 3600000, note: "Payment received" },
      { status: "confirmed", by: uid.farmer, at: now - 2 * 3600000 },
    ],
    createdAt: ago(180),
    updatedAt: ago(120),
  });

  // ---- notifications ------------------------------------------------------------------------
  set("notifications/ntf_1", { userId: uid.farmer, title: "New pledge request", body: "A school needs 1,200 kg of mahangu.", link: "/demand-board", read: false, createdAt: ago(30) });
  set("notifications/ntf_2", { userId: uid.buyer, title: "Order confirmed", body: "Ndapewa confirmed your mahangu order.", link: "/track-orders", read: false, createdAt: ago(120) });

  // ---- a farm on the map ----------------------------------------------------------------------
  set("farms/farm_1", { ownerId: uid.farmer, name: "Shikongo mahangu field", lat: -17.79, lng: 15.7, region: "Oshana", crops: ["mahangu", "cowpea"], areaHa: 2.5, createdAt: ago(600), updatedAt: ago(600) });
  set("farmInputs/inp_1", { ownerId: uid.farmer, farmId: "farm_1", date: isoDay(-20), type: "seed", item: "Okashana 2 mahangu seed", quantity: 20, unit: "kg", costNad: 450, target: "Mahangu", createdAt: ago(600) });

  await batch.commit();

  // ---- community feed (Realtime Database) ------------------------------------------------------
  await rtdb.ref("posts").set({
    seed_post_1: {
      userId: uid.farmer,
      userName: "Ndapewa Shikongo",
      authorRole: "Farmer",
      content: "First rains in Oshana this week. Planting mahangu on Monday!",
      imageUrl: "",
      createdAt: now - 5 * 3600000,
      likes: { [uid.buyer]: true },
      comments: {
        c1: { userId: uid.buyer, userName: "Bea Buyer", text: "Good luck! Let me know when it is ready.", createdAt: now - 4 * 3600000 },
      },
    },
    seed_post_2: {
      userId: uid.institution,
      userName: "UNAM Ogongo Campus",
      authorRole: "Institution",
      content: "New training program: Soil health and composting workshop. See Training Programs for details.",
      imageUrl: "",
      createdAt: now - 26 * 3600000,
    },
  });

  console.log("\nSeeded the local emulators. Sign in at the local app with any of:");
  for (const a of ACCOUNTS) console.log(`  ${a.email.padEnd(24)} ${a.admin ? "admin (founder)" : `${a.userType}${a.approved ? " (approved)" : a.userType === "consumer" ? "" : " (waiting for approval)"}`}`);
  console.log(`Password for all of them: ${PASSWORD}\n`);
  process.exit(0);
}

main().catch((error) => {
  console.error("Seeding failed:", error.message);
  process.exit(1);
});
