import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";

// Who is signed in, what kind of account they have, and whether it has been
// approved. Loaded once for the whole app (and kept live, so an approval in
// the Verification Queue shows up without a reload) instead of every page
// fetching the profile again.

const AccountContext = createContext(null);

export const isApprovedProfile = (data = {}) =>
  data.approved === true ||
  data.status === "approved" ||
  data.status === "verified" ||
  data.accountStatus?.registrationStatus === "verified" ||
  data.accountStatus?.documentStatus === "approved";

export const isOrganizationProfile = (data = {}) =>
  data.isOrganization === true ||
  (!!data.questionnaireData?.consumerType && data.questionnaireData.consumerType !== "Individual Buyer");

/** The name other people see: first name + last name, else the auth display name. */
export const publicNameOf = (profile, user) => {
  const p = profile?.personalInfo || {};
  const full = [p.firstName, p.lastName].filter(Boolean).join(" ").trim();
  return full || user?.displayName || "AfriAgriFed member";
};

/** The name shown for a seller: their farm or business name when they gave one. */
export const sellerNameOf = (profile, user) => {
  const q = profile?.questionnaireData || {};
  return (q.farmName || q.businessName || q.institutionName || "").trim() || publicNameOf(profile, user);
};

export function AccountProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined while the session restores
  const [profile, setProfile] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [adminProfile, setAdminProfile] = useState(null);

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  useEffect(() => {
    setProfile(null);
    setAdminProfile(null);
    if (!user || user.isAnonymous) {
      setProfileLoaded(user !== undefined);
      return undefined;
    }
    setProfileLoaded(false);
    getAdminProfile(user).then(setAdminProfile).catch(() => setAdminProfile(null));
    return onSnapshot(
      doc(db, "users", user.uid),
      (snap) => {
        setProfile(snap.exists() ? snap.data() : null);
        setProfileLoaded(true);
      },
      () => setProfileLoaded(true)
    );
  }, [user]);

  const value = useMemo(() => {
    const userType = profile?.userType || null;
    return {
      user,
      profile,
      loading: user === undefined || (!!user && !profileLoaded),
      userType,
      isAdminUser: !!adminProfile,
      adminRole: adminProfile?.role || null,
      isOrganization: isOrganizationProfile(profile || {}),
      approved: isApprovedProfile(profile || {}),
      publicName: publicNameOf(profile, user),
      sellerName: sellerNameOf(profile, user),
    };
  }, [user, profile, profileLoaded, adminProfile]);

  return <AccountContext.Provider value={value}>{children}</AccountContext.Provider>;
}

export function useAccount() {
  const value = useContext(AccountContext);
  if (!value) throw new Error("useAccount must be used inside <AccountProvider>.");
  return value;
}
