// telemetry.js
//
// Lightweight product-analytics logger. Writes one document per business
// event (not every click) so the Admin Dashboard, Data Dashboard and
// Statistics Dashboard can be built from real usage instead of guesses.

import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db, auth } from "./firebaseConfig";
import { analyticsAllowed } from "./consent";

export const TELEMETRY_EVENTS = {
  SIGN_UP: "sign_up",
  SIGN_IN: "sign_in",
  LOG_OUT: "log_out",
  POST_CREATED: "post_created",
  MARKETPLACE_VIEWED: "marketplace_viewed",
  RESEARCH_ARTICLE_PUBLISHED: "research_article_published",
  RESEARCH_PROBLEM_SUBMITTED: "research_problem_submitted",
  RESEARCH_PROBLEM_ANSWERED: "research_problem_answered",
  TRAINING_PROGRAM_POSTED: "training_program_posted",
  INTERNSHIP_POSTED: "internship_posted",
  INTERNSHIP_STATUS_CHANGED: "internship_status_changed",
  PROMOTION_CREATED: "promotion_created",
  ADMIN_USER_APPROVED: "admin_user_approved",
  ADMIN_USER_REJECTED: "admin_user_rejected",
  ADMIN_ADDED: "admin_added",
  ADMIN_REMOVED: "admin_removed",
  PAYMENT_INITIATED: "payment_initiated",
  PAYMENT_COMPLETED: "payment_completed",
};

/**
 * Fire-and-forget event log. Never throws - a telemetry failure must not
 * block the user-facing action it is attached to.
 */
export const logTelemetryEvent = (eventType, meta = {}) => {
  // Usage analytics need the visitor's consent (see consent.js). Admin actions
  // are an audit record of decisions about other people's accounts, not
  // analytics, so they are always kept.
  if (!eventType.startsWith("admin_") && !analyticsAllowed()) return;
  try {
    const user = auth.currentUser;

    addDoc(collection(db, "telemetry"), {
      eventType,
      uid: user?.uid || null,
      // No e-mail address: the uid is enough to count events, and we keep
      // as little personal data as possible.
      email: null,
      meta,
      path: typeof window !== "undefined" ? window.location.pathname : null,
      createdAt: serverTimestamp(),
    }).catch((error) => {
      console.warn("Telemetry write failed:", error.message);
    });
  } catch (error) {
    console.warn("Telemetry logging skipped:", error.message);
  }
};
