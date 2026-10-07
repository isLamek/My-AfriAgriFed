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
import { checkForContactInfo } from "./contactGuard";

export const MAX_MESSAGE = 1000;
export const TOPIC_KINDS = ["listing", "order", "demand"];

/**
 * The thread id. An order already pairs two people, so it is just the order.
 * A listing or bulk request has an owner (the seller, or the buyer who posted
 * it) and many possible counterparts, so the id also names the counterpart:
 * whichever of the two people is not the owner. Either side opening the
 * thread therefore lands in the same conversation.
 */
export function conversationId({ kind, topicId, counterpartId }) {
  if (!TOPIC_KINDS.includes(kind) || !topicId) throw new Error("Unknown conversation topic.");
  return kind === "order" ? `order_${topicId}` : `${kind}_${topicId}_${counterpartId}`;
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
  // Phone numbers, e-mails, links and e-wallet details stay off the platform's chats
  // (the database rules refuse them too).
  const contact = checkForContactInfo(clean);
  if (!contact.ok) return { ok: false, error: contact.message };
  return { ok: true, text: clean };
}

/**
 * Opens (creating if needed) the conversation about a topic and returns its id.
 * me / other: { uid, name }. topic: { kind, id, title, ownerId? } where ownerId
 * is the listing's seller or the request's buyer (defaults to `other`).
 */
export async function openConversation({ me, other, topic }) {
  if (!me?.uid || !other?.uid) throw new Error("Please sign in first.");
  if (me.uid === other.uid) throw new Error("This is your own listing.");

  const ownerId = topic.ownerId || other.uid;
  const counterpartId = me.uid === ownerId ? other.uid : me.uid;
  const id = conversationId({ kind: topic.kind, topicId: topic.id, counterpartId });
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
