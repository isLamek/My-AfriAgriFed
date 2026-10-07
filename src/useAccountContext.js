import { useCallback, useEffect, useState } from "react";
import { doc, getDoc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { auth, db } from "./firebaseConfig";
import { getAdminProfile } from "./admin";
import { buildNavSections } from "./navConfig";

/**
 * Everything an AppShell page needs about the signed-in person: which theme
 * to use, the sidebar for their account type, and a logout handler. The
 * older pages each carry their own copy of this; new pages use the hook.
 */
export default function useAccountContext(activePath) {
  const [userType, setUserType] = useState(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [isOrganization, setIsOrganization] = useState(false);

  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      setProfileLoaded(true);
      return;
    }
    getAdminProfile(auth.currentUser).then((profile) => setIsAdminUser(!!profile));
    getDoc(doc(db, "users", uid)).then((snap) => {
      setProfileLoaded(true);
      if (!snap.exists()) return;
      const data = snap.data();
      setUserType(data.userType || null);
      setIsOrganization(
        data.isOrganization === true ||
          (!!data.questionnaireData?.consumerType && data.questionnaireData.consumerType !== "Individual Buyer")
      );
    }).catch(() => setProfileLoaded(true)); // a failed read must not leave pages waiting forever
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
    window.location.href = "/";
  }, []);

  const theme = isAdminUser
    ? "admin"
    : userType === "farmer"
    ? "farmer"
    : userType === "institution"
    ? "institution"
    : isOrganization
    ? "organization"
    : "consumer";

  const navSections = buildNavSections({ userType, isAdmin: isAdminUser, activePath });

  return { userType, profileLoaded, isAdminUser, theme, navSections, logout };
}
