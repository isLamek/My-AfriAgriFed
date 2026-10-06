import { useCallback } from "react";
import { signOut } from "firebase/auth";
import { auth } from "./firebaseConfig";
import { useAccount } from "./AccountContext";
import { buildNavSections } from "./navConfig";
import { logTelemetryEvent, TELEMETRY_EVENTS } from "./telemetry";

/**
 * Everything an AppShell page needs about the signed-in person: the sidebar
 * for their account type, and a logout handler.
 */
export default function useAccountContext(activePath) {
  const account = useAccount();

  const logout = useCallback(async () => {
    logTelemetryEvent(TELEMETRY_EVENTS.LOG_OUT, {});
    await signOut(auth);
    window.location.href = "/";
  }, []);

  const navSections = buildNavSections({ userType: account.userType, isAdmin: account.isAdminUser, activePath });

  return { ...account, navSections, logout };
}
