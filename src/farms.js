// farms.js
//
// A farmer's private farm records and input log. Everything is scoped to the
// signed-in owner; firestore.rules enforces the same, so these queries always
// include `ownerId == uid` (a query without it would be refused).
//
//   farms/{id}        name, lat, lng, region?, crops?, areaHa?, notes?
//   farmInputs/{id}   farmId, date, type, item, quantity?, unit?, costNad?, target?, note?

import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  query,
  serverTimestamp,
  where,
  writeBatch,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { buildFarmDoc, buildInputDoc } from "./farmview/farmInputs";

const requireUid = () => {
  const uid = auth.currentUser?.uid;
  if (!uid) throw new Error("Please sign in first.");
  return uid;
};

const toList = (snap) => snap.docs.map((d) => ({ id: d.id, ...d.data() }));

export function subscribeFarms(uid, onChange, onError) {
  const q = query(collection(db, "farms"), where("ownerId", "==", uid));
  return onSnapshot(
    q,
    (snap) => onChange(toList(snap).sort((a, b) => String(a.name).localeCompare(String(b.name)))),
    onError
  );
}

export function subscribeInputs(uid, farmId, onChange, onError) {
  const q = query(collection(db, "farmInputs"), where("ownerId", "==", uid), where("farmId", "==", farmId));
  return onSnapshot(q, (snap) => onChange(toList(snap)), onError);
}

export async function addFarm(fields) {
  const uid = requireUid();
  const ref = await addDoc(collection(db, "farms"), {
    ...buildFarmDoc(fields),
    ownerId: uid,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function addInput(farmId, fields) {
  const uid = requireUid();
  const ref = await addDoc(collection(db, "farmInputs"), {
    ...buildInputDoc(fields),
    ownerId: uid,
    farmId,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export const deleteInput = (inputId) => deleteDoc(doc(db, "farmInputs", inputId));

/** Delete a farm and all of its input records together. */
export async function deleteFarm(farmId) {
  const uid = requireUid();
  const inputs = await getDocs(query(collection(db, "farmInputs"), where("ownerId", "==", uid), where("farmId", "==", farmId)));
  // A batch holds up to 500 writes; chunk in case someone has logged a lot.
  const refs = [...inputs.docs.map((d) => d.ref), doc(db, "farms", farmId)];
  for (let i = 0; i < refs.length; i += 400) {
    const batch = writeBatch(db);
    refs.slice(i, i + 400).forEach((ref) => batch.delete(ref));
    await batch.commit();
  }
}
