import { useEffect, useState } from "react";
import { auth } from "./firebaseConfig";
import { subscribeConversations } from "./conversations";
import { countUnread } from "./unread";

/** The number of conversations with a message the signed-in person has not opened. 0 until known. */
export default function useUnreadMessages() {
  const uid = auth.currentUser?.uid;
  const [count, setCount] = useState(0);
  useEffect(() => {
    if (!uid) {
      setCount(0);
      return undefined;
    }
    return subscribeConversations(uid, (list) => setCount(countUnread(list, uid)), () => setCount(0));
  }, [uid]);
  return count;
}
