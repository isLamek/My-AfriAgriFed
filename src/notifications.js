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
import { tIn, tv, hasKey } from "./i18n";

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

// Notifications are read by someone other than the person who caused them, often in
// another language. So a notification carries a catalog key and its parameters
// (shown in the reader's language: see NotificationBell) AND the English text as a
// fallback for anything that does not know the key (older apps, the server).
//
//   notifyUser(uid, { key: "notif.pledge", params: { name, qty, unit, product }, link })
//   with "notif.pledge.title" and "notif.pledge.body" in the language files.
export const NOTIFICATION_PARAMS = ["name", "qty", "unit", "product", "item", "status", "reason", "what"];

/** Text for a notification: its key in the reader's language, or the stored English. */
export const notificationText = (item, translate) => {
  if (item.key && hasKey("en", `${item.key}.title`)) {
    const params = { ...item.params };
    if (params.unit) params.unit = tv(params.unit); // "kg" is a stored value: show it in the reader's language
    return { title: translate(`${item.key}.title`, params), body: hasKey("en", `${item.key}.body`) ? translate(`${item.key}.body`, params) : "" };
  }
  return { title: item.title, body: item.body };
};

export const notifyUser = async (userId, { key, params, title, body = "", link = "/" }) => {
  // the English fallback is built from the same key, so the call site says it once
  const safeParams = {};
  if (key && params) for (const name of NOTIFICATION_PARAMS) if (params[name] != null) safeParams[name] = clip(params[name], name === "reason" ? 400 : 120);
  const englishTitle = key ? tIn("en", `${key}.title`, safeParams) : title;
  const englishBody = key ? (hasKey("en", `${key}.body`) ? tIn("en", `${key}.body`, safeParams) : "") : body;
  if (!userId || !englishTitle) return;

  try {
    await addDoc(collection(db, "notifications"), {
      userId,
      title: clip(englishTitle, MAX_TITLE),
      body: clip(englishBody, MAX_BODY),
      ...(key ? { key, params: safeParams } : {}),
      link,
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn("Could not create notification:", error.message);
  }
};
