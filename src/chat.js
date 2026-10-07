// "Message seller", "Message buyer", "Message" buttons all come here: open (or
// reuse) the private conversation about one listing, order or bulk request, then
// go to it. The database rules make sure the other person really is that
// listing's seller, that order's other party, or that request's buyer.

import toast from "react-hot-toast";
import { auth } from "./firebaseConfig";
import { openConversation } from "./conversations";

export async function chatWith(navigate, { otherId, otherName, topic }) {
  const user = auth.currentUser;
  if (!user) {
    toast.error("Please sign in first.");
    return;
  }
  try {
    const id = await openConversation({
      me: { uid: user.uid, name: user.displayName || user.email || "Member" },
      other: { uid: otherId, name: otherName || "Member" },
      topic,
    });
    navigate(`/messages/${id}`);
  } catch (error) {
    toast.error(error.code === "permission-denied" ? "You can't start a conversation about this." : error.message);
  }
}
