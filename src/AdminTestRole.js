import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { doc, getDoc, setDoc } from "firebase/firestore";
import toast from "react-hot-toast";
import { Building2, ChevronDown, FlaskConical, GraduationCap, ShieldCheck, ShoppingBasket, Tractor } from "lucide-react";
import { auth, db } from "./firebaseConfig";
import { isAdmin } from "./admin";
import "./AdminTestRole.css";

// What an admin can switch into, to test every part of the app as that person.
export const TEST_ROLES = [
  { id: "farmer", label: "Farmer", detail: "List produce, pledge to requests, farms on the map, sales", icon: Tractor, home: "/dashboard" },
  { id: "consumer", label: "Buyer", detail: "Marketplace, pay, track orders, message sellers", icon: ShoppingBasket, home: "/dashboard" },
  { id: "organization", label: "Organisation buyer", detail: "School, shop or co-op: post bulk requests", icon: Building2, home: "/demand-board" },
  { id: "institution", label: "Institution", detail: "Publish research, training and internships", icon: GraduationCap, home: "/institutiondashboard" },
];

/** The admin's own profile, set up so every role-checked feature works for them. */
export function testProfile(roleId, user) {
  const institution = roleId === "institution";
  const organization = roleId === "organization";
  const userType = roleId === "organization" ? "consumer" : roleId;
  return {
    uid: user.uid,
    userType,
    isOrganization: organization,
    approved: true,
    status: "verified",
    accountStatus: { registrationStatus: "verified", documentStatus: userType === "consumer" ? "not_required" : "approved" },
    personalInfo: { email: user.email || "", firstName: (user.displayName || "Admin").split(" ")[0], lastName: "(test)" },
    questionnaireData: organization
      ? { consumerType: "Retailer", businessName: "Test organisation (admin)" }
      : institution
      ? { institutionName: "Test institution (admin)" }
      : roleId === "farmer"
      ? { region: "Oshana", mainCrops: "Mahangu" }
      : {},
    adminTestRole: roleId,
  };
}

export const roleLabel = (id) => TEST_ROLES.find((r) => r.id === id)?.label || "";
// Only a real role id counts (older test data may hold something else).
const knownRole = (value) => (TEST_ROLES.some((r) => r.id === value) ? value : null);

/** Turns the signed-in admin's own account into that kind of member. */
export async function switchTestRole(role) {
  const user = auth.currentUser;
  if (!user) throw new Error("Please sign in again.");
  await setDoc(doc(db, "users", user.uid), testProfile(role.id, user), { merge: true });
  toast.success(`You are now testing as: ${role.label}. The admin tools stay in the menu.`);
}

const switchError = (error) =>
  toast.error(error.code === "permission-denied" ? "Only a verified admin can switch roles." : error.message);

/** Admin Dashboard card: switch into any role with one click. */
export default function AdminTestRole() {
  const navigate = useNavigate();
  const [current, setCurrent] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    getDoc(doc(db, "users", uid)).then((snap) => setCurrent(snap.exists() ? knownRole(snap.data().adminTestRole) : null));
  }, []);

  const switchTo = async (role) => {
    setBusy(true);
    try {
      await switchTestRole(role);
      setCurrent(role.id);
      navigate(role.home);
    } catch (error) {
      switchError(error);
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="test-role aaf-card">
      <div className="test-role-head">
        <FlaskConical size={18} aria-hidden="true" />
        <div>
          <h2>Test the app as...</h2>
          <p>
            Your own account becomes that kind of member, already approved, so you can try every feature for real. Your
            admin tools stay in the menu. {current ? `Currently testing as: ${roleLabel(current)}.` : "You are not testing a role right now."}
          </p>
        </div>
      </div>
      <div className="test-role-grid">
        {TEST_ROLES.map((role) => {
          const Icon = role.icon;
          return (
            <button
              key={role.id}
              type="button"
              className={`test-role-btn ${current === role.id ? "on" : ""}`}
              disabled={busy}
              onClick={() => switchTo(role)}
            >
              <Icon size={20} aria-hidden="true" />
              <strong>{role.label}</strong>
              <span>{role.detail}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** A slim strip on every page while an admin is testing a role. */
export function TestRoleBanner() {
  const navigate = useNavigate();
  const [role, setRole] = useState(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const user = auth.currentUser;
    if (!user) return;
    let cancelled = false;
    Promise.all([getDoc(doc(db, "users", user.uid)).catch(() => null), isAdmin(user)]).then(([snap, admin]) => {
      if (!cancelled && admin && snap && snap.exists()) setRole(knownRole(snap.data().adminTestRole));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!role) return null;

  // Switch straight from here (a full page load, so every page picks up the
  // new role), or go back to the admin tools.
  const pick = async (next) => {
    setOpen(false);
    if (next.id === role) return;
    setBusy(true);
    try {
      await switchTestRole(next);
      window.location.assign(next.home);
    } catch (error) {
      switchError(error);
      setBusy(false);
    }
  };

  return (
    <div className="test-role-banner" role="status">
      <ShieldCheck size={15} aria-hidden="true" />
      <span>
        Admin test mode: you are using the app as a <strong>{roleLabel(role)}</strong>.
      </span>
      <div className="test-role-switch">
        <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-haspopup="menu" disabled={busy}>
          {busy ? "Switching..." : "Switch role"} <ChevronDown size={13} />
        </button>
        {open && (
          <div className="test-role-menu" role="menu">
            {TEST_ROLES.map((r) => {
              const Icon = r.icon;
              return (
                <button type="button" role="menuitem" key={r.id} className={r.id === role ? "on" : ""} onClick={() => pick(r)}>
                  <Icon size={15} /> {r.label}
                  {r.id === role && <small>current</small>}
                </button>
              );
            })}
            <button type="button" role="menuitem" className="test-role-admin" onClick={() => { setOpen(false); navigate("/admin/dashboard"); }}>
              <ShieldCheck size={15} /> Admin tools
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
