
import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectDatabaseEmulator, getDatabase } from "firebase/database";

const firebaseConfig = {
  apiKey: "AIzaSyCcTP0FGWW8RZdVHGP2RfgL7I6FP6SVTTw",
  authDomain: "afriagrifed-ebc30.firebaseapp.com",
  projectId: "afriagrifed-ebc30",
  storageBucket: "afriagrifed-ebc30.firebasestorage.app",
  messagingSenderId: "936599860460",
  appId: "1:936599860460:web:e14467de59e30285ed61c9",
  measurementId: "G-7WFC56EJZL",
  databaseURL: "https://afriagrifed-ebc30-default-rtdb.europe-west1.firebasedatabase.app",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);

// Local development against the Firebase emulators (never in a live build):
// REACT_APP_USE_EMULATORS=true npm start, with `npx firebase-tools emulators:start` running.
if (process.env.NODE_ENV !== "production" && process.env.REACT_APP_USE_EMULATORS === "true") {
  connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
  connectFirestoreEmulator(db, "127.0.0.1", 8080);
  connectDatabaseEmulator(database, "127.0.0.1", 9000);
}

export default app;