import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
import { FIREBASE_API_KEY } from "../config.js";

const firebaseConfig = {
  apiKey: FIREBASE_API_KEY,
  authDomain: "findeat-ae5f9.firebaseapp.com",
  projectId: "findeat-ae5f9",
  storageBucket: "findeat-ae5f9.firebasestorage.app",
  messagingSenderId: "200334640667",
  appId: "1:200334640667:web:583abbdbc4533490739abe",
  measurementId: "G-6DQJ5RPM1B"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export { onAuthStateChanged };