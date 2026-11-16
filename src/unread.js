// Which conversations have a message the person has not opened yet. No Firebase in here, so the
// sidebar badge and the tests can use it without a database.

export const toMillis = (value) => (value?.toMillis ? value.toMillis() : typeof value === "number" ? value : 0);

/** A message from the other person, newer than the last time this person opened the thread. */
export function isUnread(conversation, uid) {
  if (!conversation.lastMessageAt || conversation.lastSenderId === uid) return false;
  return toMillis(conversation.lastMessageAt) > toMillis(conversation.readAt?.[uid]);
}

/** How many of these conversations are waiting for this person. */
export const countUnread = (conversations, uid) => (conversations || []).filter((c) => isUnread(c, uid)).length;
