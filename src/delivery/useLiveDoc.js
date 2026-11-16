import { useEffect, useState } from "react";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebaseConfig";

/** Follow one document live. undefined while loading, null when it does not exist (or is not ours to read). */
export default function useLiveDoc(path) {
  const [data, setData] = useState(undefined);
  useEffect(() => {
    if (!path) {
      setData(null);
      return undefined;
    }
    return onSnapshot(
      doc(db, path),
      (snap) => setData(snap.exists() ? snap.data() : null),
      () => setData(null)
    );
  }, [path]);
  return data;
}
