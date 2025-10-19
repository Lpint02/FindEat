import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
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

// Singleton DB
let dbInstance = null;
function getDb() {
  if (!dbInstance) {
    const app = initializeApp(firebaseConfig);
    dbInstance = getFirestore(app);
  }
  return dbInstance;
}

export default class FirebaseService {
  async getById(collection, id) {
    if (!id) return null;
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch (e) {
      console.error('Errore leggendo documento:', e);
      return null;
    }
  }

  async saveById(collection, id, data) {
    try {
      const db = getDb();
      await setDoc(doc(db, collection, id), data);
      return true;
    } catch (e) {
      console.error('Errore salvando documento:', e);
      return false;
    }
  }
}
