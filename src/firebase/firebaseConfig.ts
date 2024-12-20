import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, signInAnonymously } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxRu7z4ARdAL0s69whidjEKny9faQUSTk",
  authDomain: "bananagrams-5a722.firebaseapp.com",
  projectId: "bananagrams-5a722",
  storageBucket: "bananagrams-5a722.firebasestorage.app",
  messagingSenderId: "993517413594",
  appId: "1:993517413594:web:22f6095bed27075756f1e3",
  measurementId: "G-P5VMNPLLVB"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const auth = getAuth(app);
signInAnonymously(auth).catch((error) => {
  console.error("Failed to sign in anonymously", error);
});

export { app, db, auth };