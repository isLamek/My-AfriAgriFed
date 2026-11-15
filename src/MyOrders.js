import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import { normaliseStatus, STATUS_LABELS } from "./orderStatus";
import { quantityText } from "./purchase";
import "./MyOrders.css";
import { t, tv, formatDate } from "./i18n";

export default function MyOrders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [userType, setUserType] = useState(null);
  const [isOrganization, setIsOrganization] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    getDoc(doc(db, "users", uid)).then((snap) => {
      if (!snap.exists()) return;
      const data = snap.data();
      setUserType(data.userType || null);
      setIsOrganization(
        data.isOrganization === true ||
          (!!data.questionnaireData?.consumerType && data.questionnaireData.consumerType !== "Individual Buyer")
      );
    });

    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
  }, []);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const ordersQuery = query(
      collection(db, "orders"),
      where("buyerId", "==", uid),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(ordersQuery, (snapshot) => {
      setOrders(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });

    return () => unsubscribe();
  }, []);

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const navSections = buildNavSections({ userType, isAdmin: isAdminUser, activePath: "/my-orders" });

  return (
    <AppShell
      eyebrow={t("orders.purchaseHistory")}
      title={t("orders.myOrders")}
      subtitle={t("orders.everythingYouVeBoughtThroughThe")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={isAdminUser ? "admin" : isOrganization ? "organization" : userType}
    >
      <section className="aaf-card">
        {orders.length === 0 ? (
          <p className="dashboard-empty-state">
            {t("orders.noOrdersYetPurchasesYouMake")}
          </p>
        ) : (
          <table className="orders-table aaf-stack-table">
            <thead>
              <tr>
                <th>{t("orders.product")}</th>
                <th>{t("orders.amount")}</th>
                <th>{t("orders.status")}</th>
                <th>{t("orders.date")}</th>
                <th>{t("orders.reference")}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td data-label={t("orders.product")}>
                    {order.product}
                    {quantityText(order) && <span className="order-qty"> · {quantityText(order)}</span>}
                  </td>
                  <td data-label={t("orders.amount")}>
                    {order.currency || "NAD"} {order.amount}
                  </td>
                  <td data-label={t("orders.status")}>
                    <span className={`order-status ${normaliseStatus(order.status)}`}>{tv(STATUS_LABELS[normaliseStatus(order.status)])}</span>
                  </td>
                  <td data-label={t("orders.date")}>{order.createdAt?.toDate ? formatDate(order.createdAt.toDate()) : "—"}</td>
                  <td data-label={t("orders.reference")} className="order-ref">{order.transactionId}</td>
                  <td>
                    <button className="order-track" onClick={() => navigate("/track-orders")}>{t("orders.track")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
