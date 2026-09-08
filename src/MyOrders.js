import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, orderBy, query, where } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import "./MyOrders.css";

export default function MyOrders() {
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
      eyebrow="Purchase history"
      title="My Orders"
      subtitle="Everything you've bought through the AfriAgriFed marketplace."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={isAdminUser ? "admin" : isOrganization ? "organization" : userType}
    >
      <section className="aaf-card">
        {orders.length === 0 ? (
          <p className="dashboard-empty-state">
            No orders yet. Purchases you make on the Marketplace will show up here.
          </p>
        ) : (
          <table className="orders-table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Amount</th>
                <th>Status</th>
                <th>Date</th>
                <th>Reference</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>{order.product}</td>
                  <td>
                    {order.currency || "NAD"} {order.amount}
                  </td>
                  <td>
                    <span className={`order-status ${order.status}`}>{order.status}</span>
                  </td>
                  <td>{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : "—"}</td>
                  <td className="order-ref">{order.transactionId}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </AppShell>
  );
}
