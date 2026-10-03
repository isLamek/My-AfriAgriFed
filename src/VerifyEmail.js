import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { MailCheck, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { checkVerified, needsVerification, sendVerification } from "./emailVerification";
import "./VerifyEmail.css";

/** Resend / "I have verified" behaviour shared by the banner and the full-page gate. */
function useVerifyActions(user, onVerified) {
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    const result = await sendVerification(user);
    setBusy(false);
    if (result.sent) toast.success(`Verification e-mail sent to ${user.email}. Check your spam folder too.`);
    else if (result.waitMs) toast(`An e-mail was just sent. You can ask for another in ${Math.ceil(result.waitMs / 1000)} seconds.`);
    else toast.error(result.error || "Could not send the e-mail.");
  };

  const confirm = async () => {
    setBusy(true);
    const ok = await checkVerified(user);
    setBusy(false);
    if (ok) {
      toast.success("E-mail verified. Thank you!");
      onVerified();
    } else {
      toast("Not verified yet. Open the link in the e-mail we sent, then try again.");
    }
  };

  return { busy, resend, confirm };
}

/** A slim, dismissible reminder shown inside the app for anyone with an unverified e-mail. */
export function VerifyEmailBanner() {
  const [user, setUser] = useState(auth.currentUser);
  const [, tick] = useState(0);
  const [hidden, setHidden] = useState(() => {
    try {
      return sessionStorage.getItem("aaf_verify_banner_hidden") === "1";
    } catch {
      return false;
    }
  });
  const actions = useVerifyActions(user, () => tick((n) => n + 1));

  useEffect(() => onAuthStateChanged(auth, setUser), []);

  if (hidden || !needsVerification(user)) return null;

  const hide = () => {
    setHidden(true);
    try {
      sessionStorage.setItem("aaf_verify_banner_hidden", "1");
    } catch {
      // fine: it will show again next visit
    }
  };

  return (
    <div className="verify-banner" role="status">
      <MailCheck size={16} />
      <span>
        Please verify your e-mail address (<strong>{user.email}</strong>). It keeps your account safe and recoverable.
      </span>
      <button type="button" onClick={actions.resend} disabled={actions.busy}>Send me the link</button>
      <button type="button" onClick={actions.confirm} disabled={actions.busy}>I have verified</button>
      <button type="button" className="verify-dismiss" onClick={hide} aria-label="Hide this reminder">×</button>
    </div>
  );
}

/**
 * Full-page block used where an unverified e-mail must not get through (the
 * Admin area). Sends the e-mail the first time it is shown.
 */
export function VerifyEmailGate({ user, onVerified, title = "Verify your e-mail to continue", reason }) {
  const actions = useVerifyActions(user, onVerified);

  useEffect(() => {
    sendVerification(user); // the cooldown stops this from sending twice
  }, [user]);

  return (
    <div className="verify-gate">
      <div className="verify-card">
        <MailCheck size={34} />
        <h1>{title}</h1>
        <p>
          {reason || "This area is only for verified accounts."} We sent a link to <strong>{user.email}</strong>. Open it
          (check your spam folder too), then come back here.
        </p>
        <button type="button" className="aaf-btn aaf-btn-primary" onClick={actions.confirm} disabled={actions.busy}>
          <RefreshCw size={15} /> I have verified my e-mail
        </button>
        <button type="button" className="verify-link" onClick={actions.resend} disabled={actions.busy}>
          Send the e-mail again
        </button>
      </div>
    </div>
  );
}
