import React, { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { MailCheck, RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { checkVerified, needsVerification, sendVerification } from "./emailVerification";
import "./VerifyEmail.css";
import { t, tRich } from "./i18n";

/** Resend / "I have verified" behaviour shared by the banner and the full-page gate. */
function useVerifyActions(user, onVerified) {
  const [busy, setBusy] = useState(false);

  const resend = async () => {
    setBusy(true);
    const result = await sendVerification(user);
    setBusy(false);
    if (result.sent) toast.success(t("verifyEmail.sentTo", { email: user.email }));
    else if (result.waitMs) toast(t("verifyEmail.justSent", { count: Math.ceil(result.waitMs / 1000) }));
    else toast.error(result.error || t("verifyEmail.couldNotSendTheMail"));
  };

  const confirm = async () => {
    setBusy(true);
    const ok = await checkVerified(user);
    setBusy(false);
    if (ok) {
      toast.success(t("verifyEmail.mailVerifiedThankYou"));
      onVerified();
    } else {
      toast(t("verifyEmail.notVerifiedYetOpenTheLink"));
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
      <span>{tRich("verifyEmail.pleaseVerify", { email: <strong>{user.email}</strong> })}</span>
      <button type="button" onClick={actions.resend} disabled={actions.busy}>{t("verifyEmail.sendMeTheLink")}</button>
      <button type="button" onClick={actions.confirm} disabled={actions.busy}>{t("verifyEmail.haveVerified")}</button>
      <button type="button" className="verify-dismiss" onClick={hide} aria-label={t("verifyEmail.hideThisReminder")}>×</button>
    </div>
  );
}

/**
 * Full-page block used where an unverified e-mail must not get through (the
 * Admin area). Sends the e-mail the first time it is shown.
 */
export function VerifyEmailGate({ user, onVerified, title = t("verifyEmail.verifyYourMailToContinue"), reason }) {
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
          {reason || t("verifyEmail.thisAreaIsOnlyForVerified")} {tRich("verifyEmail.weSentLink", { email: <strong>{user.email}</strong> })}
        </p>
        <button type="button" className="aaf-btn aaf-btn-primary" onClick={actions.confirm} disabled={actions.busy}>
          <RefreshCw size={15} /> {t("verifyEmail.haveVerifiedMyMail")}
        </button>
        <button type="button" className="verify-link" onClick={actions.resend} disabled={actions.busy}>
          {t("verifyEmail.sendTheMailAgain")}
        </button>
      </div>
    </div>
  );
}
