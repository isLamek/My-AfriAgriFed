import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { verifyAndRecordOrder } from "./payments";

export default function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState("verifying");

  useEffect(() => {
    const transactionId = searchParams.get("transaction_id");
    const flwStatus = searchParams.get("status");

    if (!transactionId || flwStatus === "cancelled") {
      setStatus("cancelled");
      return;
    }

    verifyAndRecordOrder(transactionId)
      .then((result) => setStatus(result.success ? "success" : "failed"))
      .catch(() => setStatus("failed"));
  }, [searchParams]);

  return (
    <div style={{ padding: "3rem", textAlign: "center", fontFamily: "Inter, sans-serif" }}>
      {status === "verifying" && <p>Confirming your payment...</p>}
      {status === "success" && (
        <>
          <h1>Payment confirmed</h1>
          <p>Your order has been recorded.</p>
        </>
      )}
      {status === "failed" && (
        <>
          <h1>Payment could not be verified</h1>
          <p>If you were charged, contact support with your transaction reference.</p>
        </>
      )}
      {status === "cancelled" && <h1>Payment cancelled</h1>}

      <button onClick={() => navigate("/dashboard")} style={{ marginTop: "1.5rem" }}>
        Back to Dashboard
      </button>
    </div>
  );
}
