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
import { API_BASE_URL, noBackendMessage } from "./apiBase";
import { serverMessage } from "./serverMessages";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import "./MyListings.css";
import "./MyOrders.css";
import LocationPicker from "./LocationPicker";
import { shrinkPhoto } from "./produceImages";
import { t, tv, formatDate } from "./i18n";
import { STATUS_LABELS, normaliseStatus } from "./orderStatus";

const API_URL = API_BASE_URL;
const emptyListing = { product: "", price: "", unit: "kg", quantity: "", location: null };

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
    if (!API_URL) {
      setBanks([]); // no backend configured yet
      return;
    }
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
      toast.error(t("listings.fillInYourBusinessNameBank"));
      return;
    }

    if (!API_URL) {
      toast.error(noBackendMessage());
      return;
    }

    setSettingUpPayouts(true);

    try {
      // The server checks who is asking from this token; it takes the seller's identity
      // and e-mail from it, not from the form.
      const token = await user.getIdToken();
      const response = await fetch(`${API_URL}/api/payments/subaccounts`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          businessName: payoutForm.businessName,
          accountBank: payoutForm.accountBank,
          accountNumber: payoutForm.accountNumber,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) throw new Error(serverMessage(data, t("listings.couldNotSetUpPayouts")));

      await setDoc(doc(db, "users", user.uid), { flutterwaveSubaccountId: data.subaccountId }, { merge: true });
      setSubaccountId(data.subaccountId);
      toast.success(t("listings.payoutsAreSetUpYourListings"));
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSettingUpPayouts(false);
    }
  };

  const startEdit = (listing) => {
    setEditingId(listing.id);
    setFormData({ product: listing.product, price: listing.price, unit: listing.unit || "kg", quantity: listing.quantity ?? "", location: listing.location || null });
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
      toast.error(t("listings.addProductNameAndPrice"));
      return;
    }

    setSaving(true);

    try {
      let imageUrl = existingImageUrl || "";

      if (imageFile) {
        try {
          const upload = await uploadToCloudinary(imageFile, "marketplace");
          imageUrl = upload.secure_url;
        } catch (uploadError) {
          // Photo uploads aren't set up (or Cloudinary refused): keep a
          // compressed copy on the listing so buyers still see the photo.
          if (uploadError.userError) throw uploadError;
          imageUrl = await shrinkPhoto(imageFile);
        }
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
        // optional pin on the Market Map (area only, see marketLocation.js)
        location: formData.location || null,
      };

      if (editingId) {
        await updateDoc(doc(db, "marketPrices", editingId), payload);
        toast.success(t("listings.listingUpdated"));
      } else {
        await addDoc(collection(db, "marketPrices"), { ...payload, createdAt: serverTimestamp() });
        toast.success(t("listings.listingPostedToTheMarketplace"));
      }

      cancelEdit();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const removeListing = async (listing) => {
    if (!window.confirm(t("listings.removeConfirm", { product: listing.product }))) return;
    await deleteDoc(doc(db, "marketPrices", listing.id));
    toast.success(t("listings.listingRemoved"));
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const navSections = buildNavSections({ userType: "farmer", isAdmin: isAdminUser, activePath: "/my-listings" });

  return (
    <AppShell
      eyebrow={t("listings.producerWorkspace")}
      title={t("listings.myListings")}
      subtitle={t("listings.manageWhatYouReSellingOn")}
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
              <h3>{t("listings.setUpPayouts")}</h3>
              <p>
                {t("listings.addYourBankDetailsOnceSo")}
              </p>
            </div>
          </div>

          <form onSubmit={setupPayouts} className="payout-form">
            <label>
              {t("listings.businessFarmName")}
              <input
                value={payoutForm.businessName}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, businessName: e.target.value }))}
                placeholder={t("listings.egGreenValleyFarm")}
              />
            </label>

            <label>
              {t("listings.bank")}
              <select
                value={payoutForm.accountBank}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, accountBank: e.target.value }))}
              >
                <option value="">{t("listings.selectYourBank")}</option>
                {banks.map((bank) => (
                  <option key={bank.code} value={bank.code}>
                    {bank.name}
                  </option>
                ))}
              </select>
              {banks.length === 0 && (
                <span className="payout-hint">
                  {t("listings.bankListUnavailablePaymentsArenConfigured")}
                </span>
              )}
            </label>

            <label>
              {t("listings.accountNumber")}
              <input
                value={payoutForm.accountNumber}
                onChange={(e) => setPayoutForm((prev) => ({ ...prev, accountNumber: e.target.value }))}
                placeholder={t("listings.bankAccountNumber")}
              />
            </label>

            <button className="aaf-btn aaf-btn-primary" disabled={settingUpPayouts}>
              {settingUpPayouts ? t("listings.settingUp") : t("listings.setUpPayouts2")}
            </button>
          </form>
        </section>
      )}

      {subaccountId && (
        <div className="payout-status">
          <CheckCircle2 size={16} /> {t("listings.payoutsAreSetUpYourListings2")}
        </div>
      )}

      <section className="aaf-card">
        <h3>{editingId ? t("listings.editListing") : t("listings.addListing")}</h3>

        <form onSubmit={saveListing} className="listing-form">
          <label>
            {t("listings.product")}
            <input
              value={formData.product}
              onChange={(e) => setFormData((prev) => ({ ...prev, product: e.target.value }))}
              placeholder={t("listings.egTomatoes")}
            />
          </label>

          <label>
            {t("listings.price")}
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData((prev) => ({ ...prev, price: e.target.value }))}
            />
          </label>

          <label>
            {t("listings.unit")}
            <select value={formData.unit} onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}>
              <option value="kg">{t("listings.perKg")}</option>
              <option value="unit">{t("listings.perUnit")}</option>
              <option value="tray">{t("listings.perTray")}</option>
              <option value="bunch">{t("listings.perBunch")}</option>
              <option value="litre">{t("listings.perLitre")}</option>
            </select>
          </label>

          <label>
            {t("listings.quantityAvailableOptional")}
            <input
              type="number"
              min="0"
              value={formData.quantity}
              onChange={(e) => setFormData((prev) => ({ ...prev, quantity: e.target.value }))}
            />
          </label>

          <label className="listing-photo-field">
            {t("listings.photoOptional")}
            {(imagePreview || existingImageUrl) ? (
              <div className="listing-photo-preview">
                <img src={imagePreview || existingImageUrl} alt={t("listings.listing")} />
                <button type="button" onClick={() => { handleImageSelect(null); setExistingImageUrl(null); }} aria-label={t("listings.removePhoto")}>
                  <X size={14} />
                </button>
              </div>
            ) : (
              <span className="listing-photo-placeholder">
                <ImagePlus size={16} /> {t("listings.addPhotoBuyersWillSee")}
              </span>
            )}
            <input type="file" accept="image/*" onChange={(e) => handleImageSelect(e.target.files?.[0])} />
          </label>

          <div className="listing-location-field">
            <LocationPicker value={formData.location} onChange={(location) => setFormData((prev) => ({ ...prev, location }))} />
          </div>

          <div className="listing-form-actions">
            <button className="aaf-btn aaf-btn-primary" disabled={saving}>
              {saving ? t("listings.saving") : editingId ? t("listings.saveChanges") : t("listings.postListing")}
            </button>
            {editingId && (
              <button type="button" className="aaf-btn aaf-btn-ghost" onClick={cancelEdit}>
                {t("common.cancel")}
              </button>
            )}
          </div>
        </form>
      </section>

      <section className="listings-grid">
        {listings.length === 0 ? (
          <p className="dashboard-empty-state">{t("listings.youHavenPostedAnyListingsYet")}</p>
        ) : (
          listings.map((listing) => (
            <div className="aaf-card listing-card" key={listing.id}>
              {listing.imageUrl && (
                <img src={listing.imageUrl} alt={listing.product} className="listing-card-image" />
              )}
              <div>
                <h4>{listing.product}</h4>
                <p className="listing-price">
                  N${listing.price} <span>/ {tv(listing.unit || "kg")}</span>
                </p>
                {listing.quantity != null && (
                  <p className={`listing-qty ${listing.quantity <= 0 ? "sold-out" : ""}`}>
                    {listing.quantity <= 0 ? t("listings.soldOutEditTheQuantityTo") : t("purchase.available", { count: listing.quantity })}
                  </p>
                )}
              </div>
              <div className="listing-actions">
                <button onClick={() => startEdit(listing)} aria-label={t("listings.edit")}>
                  <Pencil size={16} />
                </button>
                <button onClick={() => removeListing(listing)} aria-label={t("listings.remove")} className="danger">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))
        )}
      </section>

      <section className="aaf-card recent-sales">
        <h3>{t("listings.recentSales")}</h3>

        {sales.length === 0 ? (
          <p className="dashboard-empty-state">{t("listings.noSalesRecordedYet")}</p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>{t("listings.product")}</th>
                <th>{t("listings.amount")}</th>
                <th>{t("listings.status")}</th>
                <th>{t("listings.date")}</th>
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
                    <span className={`order-status ${sale.status}`}>{tv(STATUS_LABELS[normaliseStatus(sale.status)])}</span>
                  </td>
                  <td>{sale.createdAt?.toDate ? formatDate(sale.createdAt.toDate()) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
