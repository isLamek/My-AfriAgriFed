import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { Pencil, Trash2, Wallet, CheckCircle2, ImagePlus, X } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import "./MyListings.css";
import "./MyOrders.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const emptyListing = { product: "", price: "", unit: "kg", quantity: "" };

export default function MyListings() {
  const [subaccountId, setSubaccountId] = useState(undefined); // undefined = loading
  const [payoutForm, setPayoutForm] = useState({ businessName: "", accountBank: "", accountNumber: "" });
  const [banks, setBanks] = useState([]);
  const [settingUpPayouts, setSettingUpPayouts] = useState(false);

  const [listings, setListings] = useState([]);
  const [sales, setSales] = useState([]);
  const [formData, setFormData] = useState(emptyListing);
  const [editingId, setEditingId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getDoc(doc(db, "users", uid))
      .then((snap) => {
        setSubaccountId(snap.exists() ? snap.data().flutterwaveSubaccountId || null : null);
      })
      .catch((error) => {
        console.error("Could not load payout status:", error);
        setSubaccountId(null);
      });

    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
  }, []);

  useEffect(() => {
    fetch(`${API_URL}/api/payments/banks?country=NA`)
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setBanks([]));
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const listingsQuery = query(collection(db, "marketPrices"), where("sellerId", "==", uid));

    const unsubscribe = onSnapshot(listingsQuery, (snapshot) => {
      setListings(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const salesQuery = query(
      collection(db, "orders"),
      where("sellerId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
      setSales(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const setupPayouts = async (event) => {
    event.preventDefault();
    const user = auth.currentUser;

    if (!payoutForm.businessName || !payoutForm.accountBank || !payoutForm.accountNumber) {
      toast.error("Fill in your business name, bank and account number.");
      return;
    }

    setSettingUpPayouts(true);

    try {
      const response = await fetch(`${API_URL}/api/payments/subaccounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: payoutForm.businessName,
          businessEmail: user.email,
          accountBank: payoutForm.accountBank,
          accountNumber: payoutForm.accountNumber,
          sellerId: user.uid,
        }),
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Could not set up payouts");

      await setDoc(doc(db, "users", user.uid), { flutterwaveSubaccountId: data.subaccountId }, { merge: true });
      setSubaccountId(data.subaccountId);
      toast.success("Payouts are set up. Your listings can now accept payment.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSettingUpPayouts(false);
    }
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setFormData({ product: listing.product, price: listing.price, unit: listing.unit || "kg", quantity: listing.quantity ?? "" });
    setExistingImageUrl(listing.imageUrl || null);
    setImageFile(null);
    setImagePreview(null);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setFormData(emptyListing);
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const handleImageSelect = (file) => {
    setImageFile(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const saveListing = async (event) => {
    event.preventDefault();
    const user = auth.currentUser;

    if (!formData.product.trim() || !formData.price) {
      toast.error("Add a product name and price.");
      return;
    }

    setSaving(true);

    try {
      let imageUrl = existingImageUrl || "";

      if (imageFile) {
        const upload = await uploadToCloudinary(imageFile, "marketplace");
        imageUrl = upload.secure_url;
      }

      const payload = {
        product: formData.product.trim(),
        price: Number(formData.price),
        unit: formData.unit,
        quantity: formData.quantity === "" || formData.quantity == null ? null : Math.max(0, Math.floor(Number(formData.quantity))),
        imageUrl,
        sellerId: user.uid,
        sellerName: user.displayName || user.email,
        sellerSubaccountId: subaccountId || null,
      };

      if (editingId) {
        await updateDoc(doc(db, "marketPrices", editingId), payload);
        toast.success("Listing updated.");
      } else {
        await addDoc(collection(db, "marketPrices"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Listing posted to the marketplace.");
      }

      cancelEdit();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async (listing) => {
    if (!window.confirm(`Remove "${listing.product}" from the marketplace?`)) return;
    await deleteDoc(doc(db, "marketPrices", listing.id));
    toast.success("Listing removed.");
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const navSections = buildNavSections({ userType: "farmer", isAdmin: isAdminUser, activePath: "/my-listings" });

  return (
    <AppShell
      eyebrow="Producer workspace"
      title="My Listings"
      subtitle="Manage what you're selling on the AfriAgriFed marketplace."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={isAdminUser ? "admin" : "farmer"}
    >
      {subaccountId === null && (
        <section className="aaf-card payout-card">
          <div className="payout-card-heading">
            <Wallet size={22} />
            <div>
              <h3>Set up payouts</h3>
              <p>
                Add your bank details once so buyers can pay you directly through the app. AfriAgriFed
                automatically deducts its commission and sends the rest to this account.
              </p>
            </div>
          </div>

          <form onSubmit={setupPayouts} className="payout-form">
            <label>
              Business / farm name
              <input
                value={payoutForm.businessName}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder="e.g., Green Valley Farm"
              />
            </label>

            <label>
              Bank
              <select
                value={payoutForm.accountBank}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, accountBank: e.target.value }))}
              >
                <option value="">Select your bank</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              {banks.length === 0 && (
                <span className="payout-hint">
                  Bank list unavailable - payments aren't configured yet (needs a Flutterwave API key).
                </span>
              )}
            </label>

            <label>
              Account number
              <input
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                placeholder="Bank account number"
              />
            </label>

            <button className="aaf-btn aaf-btn-primary" disabled={settingUpPayouts}>
              {settingUpPayouts ? "Setting up..." : "Set Up Payouts"}
            </button>
          </form>
        </section>
      )}

      {subaccountId && (
        <div className="payout-status">
          <CheckCircle2 size={16} /> Payouts are set up - your listings can accept payment.
        </div>
      )}

      <section className="aaf-card">
        <h3>{editingId ? "Edit Listing" : "Add a Listing"}</h3>

        <form onSubmit={saveListing} className="listing-form">
          <label>
            Product
            <input
              value={formData.product}
              onChange={(e) => setFormData((prev) => ({ ...prev, product: e.target.value }))}
              placeholder="e.g., Tomatoes"
            />
          </label>

          <label>
            Price (N$)
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
            />
          </label>

          <label>
            Unit
            <select value={formData.unit} onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}>
              <option value="kg">per kg</option>
              <option value="unit">per unit</option>
              <option value="tray">per tray</option>
              <option value="bunch">per bunch</option>
              <option value="litre">per litre</option>
            </select>
          </label>

          <label>
            Quantity available (optional)
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </label>

          <label className="listing-photo-field">
            Photo (optional)
            {(imagePreview || existingImageUrl) ? (
              <div className="listing-photo-preview">
                <img src={imagePreview || existingImageUrl} alt="Listing" />
                <button type="button" onClick={() => { handleImageSelect(null); setExistingImageUrl(null); }} aria-label="Remove photo">
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="listing-photo-placeholder">
                <ImagePlus size={16} /> Add a photo buyers will see
              </span>
            )}
            <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
          </label>

          <div className="listing-form-actions">
            <button className="aaf-btn aaf-btn-primary" disabled={saving}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Post Listing"}
            </button>
            {editingId && (
              <button type="button" className="aaf-btn aaf-btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="listings-grid">
        {listings.length === 0 ? (
          <p className="dashboard-empty-state">You haven't posted any listings yet.</p>
        ) : (
          listings.map((listing) => (
            <div className="aaf-card listing-card" key={listing.id}>
              {listing.imageUrl && (
                <img src={listing.imageUrl} alt={listing.product} className="listing-card-image" />
              )}
              <div>
                <h4>{listing.product}</h4>
                <p className="listing-price">
                  N${listing.price} <span>/ {listing.unit || "kg"}</span>
                </p>
                {listing.quantity != null && (
                  <p className={`listing-qty ${listing.quantity <= 0 ? "sold-out" : ""}`}>
                    {listing.quantity <= 0 ? "Sold out. Edit the quantity to restock." : `${listing.quantity} available`}
                  </p>
                )}
              </div>
              <div className="listing-actions">
                <button onClick={() => startEdit(listing)} aria-label="Edit">
                  <Pencil size={16} />
                </button>
                <button onClick={() => removeListing(listing)} aria-label="Remove" className="danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="aaf-card recent-sales">
        <h3>Recent Sales</h3>

        {sales.length === 0 ? (
          <p className="dashboard-empty-state">No sales recorded yet.</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((sale) => (
                <tr key={sale.id}>
                  <td>{sale.product}</td>
                  <td>
                    {sale.currency || "NAD"} {sale.amount}
                  </td>
                  <td>
                    <span className={`order-status ${sale.status}`}>{sale.status}</span>
                  </td>
                  <td>{sale.createdAt?.toDate ? sale.createdAt.toDate().toLocaleDateString() : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
