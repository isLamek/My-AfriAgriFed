import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  writeBatch,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { Pencil, Trash2, Wallet, CheckCircle2, ImagePlus, X, Plus } from "lucide-react";
import { db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinaryUpload";
import { API_BASE_URL, NO_BACKEND_MESSAGE } from "./apiBase";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import useAccountContext from "./useAccountContext";
import { formatNad, stockLabel } from "./purchase";
import { CATEGORIES, FULFILMENT, LIMITS, REGIONS, UNITS, fulfilmentLabel, unitLabel, validateListing } from "./listingRules";
import { regionLabel } from "./farmview/regions";
import "./MyListings.css";

const COMMISSION_PERCENT = 5; // keep in sync with PLATFORM_COMMISSION_RATE on the server

const emptyListing = {
  product: "",
  description: "",
  category: "vegetables",
  price: "",
  unit: "kg",
  quantity: "",
  region: "",
  fulfilment: "collect",
  deliveryNote: "",
};

function FieldError({ children }) {
  return children ? <small className="ml-error" role="alert">{children}</small> : null;
}

function PayoutSetup({ account, onDone }) {
  const [form, setForm] = useState({ businessName: account.sellerName || "", accountBank: "", accountNumber: "" });
  const [banks, setBanks] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!API_BASE_URL) {
      setBanks([]);
      return;
    }
    fetch(`${API_BASE_URL}/api/payments/banks?country=NA`)
      .then((res) => res.json())
      .then((data) => setBanks(data.banks || []))
      .catch(() => setBanks([]));
  }, []);

  const submit = async (event) => {
    event.preventDefault();
    if (!form.businessName || !form.accountBank || !form.accountNumber) {
      toast.error("Fill in your business name, bank and account number.");
      return;
    }
    if (!API_BASE_URL) {
      toast.error(NO_BACKEND_MESSAGE);
      return;
    }
    setSaving(true);
    try {
      // The server takes the seller's identity from this token, never from the form.
      const token = await account.user.getIdToken();
      const response = await fetch(`${API_BASE_URL}/api/payments/subaccounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.message || "Could not set up payouts.");
      await setDoc(doc(db, "users", account.user.uid), { flutterwaveSubaccountId: data.subaccountId }, { merge: true });
      await onDone(data.subaccountId);
      toast.success("Payouts are set up. Buyers can now pay for your listings.");
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="aaf-card ml-payout" aria-labelledby="payout-title">
      <div className="ml-payout-head">
        <Wallet size={20} aria-hidden="true" />
        <div>
          <h2 id="payout-title" className="aaf-section-title">Set up payouts to start selling online</h2>
          <p className="aaf-muted">
            Buyers pay by card through AfriAgriFed. We keep a {COMMISSION_PERCENT}% commission on each sale and send the rest to
            this bank account. There are no listing or monthly fees.
          </p>
        </div>
      </div>
      <form onSubmit={submit} className="ml-form-grid">
        <label className="aaf-field">
          Business or farm name
          <input value={form.businessName} onChange={(e) => setForm((p) => ({ ...p, businessName: e.target.value }))} autoComplete="organization" />
        </label>
        <label className="aaf-field">
          Bank
          <select value={form.accountBank} onChange={(e) => setForm((p) => ({ ...p, accountBank: e.target.value }))}>
            <option value="">{banks === null ? "Loading banks…" : "Select your bank"}</option>
            {(banks || []).map((bank) => (
              <option key={bank.code} value={bank.code}>{bank.name}</option>
            ))}
          </select>
          {banks && banks.length === 0 && <small>Online payments are still being set up. You can list products in the meantime.</small>}
        </label>
        <label className="aaf-field">
          Account number
          <input inputMode="numeric" value={form.accountNumber} onChange={(e) => setForm((p) => ({ ...p, accountNumber: e.target.value }))} />
        </label>
        <div className="ml-form-actions">
          <button className="aaf-btn aaf-btn-primary" disabled={saving}>{saving ? "Setting up…" : "Save bank details"}</button>
        </div>
      </form>
    </section>
  );
}

export default function MyListings() {
  const account = useAccountContext("/my-listings");
  const navigate = useNavigate();
  const uid = account.user?.uid;
  const subaccountId = account.profile?.flutterwaveSubaccountId || null;

  const [listings, setListings] = useState(null);
  const [formData, setFormData] = useState(emptyListing);
  const [errors, setErrors] = useState({});
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [existingImageUrl, setExistingImageUrl] = useState(null);

  useEffect(() => {
    if (!uid) return undefined;
    return onSnapshot(
      query(collection(db, "marketPrices"), where("sellerId", "==", uid)),
      (snap) => setListings(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      () => setListings([])
    );
  }, [uid]);

  // Listings saved before payouts existed still carry no payout account, which
  // greys out their Buy button. Bring them up to date once payouts are set up.
  const attachPayoutsToListings = async (id) => {
    const stale = (listings || []).filter((l) => l.sellerSubaccountId !== id);
    if (!stale.length) return;
    const batch = writeBatch(db);
    stale.forEach((l) => batch.update(doc(db, "marketPrices", l.id), { sellerSubaccountId: id }));
    await batch.commit();
  };

  useEffect(() => {
    if (subaccountId && listings && listings.some((l) => l.sellerSubaccountId !== subaccountId)) {
      attachPayoutsToListings(subaccountId).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subaccountId, listings]);

  const set = (key) => (e) => {
    setFormData((prev) => ({ ...prev, [key]: e.target.value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  };

  const openNew = () => {
    cancelEdit();
    setShowForm(true);
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setShowForm(true);
    setErrors({});
    setFormData({
      ...emptyListing,
      ...Object.fromEntries(Object.keys(emptyListing).map((k) => [k, listing[k] ?? emptyListing[k]])),
      price: String(listing.price ?? ""),
      quantity: listing.quantity ?? "",
    });
    setExistingImageUrl(listing.imageUrl || null);
    setImageFile(null);
    setImagePreview(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  function cancelEdit() {
    setEditingId(null);
    setShowForm(false);
    setFormData(emptyListing);
    setErrors({});
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  }

  const chooseImage = (file) => {
    setImageFile(file || null);
    setImagePreview(file ? URL.createObjectURL(file) : null);
  };

  const saveListing = async (event) => {
    event.preventDefault();
    const check = validateListing(formData);
    if (!check.ok) {
      setErrors(check.errors);
      toast.error("Please fix the highlighted fields.");
      return;
    }
    setSaving(true);
    try {
      let imageUrl = existingImageUrl || "";
      if (imageFile) imageUrl = (await uploadToCloudinary(imageFile, "marketplace")).secure_url;

      const payload = {
        ...check.value,
        imageUrl,
        sellerId: uid,
        sellerName: account.sellerName,
        sellerSubaccountId: subaccountId,
      };

      if (editingId) {
        await updateDoc(doc(db, "marketPrices", editingId), payload);
        toast.success("Listing updated.");
      } else {
        await addDoc(collection(db, "marketPrices"), { ...payload, createdAt: serverTimestamp() });
        toast.success("Your listing is live on the Marketplace.");
      }
      cancelEdit();
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "Only approved producer accounts can list products." : error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async (listing) => {
    if (!window.confirm(`Remove "${listing.product}" from the Marketplace? Buyers will no longer see it.`)) return;
    try {
      await deleteDoc(doc(db, "marketPrices", listing.id));
      toast.success("Listing removed.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const photo = imagePreview || existingImageUrl;

  return (
    <AppShell
      title="My listings"
      subtitle="What you sell on the Marketplace. Orders for these appear under Orders."
      navSections={account.navSections}
      actions={
        !showForm && (
          <button className="aaf-btn aaf-btn-primary aaf-btn-sm" onClick={openNew}>
            <Plus size={15} aria-hidden="true" /> New listing
          </button>
        )
      }
      headerRight={<NotificationBell />}
      onLogout={account.logout}
    >
      {!account.loading && !subaccountId && <PayoutSetup account={account} onDone={attachPayoutsToListings} />}
      {subaccountId && (
        <p className="ml-payout-ok">
          <CheckCircle2 size={16} aria-hidden="true" /> Payouts are set up. You receive each sale minus the {COMMISSION_PERCENT}% AfriAgriFed commission.
        </p>
      )}

      {showForm && (
        <section className="aaf-card ml-editor" aria-labelledby="ml-editor-title">
          <h2 id="ml-editor-title" className="aaf-section-title">{editingId ? "Edit listing" : "New listing"}</h2>
          <form onSubmit={saveListing} noValidate>
            <div className="ml-form-grid">
              <label className="aaf-field wide">
                Product name
                <input value={formData.product} onChange={set("product")} maxLength={LIMITS.product} placeholder="e.g. Roma tomatoes" aria-invalid={!!errors.product} />
                <FieldError>{errors.product}</FieldError>
              </label>
              <label className="aaf-field">
                Category
                <select value={formData.category} onChange={set("category")}>
                  {CATEGORIES.map((c) => (
                    <option key={c.id} value={c.id}>{c.label}</option>
                  ))}
                </select>
              </label>
              <label className="aaf-field">
                Price (N$)
                <input type="number" min="0" step="0.01" inputMode="decimal" value={formData.price} onChange={set("price")} aria-invalid={!!errors.price} />
                <FieldError>{errors.price}</FieldError>
              </label>
              <label className="aaf-field">
                Unit
                <select value={formData.unit} onChange={set("unit")}>
                  {UNITS.map((u) => (
                    <option key={u.id} value={u.id}>{u.label}</option>
                  ))}
                </select>
              </label>
              <label className="aaf-field">
                Quantity available
                <input type="number" min="0" inputMode="numeric" value={formData.quantity} onChange={set("quantity")} aria-invalid={!!errors.quantity} />
                <small>Leave empty if there is no fixed limit.</small>
                <FieldError>{errors.quantity}</FieldError>
              </label>
              <label className="aaf-field">
                Region
                <select value={formData.region} onChange={set("region")} aria-invalid={!!errors.region}>
                  <option value="">Choose a region</option>
                  {REGIONS.map((r) => (
                    <option key={r} value={r}>{regionLabel(r)}</option>
                  ))}
                </select>
                <FieldError>{errors.region}</FieldError>
              </label>
              <label className="aaf-field">
                How buyers get it
                <select value={formData.fulfilment} onChange={set("fulfilment")} aria-invalid={!!errors.fulfilment}>
                  {FULFILMENT.map((f) => (
                    <option key={f.id} value={f.id}>{f.label}</option>
                  ))}
                </select>
                <FieldError>{errors.fulfilment}</FieldError>
              </label>
              <label className="aaf-field wide">
                Collection or delivery details <span className="aaf-muted">(optional)</span>
                <input value={formData.deliveryNote} onChange={set("deliveryNote")} maxLength={LIMITS.deliveryNote} placeholder="e.g. Collect in Ongwediva, or delivery in Oshana for N$50" />
                <small>Any delivery charge must be written here. Buyers only pay the listed price online.</small>
                <FieldError>{errors.deliveryNote}</FieldError>
              </label>
              <label className="aaf-field wide">
                Description <span className="aaf-muted">(optional)</span>
                <textarea rows={3} value={formData.description} onChange={set("description")} maxLength={LIMITS.description} placeholder="Variety, size, how it was grown, when it was harvested" />
                <FieldError>{errors.description}</FieldError>
              </label>

              <div className="aaf-field wide">
                Photo <span className="aaf-muted">(optional, a real photo of what you are selling)</span>
                <div className="ml-photo">
                  {photo ? (
                    <div className="ml-photo-preview">
                      <img src={photo} alt={`Photo of ${formData.product || "your product"}`} />
                      <button type="button" onClick={() => { chooseImage(null); setExistingImageUrl(null); }} aria-label="Remove photo">
                        <X size={14} />
                      </button>
                    </div>
                  ) : null}
                  <label className="aaf-btn aaf-btn-secondary aaf-btn-sm ml-file">
                    <ImagePlus size={15} aria-hidden="true" /> {photo ? "Change photo" : "Add photo"}
                    <input type="file" accept="image/*" onChange={(e) => chooseImage(e.target.files?.[0])} />
                  </label>
                </div>
              </div>
            </div>

            <p className="ml-fee-note">
              Buyers pay the listed price. When an item sells, AfriAgriFed keeps {COMMISSION_PERCENT}% and you receive the rest.
            </p>
            <div className="ml-form-actions">
              <button className="aaf-btn aaf-btn-primary" disabled={saving}>
                {saving ? "Saving…" : editingId ? "Save changes" : "Publish listing"}
              </button>
              <button type="button" className="aaf-btn aaf-btn-secondary" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        </section>
      )}

      <section className="aaf-card" aria-labelledby="ml-list-title">
        <div className="aaf-card-head">
          <h2 id="ml-list-title" className="aaf-section-title">Your listings</h2>
          <button className="aaf-text-btn" onClick={() => navigate("/orders")}>View orders</button>
        </div>
        {listings === null && <p className="aaf-empty">Loading…</p>}
        {listings && listings.length === 0 && (
          <p className="aaf-empty">You have no listings yet. Choose “New listing” to sell your first product.</p>
        )}
        {listings && listings.length > 0 && (
          <div className="ml-table-wrap">
            <table className="ml-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Price</th>
                  <th scope="col">Stock</th>
                  <th scope="col">Region</th>
                  <th scope="col">Collection / delivery</th>
                  <th scope="col"><span className="aaf-visually-hidden">Actions</span></th>
                </tr>
              </thead>
              <tbody>
                {listings.map((listing) => {
                  const stock = stockLabel(listing);
                  const incomplete = !listing.region || !listing.fulfilment;
                  return (
                    <tr key={listing.id}>
                      <td>
                        <div className="ml-product">
                          {listing.imageUrl ? <img src={listing.imageUrl} alt="" /> : <span className="ml-thumb" aria-hidden="true" />}
                          <span>
                            {listing.product}
                            {incomplete && <span className="ml-warn">Add region and delivery details</span>}
                          </span>
                        </div>
                      </td>
                      <td>{formatNad(listing.price)} <span className="aaf-muted">{unitLabel(listing.unit)}</span></td>
                      <td className={stock.state === "sold_out" ? "ml-sold" : ""}>{stock.text || "No limit"}</td>
                      <td>{listing.region ? regionLabel(listing.region) : "—"}</td>
                      <td>{fulfilmentLabel(listing.fulfilment) || "—"}</td>
                      <td className="ml-actions">
                        <button onClick={() => startEdit(listing)} aria-label={`Edit ${listing.product}`}>
                          <Pencil size={15} />
                        </button>
                        <button onClick={() => removeListing(listing)} aria-label={`Remove ${listing.product}`} className="danger">
                          <Trash2 size={15} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}
