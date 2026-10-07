import React, { useEffect, useMemo, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import toast from "react-hot-toast";
import { CalendarClock, CheckCircle2, MessageSquare, Plus, Send, Users, X } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { notifyUser } from "./notifications";
import useAccountContext from "./useAccountContext";
import AppShell from "./AppShell";
import NotificationBell from "./NotificationBell";
import CommunitySpaces from "./CommunitySpaces";
import { useNavigate } from "react-router-dom";
import { checkForContactInfo, maskContactInfo } from "./contactGuard";
import { chatWith } from "./chat";
import {
  DEMAND_UNITS,
  FILTERS,
  LIMITS,
  countByFilter,
  deadlineState,
  filterDemands,
  summarizePledges,
  validateDemand,
  validatePledge,
} from "./demandRules";
import "./DemandBoard.css";
import LocationPicker from "./LocationPicker";

const emptyDemand = { title: "", product: "", quantityNeeded: "", unit: "kg", deadline: "", notes: "", location: null };

const STEPS = [
  { n: 1, title: "A buyer posts a need", body: "What, how much, and by when. A school, a shop, a restaurant, or anyone buying in bulk." },
  { n: 2, title: "Producers pledge", body: "Each farmer pledges the amount they can supply. Several farmers can team up to cover one request." },
  { n: 3, title: "Agree and deliver", body: "Use the discussion to settle price, delivery and timing. The buyer marks it fulfilled." },
];

function FieldError({ children }) {
  return children ? <em className="demand-error">{children}</em> : null;
}

export default function DemandBoard() {
  const { userType, isAdminUser, theme, navSections, logout } = useAccountContext("/demand-board");
  const navigate = useNavigate();
  const uid = auth.currentUser?.uid;
  const isFarmer = userType === "farmer";

  const [demands, setDemands] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState("");
  const [filter, setFilter] = useState("open");
  const [formData, setFormData] = useState(emptyDemand);
  const [errors, setErrors] = useState({});
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [openDemandId, setOpenDemandId] = useState(null);

  useEffect(() => {
    const demandsQuery = query(collection(db, "demandRequests"), orderBy("createdAt", "desc"));
    return onSnapshot(
      demandsQuery,
      (snapshot) => {
        setDemands(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
        setLoaded(true);
      },
      (error) => {
        setLoadError(error.message);
        setLoaded(true);
      }
    );
  }, []);

  const counts = useMemo(() => countByFilter(demands, uid), [demands, uid]);
  const visible = useMemo(() => filterDemands(demands, filter, uid), [demands, filter, uid]);
  const set = (key) => (e) => setFormData((prev) => ({ ...prev, [key]: e.target.value }));

  const postDemand = async (event) => {
    event.preventDefault();
    const found = validateDemand(formData);
    setErrors(found);
    if (Object.keys(found).length) return;

    const user = auth.currentUser;
    setSaving(true);
    try {
      await addDoc(collection(db, "demandRequests"), {
        title: formData.title.trim(),
        product: formData.product.trim(),
        quantityNeeded: Number(formData.quantityNeeded),
        unit: formData.unit,
        deadline: formData.deadline || null,
        notes: formData.notes.trim(),
        // optional pin on the Market Map (area only, see marketLocation.js)
        location: formData.location || null,
        buyerId: user.uid,
        buyerName: user.displayName || user.email,
        buyerType: userType,
        status: "open",
        createdAt: serverTimestamp(),
      });
      toast.success("Request posted. Producers can now pledge.");
      setFormData(emptyDemand);
      setErrors({});
      setShowForm(false);
      setFilter("mine");
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

  const emptyMessage = {
    open: "No open requests right now. Buyers can post one with the button above.",
    fulfilled: "Nothing has been fulfilled yet.",
    mine: "You haven't posted a request yet.",
  }[filter];

  return (
    <AppShell
      eyebrow="Community"
      title="Demand Board"
      subtitle="Buyers post what they need in bulk. Producers pledge to supply it."
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <CommunitySpaces active="demand" userType={userType} />

      <section className="aaf-card demand-intro">
        <div className="demand-intro-head">
          <div>
            <h3>How the Demand Board works</h3>
            <p>
              This is for <strong>bulk requests that need several producers</strong>. For a chat or a question, use the
              Community Feed. For something already listed for sale, use the Marketplace.
            </p>
          </div>
          <button className="aaf-btn aaf-btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <><X size={16} /> Cancel</> : <><Plus size={16} /> Post a request</>}
          </button>
        </div>
        <ol className="demand-steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className="demand-step-n">{step.n}</span>
              <div>
                <strong>{step.title}</strong>
                <span>{step.body}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {showForm && (
        <section className="aaf-card">
          <form onSubmit={postDemand} className="demand-form" noValidate>
            <label>
              Title
              <input
                value={formData.title}
                maxLength={LIMITS.title}
                onChange={set("title")}
                placeholder="e.g. Weekly maize supply for school feeding"
                autoFocus
              />
              <FieldError>{errors.title}</FieldError>
            </label>
            <label>
              Product
              <input value={formData.product} maxLength={LIMITS.product} onChange={set("product")} placeholder="e.g. White maize" />
              <FieldError>{errors.product}</FieldError>
            </label>
            <label>
              Quantity needed
              <input type="number" min="0" inputMode="decimal" value={formData.quantityNeeded} onChange={set("quantityNeeded")} />
              <FieldError>{errors.quantityNeeded}</FieldError>
            </label>
            <label>
              Unit
              <select value={formData.unit} onChange={set("unit")}>
                {DEMAND_UNITS.map((unit) => <option key={unit} value={unit}>{unit}</option>)}
              </select>
            </label>
            <label>
              Needed by (optional)
              <input type="date" value={formData.deadline} onChange={set("deadline")} />
              <FieldError>{errors.deadline}</FieldError>
            </label>
            <label className="demand-form-notes">
              Notes
              <textarea
                rows={3}
                maxLength={LIMITS.notes}
                value={formData.notes}
                onChange={set("notes")}
                placeholder="Delivery location, quality requirements, budget range..."
              />
              <FieldError>{errors.notes}</FieldError>
            </label>
            <div className="demand-form-notes">
              <LocationPicker
                label="Deliver to (optional, puts a pin on the Market Map)"
                value={formData.location}
                onChange={(location) => setFormData((prev) => ({ ...prev, location }))}
              />
            </div>
            <button className="aaf-btn aaf-btn-primary" disabled={saving}>
              {saving ? "Posting..." : "Post request"}
            </button>
          </form>
        </section>
      )}

      <div className="demand-filters" role="tablist" aria-label="Filter requests">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "on" : ""}
            onClick={() => setFilter(f.id)}
          >
            {f.label} <span>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <section className="demand-list">
        {loadError && <p className="dashboard-empty-state">Could not load requests: {loadError}</p>}
        {!loaded && !loadError && <p className="dashboard-empty-state">Loading requests...</p>}
        {loaded && !loadError && visible.length === 0 && <p className="dashboard-empty-state">{emptyMessage}</p>}
        {visible.map((demand) => (
          <DemandCard
            key={demand.id}
            demand={demand}
            isOpenThread={openDemandId === demand.id}
            onToggleThread={() => setOpenDemandId((prev) => (prev === demand.id ? null : demand.id))}
            onMarkFulfilled={markFulfilled}
            currentUid={uid}
            currentName={auth.currentUser?.displayName || auth.currentUser?.email}
            canPledge={isFarmer}
            isAdminUser={isAdminUser}
            onMessage={(otherId, otherName) =>
              chatWith(navigate, {
                otherId,
                otherName,
                topic: { kind: "demand", id: demand.id, title: demand.title, ownerId: demand.buyerId },
              })
            }
          />
        ))}
      </section>
    </AppShell>
  );
}

function DemandCard({ demand, isOpenThread, onToggleThread, onMarkFulfilled, currentUid, currentName, canPledge, isAdminUser, onMessage }) {
  const [pledges, setPledges] = useState([]);
  const [pledgeQty, setPledgeQty] = useState("");
  const [pledgeNote, setPledgeNote] = useState("");
  const [pledgeErrors, setPledgeErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState("");

  useEffect(() => {
    const pledgesQuery = query(collection(db, "demandRequests", demand.id, "pledges"), orderBy("createdAt", "asc"));
    return onSnapshot(pledgesQuery, (snapshot) => {
      setPledges(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
  }, [demand.id]);

  useEffect(() => {
    if (!isOpenThread) return undefined;
    const messagesQuery = query(collection(db, "demandRequests", demand.id, "messages"), orderBy("createdAt", "asc"));
    return onSnapshot(messagesQuery, (snapshot) => {
      setMessages(snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
  }, [demand.id, isOpenThread]);

  const isOwnDemand = demand.buyerId === currentUid;
  const fulfilled = demand.status === "fulfilled";
  const summary = summarizePledges(demand, pledges, currentUid);
  const deadline = deadlineState(demand);
  const canPledgeHere = canPledge && !isOwnDemand && !fulfilled;
  const canMarkFulfilled = !fulfilled && (isOwnDemand || isAdminUser);

  const submitPledge = async (event) => {
    event.preventDefault();
    const found = validatePledge({ quantity: pledgeQty, note: pledgeNote }, demand);
    setPledgeErrors(found);
    if (Object.keys(found).length) return;
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
      notifyUser(demand.buyerId, {
        title: "New pledge on your request",
        body: `${currentName} can supply ${pledgeQty} ${demand.unit} of ${demand.product}.`,
        link: "/demand-board",
      });
    } catch (error) {
      toast.error(error.code === "permission-denied" ? "Only producer accounts can pledge." : error.message);
    }
  };

  const withdrawPledge = async (pledge) => {
    if (!window.confirm("Withdraw this pledge?")) return;
    try {
      await deleteDoc(doc(db, "demandRequests", demand.id, "pledges", pledge.id));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!messageText.trim()) return;
    const contact = checkForContactInfo(messageText);
    if (!contact.ok) {
      toast.error(contact.message);
      return;
    }
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
          <div className="demand-badges">
            <span className={`aaf-pill ${fulfilled ? "aaf-pill-success" : "aaf-pill-warning"}`}>{fulfilled ? "Fulfilled" : "Open"}</span>
            {isOwnDemand && <span className="aaf-pill">Your request</span>}
            {!fulfilled && summary.covered && <span className="aaf-pill aaf-pill-success">Fully pledged</span>}
            {deadline === "overdue" && <span className="aaf-pill demand-pill-danger">Past its date</span>}
            {deadline === "soon" && <span className="aaf-pill demand-pill-danger">Needed soon</span>}
          </div>
          <h3>{demand.title}</h3>
          <p className="demand-meta">
            {demand.product} · {demand.quantityNeeded} {demand.unit} needed
            {demand.deadline && (
              <span className="demand-deadline"><CalendarClock size={13} /> by {demand.deadline}</span>
            )}
          </p>
          <p className="demand-buyer">Posted by {demand.buyerName}</p>
        </div>
        {canMarkFulfilled && (
          <button className="aaf-btn aaf-btn-ghost" onClick={() => onMarkFulfilled(demand)}>
            <CheckCircle2 size={16} /> Mark fulfilled
          </button>
        )}
      </div>

      {demand.notes && <p className="demand-notes">{maskContactInfo(demand.notes)}</p>}

      <div className="demand-progress">
        <div className="demand-progress-bar" role="progressbar" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="demand-progress-fill" style={{ width: `${summary.percent}%` }} />
        </div>
        <span className="demand-progress-label">
          <Users size={14} /> {summary.pledged} / {demand.quantityNeeded} {demand.unit} pledged by {summary.count}{" "}
          {summary.count === 1 ? "producer" : "producers"}
          {!fulfilled && summary.remaining > 0 && summary.count > 0 && ` · ${summary.remaining} ${demand.unit} still needed`}
        </span>
      </div>

      {pledges.length > 0 && (
        <ul className="demand-pledges">
          {pledges.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.farmerName}</strong> · {p.quantity} {demand.unit}
                {p.note ? <em> · {maskContactInfo(p.note)}</em> : null}
              </span>
              {p.farmerId === currentUid && !fulfilled && (
                <button type="button" onClick={() => withdrawPledge(p)} aria-label="Withdraw pledge">Withdraw</button>
              )}
              {isOwnDemand && p.farmerId !== currentUid && onMessage && (
                <button type="button" className="pledge-message" onClick={() => onMessage(p.farmerId, p.farmerName)}>
                  Message
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {canPledgeHere && (
        <form onSubmit={submitPledge} className="pledge-form" noValidate>
          <div className="pledge-field">
            <input
              type="number"
              min="0"
              inputMode="decimal"
              placeholder={`How much can you supply (${demand.unit})`}
              value={pledgeQty}
              onChange={(e) => setPledgeQty(e.target.value)}
              aria-label="Quantity you can supply"
            />
            <FieldError>{pledgeErrors.quantity || pledgeErrors.demand}</FieldError>
          </div>
          <div className="pledge-field">
            <input
              placeholder="Note, e.g. ready 15 Oct (optional)"
              maxLength={LIMITS.pledgeNote}
              value={pledgeNote}
              onChange={(e) => setPledgeNote(e.target.value)}
              aria-label="Note for the buyer"
            />
            <FieldError>{pledgeErrors.note}</FieldError>
          </div>
          <button className="aaf-btn aaf-btn-accent" type="submit">Pledge</button>
        </form>
      )}
      {!canPledge && !isOwnDemand && !fulfilled && (
        <p className="demand-hint">Only producer accounts can pledge. Use the discussion to ask the buyer a question.</p>
      )}

      {canPledge && !isOwnDemand && onMessage && (
        <button type="button" className="demand-message-btn" onClick={() => onMessage(demand.buyerId, demand.buyerName)}>
          <MessageSquare size={14} aria-hidden="true" /> Message buyer privately
        </button>
      )}

      <button className="demand-thread-toggle" onClick={onToggleThread}>
        <MessageSquare size={15} /> {isOpenThread ? "Hide discussion" : "Open discussion"}
      </button>

      {isOpenThread && (
        <div className="demand-thread">
          <div className="demand-thread-messages">
            {messages.length === 0 ? (
              <p className="dashboard-empty-state">No messages yet. Start coordinating.</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`demand-message ${msg.authorId === currentUid ? "own" : ""}`}>
                  <span className="demand-message-author">{msg.authorName}</span>
                  <p>{maskContactInfo(msg.text)}</p>
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="demand-thread-input">
            <input
              placeholder="Coordinate on quantities, delivery, timing..."
              value={messageText}
              maxLength={500}
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
