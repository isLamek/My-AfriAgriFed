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
import TranslatableText from "./translate/TranslatableText";
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
import { t, tv, tRich } from "./i18n";

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
      toast.success(t("demand.requestPostedProducersCanNowPledge"));
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
      toast.success(t("demand.markedAsFulfilled"));
    } catch (error) {
      toast.error(error.message);
    }
  };

  const emptyMessage = {
    open: t("demand.emptyOpen"),
    fulfilled: t("demand.emptyFulfilled"),
    mine: t("demand.emptyMine"),
  }[filter];

  return (
    <AppShell
      eyebrow={t("demand.community")}
      title={t("demand.demandBoard")}
      subtitle={t("demand.buyersPostWhatTheyNeedIn")}
      navSections={navSections}
      headerRight={<NotificationBell />}
      onLogout={logout}
      theme={theme}
    >
      <CommunitySpaces active="demand" userType={userType} />

      <section className="aaf-card demand-intro">
        <div className="demand-intro-head">
          <div>
            <h3>{t("demand.howTheDemandBoardWorks")}</h3>
            <p>{tRich("demand.introText", { bulk: <strong>{t("demand.introBulk")}</strong> })}</p>
          </div>
          <button className="aaf-btn aaf-btn-primary" onClick={() => setShowForm((prev) => !prev)}>
            {showForm ? <><X size={16} /> {t("common.cancel")}</> : <><Plus size={16} /> {t("demand.postRequest")}</>}
          </button>
        </div>
        <ol className="demand-steps">
          {STEPS.map((step) => (
            <li key={step.n}>
              <span className="demand-step-n">{step.n}</span>
              <div>
                <strong>{tv(step.title)}</strong>
                <span>{tv(step.body)}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {showForm && (
        <section className="aaf-card">
          <form onSubmit={postDemand} className="demand-form" noValidate>
            <label>
              {t("demand.title")}
              <input
                value={formData.title}
                maxLength={LIMITS.title}
                onChange={set("title")}
                placeholder={t("demand.egWeeklyMaizeSupplyForSchool")}
                autoFocus
              />
              <FieldError>{errors.title}</FieldError>
            </label>
            <label>
              {t("demand.product")}
              <input value={formData.product} maxLength={LIMITS.product} onChange={set("product")} placeholder={t("demand.egWhiteMaize")} />
              <FieldError>{errors.product}</FieldError>
            </label>
            <label>
              {t("demand.quantityNeeded")}
              <input type="number" min="0" inputMode="decimal" value={formData.quantityNeeded} onChange={set("quantityNeeded")} />
              <FieldError>{errors.quantityNeeded}</FieldError>
            </label>
            <label>
              {t("demand.unit")}
              <select value={formData.unit} onChange={set("unit")}>
                {DEMAND_UNITS.map((unit) => <option key={unit} value={unit}>{tv(unit)}</option>)}
              </select>
            </label>
            <label>
              {t("demand.neededByOptional")}
              <input type="date" value={formData.deadline} onChange={set("deadline")} />
              <FieldError>{errors.deadline}</FieldError>
            </label>
            <label className="demand-form-notes">
              {t("demand.notes")}
              <textarea
                rows={3}
                maxLength={LIMITS.notes}
                value={formData.notes}
                onChange={set("notes")}
                placeholder={t("demand.deliveryLocationQualityRequirementsBudgetRan")}
              />
              <FieldError>{errors.notes}</FieldError>
            </label>
            <div className="demand-form-notes">
              <LocationPicker
                label={t("demand.deliverTo")}
                value={formData.location}
                onChange={(location) => setFormData((prev) => ({ ...prev, location }))}
              />
            </div>
            <button className="aaf-btn aaf-btn-primary" disabled={saving}>
              {saving ? t("demand.posting") : t("demand.postRequest2")}
            </button>
          </form>
        </section>
      )}

      <div className="demand-filters" role="tablist" aria-label={t("demand.filterRequests")}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={filter === f.id ? "on" : ""}
            onClick={() => setFilter(f.id)}
          >
            {tv(f.label)} <span>{counts[f.id]}</span>
          </button>
        ))}
      </div>

      <section className="demand-list">
        {loadError && <p className="dashboard-empty-state">{t("demand.couldNotLoad", { error: loadError })}</p>}
        {!loaded && !loadError && <p className="dashboard-empty-state">{t("demand.loadingRequests")}</p>}
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
      toast.success(t("demand.pledgeAdded"));
      setPledgeQty("");
      setPledgeNote("");
      notifyUser(demand.buyerId, {
        key: "notif.pledge",
        params: { name: currentName, qty: pledgeQty, unit: demand.unit, product: demand.product },
        link: "/demand-board",
      });
    } catch (error) {
      toast.error(error.code === "permission-denied" ? t("demand.onlyProducerAccountsCanPledge") : error.message);
    }
  };

  const withdrawPledge = async (pledge) => {
    if (!window.confirm(t("demand.withdrawThisPledge"))) return;
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
            <span className={`aaf-pill ${fulfilled ? "aaf-pill-success" : "aaf-pill-warning"}`}>{fulfilled ? t("demand.fulfilled") : t("demand.open")}</span>
            {isOwnDemand && <span className="aaf-pill">{t("demand.yourRequest")}</span>}
            {!fulfilled && summary.covered && <span className="aaf-pill aaf-pill-success">{t("demand.fullyPledged")}</span>}
            {deadline === "overdue" && <span className="aaf-pill demand-pill-danger">{t("demand.pastItsDate")}</span>}
            {deadline === "soon" && <span className="aaf-pill demand-pill-danger">{t("demand.neededSoon")}</span>}
          </div>
          <h3>{demand.title}</h3>
          <p className="demand-meta">
            {demand.product} · {t("demand.neededQty", { qty: demand.quantityNeeded, unit: tv(demand.unit) })}
            {demand.deadline && (
              <span className="demand-deadline"><CalendarClock size={13} /> {t("demand.byDate", { date: demand.deadline })}</span>
            )}
          </p>
          <p className="demand-buyer">{t("demand.postedBy", { name: demand.buyerName })}</p>
        </div>
        {canMarkFulfilled && (
          <button className="aaf-btn aaf-btn-ghost" onClick={() => onMarkFulfilled(demand)}>
            <CheckCircle2 size={16} /> {t("demand.markFulfilled")}
          </button>
        )}
      </div>

      {demand.notes && <TranslatableText className="demand-notes" text={maskContactInfo(demand.notes)} />}

      <div className="demand-progress">
        <div className="demand-progress-bar" role="progressbar" aria-valuenow={summary.percent} aria-valuemin={0} aria-valuemax={100}>
          <div className="demand-progress-fill" style={{ width: `${summary.percent}%` }} />
        </div>
        <span className="demand-progress-label">
          <Users size={14} /> {t("demand.pledgedBy", { pledged: summary.pledged, needed: demand.quantityNeeded, unit: tv(demand.unit), count: summary.count })}
          {!fulfilled && summary.remaining > 0 && summary.count > 0 && ` · ${t("demand.stillNeeded", { remaining: summary.remaining, unit: tv(demand.unit) })}`}
        </span>
      </div>

      {pledges.length > 0 && (
        <ul className="demand-pledges">
          {pledges.map((p) => (
            <li key={p.id}>
              <span>
                <strong>{p.farmerName}</strong> · {p.quantity} {tv(demand.unit)}
                {p.note ? <em> · {maskContactInfo(p.note)}</em> : null}
              </span>
              {p.farmerId === currentUid && !fulfilled && (
                <button type="button" onClick={() => withdrawPledge(p)} aria-label={t("demand.withdrawPledge")}>{t("demand.withdraw")}</button>
              )}
              {isOwnDemand && p.farmerId !== currentUid && onMessage && (
                <button type="button" className="pledge-message" onClick={() => onMessage(p.farmerId, p.farmerName)}>
                  {t("demand.message")}
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
              placeholder={t("demand.howMuchCanYouSupply", { unit: tv(demand.unit) })}
              value={pledgeQty}
              onChange={(e) => setPledgeQty(e.target.value)}
              aria-label={t("demand.quantityYouCanSupply")}
            />
            <FieldError>{pledgeErrors.quantity || pledgeErrors.demand}</FieldError>
          </div>
          <div className="pledge-field">
            <input
              placeholder={t("demand.noteEgReady15OctOptional")}
              maxLength={LIMITS.pledgeNote}
              value={pledgeNote}
              onChange={(e) => setPledgeNote(e.target.value)}
              aria-label={t("demand.noteForTheBuyer")}
            />
            <FieldError>{pledgeErrors.note}</FieldError>
          </div>
          <button className="aaf-btn aaf-btn-accent" type="submit">{t("demand.pledge")}</button>
        </form>
      )}
      {!canPledge && !isOwnDemand && !fulfilled && (
        <p className="demand-hint">{t("demand.onlyProducerAccountsCanPledgeUse")}</p>
      )}

      {canPledge && !isOwnDemand && onMessage && (
        <button type="button" className="demand-message-btn" onClick={() => onMessage(demand.buyerId, demand.buyerName)}>
          <MessageSquare size={14} aria-hidden="true" /> {t("demand.messageBuyerPrivately")}
        </button>
      )}

      <button className="demand-thread-toggle" onClick={onToggleThread}>
        <MessageSquare size={15} /> {isOpenThread ? t("demand.hideDiscussion") : t("demand.openDiscussion")}
      </button>

      {isOpenThread && (
        <div className="demand-thread">
          <div className="demand-thread-messages">
            {messages.length === 0 ? (
              <p className="dashboard-empty-state">{t("demand.noMessagesYetStartCoordinating")}</p>
            ) : (
              messages.map((msg) => (
                <div key={msg.id} className={`demand-message ${msg.authorId === currentUid ? "own" : ""}`}>
                  <span className="demand-message-author">{msg.authorName}</span>
                  <TranslatableText text={maskContactInfo(msg.text)} />
                </div>
              ))
            )}
          </div>
          <form onSubmit={sendMessage} className="demand-thread-input">
            <input
              placeholder={t("demand.coordinateOnQuantitiesDeliveryTiming")}
              value={messageText}
              maxLength={500}
              onChange={(e) => setMessageText(e.target.value)}
            />
            <button className="aaf-btn aaf-btn-primary" type="submit" aria-label={t("common.send")}>
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
