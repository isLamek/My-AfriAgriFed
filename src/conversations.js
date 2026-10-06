// Private conversations between two people about one thing: a listing, an
// order or a bulk request. Firestore rules (conversations/{id}) check that the
// other person really is that listing's seller, that order's buyer/seller, or
// that request's buyer, so nobody can cold-message strangers.
//
// One conversation per person per topic: the id is derived from the topic and
// the person who is not its owner, so pressing "Message seller" twice opens
// the same thread instead of starting a new one.

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";
import { db } from "./firebaseConfig";
import { notifyUser } from "./notifications";

export const MAX_MESSAGE = 1000;
export const TOPIC_KINDS = ["listing", "order", "demand"];

/**
 * listing: the buyer asking; order: nobody (an order already pairs two people);
 * demand: the producer talking to the buyer who posted it.
 */
export function conversationId({ kind, topicId, askerId }) {
  if (!TOPIC_KINDS.includes(kind) || !topicId) throw new Error("Unknown conversation topic.");
  return kind === "order" ? `order_${topicId}` : `${kind}_${topicId}_${askerId}`;
}

export const otherParticipant = (conversation, uid) => (conversation.participants || []).find((p) => p !== uid) || null;

export const toMillis = (value) => (value?.toMillis ? value.toMillis() : typeof value === "number" ? value : 0);

export function isUnread(conversation, uid) {
  if (!conversation.lastMessageAt || conversation.lastSenderId === uid) return false;
  return toMillis(conversation.lastMessageAt) > toMillis(conversation.readAt?.[uid]);
}

export function validateMessage(text) {
  const clean = String(text || "").trim();
  if (!clean) return { ok: false, error: "Write a message first." };
  if (clean.length > MAX_MESSAGE) return { ok: false, error: `Messages can be up to ${MAX_MESSAGE} characters.` };
  return { ok: true, text: clean };
}

/**
 * Opens (creating if needed) the conversation about a topic and returns its id.
 * me / other: { uid, name }. topic: { kind, id, title }.
 */
export async function openConversation({ me, other, topic }) {
  if (!me?.uid || !other?.uid) throw new Error("Please sign in first.");
  if (me.uid === other.uid) throw new Error("This is your own listing.");

  const askerId = topic.kind === "order" ? null : me.uid;
  const id = conversationId({ kind: topic.kind, topicId: topic.id, askerId });
  const refDoc = doc(db, "conversations", id);
  const existing = await getDoc(refDoc);
  if (!existing.exists()) {
    await setDoc(refDoc, {
      participants: [me.uid, other.uid].sort(),
      names: { [me.uid]: me.name || "Member", [other.uid]: other.name || "Member" },
      topic: { kind: topic.kind, id: topic.id, title: String(topic.title || "").slice(0, 120) },
      createdAt: serverTimestamp(),
    });
  }
  return id;
}

export function subscribeConversations(uid, onChange, onError) {
  const q = query(collection(db, "conversations"), where("participants", "array-contains", uid));
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
      list.sort((a, b) => toMillis(b.lastMessageAt || b.createdAt) - toMillis(a.lastMessageAt || a.createdAt));
      onChange(list);
    },
    onError
  );
}

export function subscribeMessages(conversationIdValue, onChange, onError) {
  return onSnapshot(
    collection(db, "conversations", conversationIdValue, "messages"),
    (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data({ serverTimestamps: "estimate" }) }));
      list.sort((a, b) => toMillis(a.createdAt) - toMillis(b.createdAt));
      onChange(list);
    },
    onError
  );
}

export async function sendMessage(conversation, me, text) {
  const check = validateMessage(text);
  if (!check.ok) throw new Error(check.error);

  await addDoc(collection(db, "conversations", conversation.id, "messages"), {
    senderId: me.uid,
    text: check.text,
    createdAt: serverTimestamp(),
  });
  await updateDoc(doc(db, "conversations", conversation.id), {
    lastMessage: check.text.slice(0, 200),
    lastMessageAt: serverTimestamp(),
    lastSenderId: me.uid,
    [`readAt.${me.uid}`]: serverTimestamp(),
  });

  const other = otherParticipant(conversation, me.uid);
  if (other) {
    await notifyUser(other, {
      title: `New message from ${me.name || "a member"}`,
      body: `${conversation.topic?.title ? `${conversation.topic.title}: ` : ""}${check.text}`.slice(0, 200),
      link: `/messages/${conversation.id}`,
    }).catch(() => {});
  }
}

export const markRead = (conversation, uid) =>
  updateDoc(doc(db, "conversations", conversation.id), { [`readAt.${uid}`]: serverTimestamp() }).catch(() => {});
