
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getDatabase } from "firebase/database";

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

export default app;