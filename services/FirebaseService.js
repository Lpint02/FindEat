import { app } from "./firebase-config.js";
import { db } from "./firebase-config.js";
import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Singleton DB
let dbInstance = null;
function getDb() {
  if (!dbInstance) {

    dbInstance = db;
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
