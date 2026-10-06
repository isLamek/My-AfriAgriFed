// notifications.js
//
// In-app notifications. One Firestore collection ("notifications"), each
// document tagged with the recipient's uid so a simple where() query can
// build a per-user inbox without needing sub-collections.

import {
  addDoc,
  collection,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

/**
 * Create a notification for a specific user.
 * `link` is an in-app route the bell's dropdown can navigate to on click.
 */
// Limits enforced by firestore.rules; longer text is trimmed here so a long
// rejection reason or title can never make a notification fail to send.
export const MAX_TITLE = 120;
export const MAX_BODY = 400;

const clip = (text, max) => {
  const s = String(text ?? "");
  return s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`;
};

export const notifyUser = async (userId, { title, body = "", link = "/" }) => {
  if (!userId || !title) return;

  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title: clip(title, MAX_TITLE),
      body: clip(body, MAX_BODY),
      link,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Could not create notification:", error.message);
  }
};
