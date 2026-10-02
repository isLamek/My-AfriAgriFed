import React, { useEffect, useState } from "react";
import { doc, setDoc, serverTimestamp, collection, addDoc } from "firebase/firestore";
import { Lock, GraduationCap, LogIn } from "lucide-react";
import toast from "react-hot-toast";
import { db } from "./firebaseConfig";
import { uploadToCloudinary } from "./cloudinairyUpload";
import { startAnonymousPageCheckout } from "./payments";
import { ensureViewer, isRegistered, hasPaidOrVerifiedAccess } from "./pageAccess";
import "./PageAccessGate.css";

const PAGE_LABELS = { data: "Data Dashboard", statistics: "Statistics Dashboard" };

export default function PageAccessGate({ pageKey, children }) {
  const [status, setStatus] = useState("checking"); // checking | allowed | gated
  const [uid, setUid] = useState(null);

  useEffect(() => {
    let cancelled = false;

    ensureViewer()
      .then(async (user) => {
        if (cancelled) return;
        setUid(user.uid);

        if (isRegistered(user)) {
          setStatus("allowed");
          return;
        }

        const unlocked = await hasPaidOrVerifiedAccess(user.uid, pageKey);
        setStatus(unlocked ? "allowed" : "gated");
      })
      .catch(() => {
        if (!cancelled) setStatus("gated");
      });

    return () => {
      cancelled = true;
    };
  }, [pageKey]);

  if (status === "checking") {
    return <div className="page-gate-loading">Loading...</div>;
  }

  if (status === "allowed") {
    return children;
  }

  return <PagePaywall pageKey={pageKey} uid={uid} onUnlocked={() => setStatus("allowed")} />;
}

function PagePaywall({ pageKey, uid, onUnlocked }) {
  const [email, setEmail] = useState("");
  const [paying, setPaying] = useState(false);
  const [studentCard, setStudentCard] = useState(null);
  const [verifyingStudent, setVerifyingStudent] = useState(false);

  const payForAccess = async (event) => {
    event.preventDefault();
    if (!email.trim()) {
      toast.error("Enter an email so we can send your receipt.");
      return;
    }

    setPaying(true);
    try {
      await startAnonymousPageCheckout({ email: email.trim(), pageKey });
    } catch (error) {
      toast.error(error.message || "Could not start payment.");
    } finally {
      setPaying(false);
    }
  };

  const verifyAsStudent = async (event) => {
    event.preventDefault();
    if (!studentCard) {
      toast.error("Choose a photo of your student card first.");
      return;
    }

    setVerifyingStudent(true);
    try {
      const upload = await uploadToCloudinary(studentCard, "student-cards");

      await setDoc(
        doc(db, "pageAccess", uid),
        { studentVerified: true, studentCardUrl: upload.secure_url, verifiedAt: serverTimestamp() },
        { merge: true }
      );

      await addDoc(collection(db, "studentAccessRequests"), {
        uid,
        studentCardUrl: upload.secure_url,
        createdAt: serverTimestamp(),
      });

      toast.success("Student access granted - enjoy free access to data & statistics.");
      onUnlocked();
    } catch (error) {
      toast.error(error.message || "Could not verify student card.");
    } finally {
      setVerifyingStudent(false);
    }
  };

  return (
    <div className="page-gate">
      <div className="page-gate-card">
        <Lock size={28} className="page-gate-icon" />
        <h1>{PAGE_LABELS[pageKey] || "This page"} costs N$5 for visitors without an account</h1>
        <p className="page-gate-sub">
          It's free the moment you register or sign in - AfriAgriFed never charges registered
          members for data or statistics. Not ready to register? Pay a one-time N$5 for this page,
          or verify as a student for free access.
        </p>

        <div className="page-gate-options">
          <a className="page-gate-option" href="/register">
            <LogIn size={18} />
            <div>
              <strong>Register or sign in</strong>
              <span>Free, permanent access to every page</span>
            </div>
          </a>

          <form className="page-gate-option page-gate-pay" onSubmit={payForAccess}>
            <div className="page-gate-option-heading">
              <span className="page-gate-price">N$5</span>
              <strong>Pay for this page</strong>
            </div>
            <input
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <button className="aaf-btn aaf-btn-primary" disabled={paying}>
              {paying ? "Starting..." : "Pay N$5"}
            </button>
          </form>

          <form className="page-gate-option page-gate-student" onSubmit={verifyAsStudent}>
            <div className="page-gate-option-heading">
              <GraduationCap size={20} />
              <strong>I'm a student</strong>
            </div>
            <span className="page-gate-sub-small">Upload your student card for free access.</span>
            <input type="file" accept="image/*" onChange={(e) => setStudentCard(e.target.files?.[0])} />
            <button className="aaf-btn aaf-btn-ghost" disabled={verifyingStudent}>
              {verifyingStudent ? "Verifying..." : "Verify & Unlock"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
