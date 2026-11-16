import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyAndFinalizePayment } from "./payments";
import { finishPendingCheckout } from "./cart/cart";
import { t } from "./i18n";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");
  const [purpose, setPurpose] = useState("order");
  const [refId, setRefId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const transactionId = searchParams.get("transaction_id");
    const flwStatus = searchParams.get("status");

    if (!transactionId || flwStatus === "cancelled") {
      setStatus("cancelled");
      return;
    }

    verifyAndFinalizePayment(transactionId)
      .then((result) => {
        setPurpose(result.purpose || "order");
        setRefId(result.refId || null);
        setMessage(result.message || "");
        setStatus(result.success ? "success" : "failed");
        if (result.success && result.purpose === "order") finishPendingCheckout(); // what was just bought leaves the basket
      })
      .catch(() => setStatus("failed"));
  }, [searchParams]);

  const returnTo = purpose === "page_access" ? `/${refId || "data"}` : purpose === "order" ? "/track-orders" : "/dashboard";
  const returnLabel = purpose === "page_access" ? t("paymentResult.goToPage") : purpose === "order" ? t("paymentResult.trackOrder") : t("paymentResult.backToDashboard");

  return (
    <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {status === "verifying" && <p>{t("paymentResult.confirmingYourPayment")}</p>}
      {status === "success" && (
        <>
          <h1>{t("paymentResult.paymentConfirmed")}</h1>
          <p>
            {purpose === "promotion"
              ? t("paymentResult.yourPromotionIsNowLive")
              : purpose === "page_access"
              ? t("paymentResult.thisPageIsNowUnlocked")
              : t("paymentResult.yourOrderHasBeenRecorded")}
          </p>
        </>
      )}
      {status === "failed" && (
        <>
          <h1>{t("paymentResult.paymentCouldNotBeVerified")}</h1>
          <p>
            {message || t("paymentResult.weCouldNotConfirmThisPayment")} {t("paymentResult.ifCharged")}
          </p>
        </>
      )}
      {status === "cancelled" && <h1>{t("paymentResult.paymentCancelled")}</h1>}

      <button onClick={() => navigate(returnTo)} style={{ marginTop: "1.5rem" }}>
        {returnLabel}
      </button>
    </div>
  );
}
