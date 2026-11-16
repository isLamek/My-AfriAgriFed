// Admin tools for delivery: approve carriers, decide problems the buyers reported, and see jobs
// nobody has taken. Admin screens stay in English (like the rest of the admin area).

import React, { useEffect, useState } from "react";
import { collection, doc, getDoc, onSnapshot, query, serverTimestamp, updateDoc, where } from "firebase/firestore";
import toast from "react-hot-toast";
import { db } from "./firebaseConfig";
import { resolveProblem } from "./delivery/api";
import { notifyUser } from "./notifications";

const money = (n) => `N$${Number(n || 0).toLocaleString("en-NA", { maximumFractionDigits: 2 })}`;
const ago = (ms) => {
  const h = Math.round((Date.now() - ms) / 3600000);
  return h < 1 ? "less than an hour ago" : h < 48 ? `${h} h ago` : `${Math.round(h / 24)} days ago`;
};

function Carriers() {
  const [carriers, setCarriers] = useState(null);
  useEffect(() => onSnapshot(collection(db, "carriers"), (s) => setCarriers(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setCarriers([])), []);

  const setStatus = async (carrier, status) => {
    try {
      await updateDoc(doc(db, "carriers", carrier.id), { status, updatedAt: serverTimestamp() });
      if (status === "approved") {
        await notifyUser(carrier.id, { title: "You are approved as a carrier", body: "You can now take delivery jobs.", link: "/carrier" });
      }
      toast.success(`${carrier.name}: ${status}`);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const order = { pending: 0, approved: 1, suspended: 2 };
  const sorted = [...(carriers || [])].sort((a, b) => (order[a.status] ?? 3) - (order[b.status] ?? 3));
  return (
    <section className="admin-panel">
      <h2>Carriers</h2>
      <p>People with a vehicle who deliver orders for sellers that cannot deliver themselves. Check each application (ask for a driver's licence and vehicle registration) before approving.</p>
      {carriers === null && <p>Loading…</p>}
      {carriers && carriers.length === 0 && <p>No carrier applications yet.</p>}
      {sorted.length > 0 && (
        <table className="admin-table aaf-stack-table">
          <thead>
            <tr><th>Name</th><th>Phone</th><th>Vehicle</th><th>Regions</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {sorted.map((c) => (
              <tr key={c.id}>
                <td data-label="Name">{c.name}</td>
                <td data-label="Phone">{c.phone}</td>
                <td data-label="Vehicle">{c.vehicle?.type}{c.vehicle?.description ? `, ${c.vehicle.description}` : ""}{c.vehicle?.plate ? ` (${c.vehicle.plate})` : ""}</td>
                <td data-label="Regions">{(c.regions || []).join(", ") || "any"}</td>
                <td data-label="Status"><strong>{c.status}</strong></td>
                <td>
                  {c.status !== "approved" && <button type="button" onClick={() => setStatus(c, "approved")}>Approve</button>}{" "}
                  {c.status === "approved" && <button type="button" onClick={() => setStatus(c, "suspended")}>Suspend</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

function Problem({ dispute }) {
  const [order, setOrder] = useState(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    getDoc(doc(db, "orders", dispute.id)).then((s) => setOrder(s.exists() ? s.data() : null)).catch(() => setOrder(null));
  }, [dispute.id]);

  const decide = async (outcome) => {
    if (!window.confirm(outcome === "refund" ? "Refund the buyer? The goods go back on sale and the buyer's money is returned." : "Pay the seller? The buyer's problem is closed.")) return;
    setBusy(true);
    try {
      await resolveProblem(dispute.id, { outcome, note });
      toast.success(outcome === "refund" ? "Buyer will be refunded." : "Seller will be paid.");
    } catch (error) {
      toast.error(error.message);
    }
    setBusy(false);
  };

  return (
    <li className="admin-problem">
      <strong>{dispute.product}</strong> · {money(dispute.amount)} · reported {ago(dispute.createdAt)}
      <br />
      Reason: <strong>{dispute.reason.replace(/_/g, " ")}</strong>{dispute.text ? `: “${dispute.text}”` : ""}
      {order && (
        <>
          <br />
          Buyer: {order.buyerName} · Seller: {order.sellerName} · method: {order.fulfilment?.method || "seller"}
          {order.fulfilment?.carrier ? ` · carrier: ${order.fulfilment.carrier.name}` : ""}
          {order.fulfilment?.verified === false ? " · handed over WITHOUT the code" : ""}
        </>
      )}
      <br />
      <input type="text" placeholder="Note for the record" value={note} maxLength={280} onChange={(e) => setNote(e.target.value)} style={{ width: "min(420px, 100%)", margin: "6px 6px 0 0" }} />
      <button type="button" disabled={busy} onClick={() => decide("refund")}>Refund the buyer</button>{" "}
      <button type="button" disabled={busy} onClick={() => decide("release")}>Pay the seller</button>
    </li>
  );
}

function Problems() {
  const [list, setList] = useState(null);
  useEffect(() => onSnapshot(query(collection(db, "disputes"), where("status", "==", "open")), (s) => setList(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setList([])), []);
  return (
    <section className="admin-panel">
      <h2>Problems reported by buyers</h2>
      <p>No money is paid to the seller while a problem is open. Decide with the facts: message both people from the order, look at the delivery history, and note whether the handover used the buyer's code.</p>
      {list === null && <p>Loading…</p>}
      {list && list.length === 0 && <p>No open problems.</p>}
      {list && list.length > 0 && <ul className="admin-problems">{list.sort((a, b) => a.createdAt - b.createdAt).map((d) => <Problem key={d.id} dispute={d} />)}</ul>}
    </section>
  );
}

function Stuck() {
  const [jobs, setJobs] = useState(null);
  useEffect(() => onSnapshot(query(collection(db, "deliveryJobs"), where("status", "==", "open")), (s) => setJobs(s.docs.map((d) => ({ id: d.id, ...d.data() }))), () => setJobs([])), []);
  const waiting = (jobs || []).filter((j) => j.escalated);
  return (
    <section className="admin-panel">
      <h2>Delivery jobs nobody has taken</h2>
      <p>These waited more than a few hours. Phone a carrier, or ask the seller to deliver or the buyer to collect (then cancel the job by cancelling the order).</p>
      {jobs === null && <p>Loading…</p>}
      {jobs && waiting.length === 0 && <p>None. {jobs.length} open job(s) are still within the normal waiting time.</p>}
      {waiting.length > 0 && (
        <ul className="admin-problems">
          {waiting.map((j) => (
            <li key={j.id}>
              <strong>{j.what}</strong> · {j.pickup.label} → {j.dropoff.label} · {j.km} km · {j.vehicle} · fee {money(j.fee)} · open for {ago(j.createdAt)} (order {j.id})
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default function AdminDelivery() {
  return (
    <>
      <Problems />
      <Carriers />
      <Stuck />
    </>
  );
}
