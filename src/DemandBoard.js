import React, { useEffect, useState } from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { signOut } from "firebase/auth";
import toast from "react-hot-toast";
import { MessageSquare, Send, Plus, CheckCircle2, Users } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import "./DemandBoard.css";

const emptyDemand = { title: "", product: "", quantityNeeded: "", unit: "kg", deadline: "", notes: "" };

export default function DemandBoard() {
  const [userType, setUserType] = useState(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [demands, setDemands] = useState([]);
  const [formData, setFormData] = useState(emptyDemand);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openDemandId, setOpenDemandId] = useState(null);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
    getDoc(doc(db, "users", uid)).then((snap) => {
      setUserType(snap.exists() ? snap.data().userType : null);
    });
  }, []);

  useEffect(() => {
    const demandsQuery = query(collection(db, "demandRequests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(demandsQuery, (snapshot) => {
      setDemands(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
    return () => unsubscribe();
  }, []);

  const postDemand = async (event) => {
    event.preventDefault();
    const user = auth.currentUser;

    if (!formData.title.trim() || !formData.product.trim() || !formData.quantityNeeded) {
      toast.error("Add a title, product and quantity needed.");
      return;
    }

    setSaving(true);
    try {
      await addDoc(collection(db, "demandRequests"), {
        title: formData.title.trim(),
        product: formData.product.trim(),
        quantityNeeded: Number(formData.quantityNeeded),
        unit: formData.unit,
        deadline: formData.deadline || null,
        notes: formData.notes.trim(),
        buyerId: user.uid,
        buyerName: user.displayName || user.email,
        buyerType: userType,
        status: "open",
        createdAt: serverTimestamp(),
      });
      toast.success("Demand posted to the board.");
      setFormData(emptyDemand);
      setShowForm(false);
    } catch (error) {
      toast.error(error.message);
    } finally {
      setSaving(false);
    }
  };

  const markFulfilled = async (demand) => {
    try {
      await updateDoc(doc(db, "demandRequests", demand.id), { status: "fulfilled" });
      toast.success("Marked as fulfilled.");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const logout = async () => {
    await signOut(auth);
    window.location.href = "/";
  };

  const theme = isAdminUser ? "admin" : userType === "farmer" ? "farmer" : userType === "institution" ? "institution" : "consumer";
  const navSections = buildNavSections({ userType, isAdmin: isAdminUser, activePath: "/demand-board" });

  return (
    <AppShell
      eyebrow="Coordination"
      title="Demand Board"
      subtitle="Buyers post what they need. Producers team up to meet it."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <section className="aaf-card demand-intro">
        <div>
          <h3>Post what you need</h3>
          <p>
            Institutions, consumers or farmers needing bulk supply can post a demand here. Farmers can
            pledge quantities toward it - individually or teaming up with other farmers to cover the
            full amount - and coordinate directly in each post's thread.
          </p>
        </div>
        <button className="aaf-btn aaf-btn-primary" onClick={() => setShowForm((prev) => !prev)}>
          <Plus size={16} /> {showForm ? "Cancel" : "Post a Demand"}
        </button>
      </section>

      {showForm && (
        <section className="aaf-card">
          <form onSubmit={postDemand} className="demand-form">
            <label>
              Title
              <input
                value={formData.title}
                onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Weekly maize supply for school feeding program"
              />
            </label>
            <label>
              Product
              <input
                value={formData.product}
                onChange={(e) => setFormData((prev) => ({ ...prev, product: e.target.value }))}
                placeholder="e.g., White maize"
              />
            </label>
            <label>
              Quantity needed
              <input
                type="number"
                min="0"
                value={formData.quantityNeeded}
                onChange={(e) => setFormData((prev) => ({ ...prev, quantityNeeded: e.target.value }))}
              />
            </label>
            <label>
              Unit
              <select value={formData.unit} onChange={(e) => setFormData((prev) => ({ ...prev, unit: e.target.value }))}>
                <option value="kg">kg</option>
                <option value="ton">ton</option>
                <option value="unit">unit</option>
                <option value="crate">crate</option>
                <option value="litre">litre</option>
              </select>
            </label>
            <label>
              Needed by (optional)
              <input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData((prev) => ({ ...prev, deadline: e.target.value }))}
              />
            </label>
            <label className="demand-form-notes">
              Notes
              <textarea
                rows={3}
                value={formData.notes}
                onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                placeholder="Delivery location, quality requirements, budget range..."
              />
            </label>
            <button className="aaf-btn aaf-btn-primary" disabled={saving}>
              {saving ? "Posting..." : "Post Demand"}
            </button>
          </form>
        </section>
      )}

      <section className="demand-list">
        {demands.length === 0 ? (
          <p className="dashboard-empty-state">No open demand yet. Be the first to post one.</p>
        ) : (
          demands.map((demand) => (
            <DemandCard
              key={demand.id}
              demand={demand}
              isOpenThread={openDemandId === demand.id}
              onToggleThread={() => setOpenDemandId((prev) => (prev === demand.id ? null : demand.id))}
              onMarkFulfilled={markFulfilled}
              currentUid={auth.currentUser?.uid}
              currentName={auth.currentUser?.displayName || auth.currentUser?.email}
              isAdminUser={isAdminUser}
            />
          ))
        )}
      </section>
    </AppShell>
  );
}

function DemandCard({ demand, isOpenThread, onToggleThread, onMarkFulfilled, currentUid, currentName, isAdminUser }) {
  const [pledges, setPledges] = useState([]);
  const [pledgeQty, setPledgeQty] = useState("");
  const [pledgeNote, setPledgeNote] = useState("");
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const pledgesQuery = query(collection(db, "demandRequests", demand.id, "pledges"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(pledgesQuery, (snapshot) => {
      setPledges(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
    return () => unsubscribe();
  }, [demand.id]);

  useEffect(() => {
    if (!isOpenThread) return;
    const messagesQuery = query(collection(db, "demandRequests", demand.id, "messages"), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
    return () => unsubscribe();
  }, [demand.id, isOpenThread]);

  const pledgedTotal = pledges.reduce((sum, p) => sum + (Number(p.quantity) || 0), 0);
  const progressPct = Math.min(100, Math.round((pledgedTotal / demand.quantityNeeded) * 100)) || 0;
  const isOwnDemand = demand.buyerId === currentUid;

  const submitPledge = async (event) => {
    event.preventDefault();
    if (!pledgeQty || Number(pledgeQty) <= 0) {
      toast.error("Enter how much you can supply.");
      return;
    }
    try {
      await addDoc(collection(db, "demandRequests", demand.id, "pledges"), {
        farmerId: currentUid,
        farmerName: currentName,
        quantity: Number(pledgeQty),
        note: pledgeNote.trim(),
        createdAt: serverTimestamp(),
      });
      toast.success("Pledge added.");
      setPledgeQty("");
      setPledgeNote("");
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    try {
      await addDoc(collection(db, "demandRequests", demand.id, "messages"), {
        authorId: currentUid,
        authorName: currentName,
        text: messageText.trim(),
        createdAt: serverTimestamp(),
      });
      setMessageText("");
    } catch (error) {
      toast.error(error.message);
    }
  };

  return (
    <div className="aaf-card demand-card">
      <div className="demand-card-header">
        <div>
          <span className={`aaf-pill ${demand.status === "fulfilled" ? "aaf-pill-success" : "aaf-pill-warning"}`}>
            {demand.status === "fulfilled" ? "Fulfilled" : "Open"}
          </span>
          <h3>{demand.title}</h3>
          <p className="demand-meta">
            {demand.product} · {demand.quantityNeeded} {demand.unit} needed
            {demand.deadline ? ` · by ${demand.deadline}` : ""}
          </p>
          <p className="demand-buyer">Posted by {demand.buyerName}</p>
        </div>
        {isOwnDemand && demand.status !== "fulfilled" && (
          <button className="aaf-btn aaf-btn-ghost" onClick={() => onMarkFulfilled(demand)}>
            <CheckCircle2 size={16} /> Mark Fulfilled
          </button>
        )}
        {isAdminUser && !isOwnDemand && demand.status !== "fulfilled" && (
          <button className="aaf-btn aaf-btn-ghost" onClick={() => onMarkFulfilled(demand)}>
            <CheckCircle2 size={16} /> Mark Fulfilled
          </button>
        )}
      </div>

      {demand.notes && <p className="demand-notes">{demand.notes}</p>}

      <div className="demand-progress">
        <div className="demand-progress-bar">
          <div className="demand-progress-fill" style={{ width: `${progressPct}%` }} />
        </div>
        <span className="demand-progress-label">
          <Users size={14} /> {pledgedTotal} / {demand.quantityNeeded} {demand.unit} pledged ({pledges.length}{" "}
          {pledges.length === 1 ? "producer" : "producers"})
        </span>
      </div>

      {demand.status !== "fulfilled" && (
        <form onSubmit={submitPledge} className="pledge-form">
          <input
            type="number"
            min="0"
            placeholder={`Quantity you can supply (${demand.unit})`}
            value={pledgeQty}
            onChange={(e) => setPledgeQty(e.target.value)}
          />
          <input
            placeholder="Note (optional)"
            value={pledgeNote}
            onChange={(e) => setPledgeNote(e.target.value)}
          />
          <button className="aaf-btn aaf-btn-accent" type="submit">
            Pledge
          </button>
        </form>
      )}

      <button className="demand-thread-toggle" onClick={onToggleThread}>
        <MessageSquare size={15} /> {isOpenThread ? "Hide discussion" : "Open discussion"}
      </button>

      {isOpenThread && (
        <div className="demand-thread">
          <div className="demand-thread-messages">
            {messages.length === 0 ? (
              <p className="dashboard-empty-state">No messages yet - start coordinating.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`demand-message ${msg.authorId === currentUid ? "own" : ""}`}>
                  <span className="demand-message-author">{msg.authorName}</span>
                  <p>{msg.text}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="demand-thread-input">
            <input
              placeholder="Coordinate on quantities, delivery, timing..."
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button className="aaf-btn aaf-btn-primary" type="submit" aria-label="Send">
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
