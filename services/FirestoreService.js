import { app } from "./firebase-config.js";
import { db } from "./firebase-config.js";
import { doc, getDoc, setDoc, query, collection, where, getDocs, updateDoc, arrayUnion, arrayRemove, deleteDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";

// Singleton DB
let dbInstance = null;
function getDb() {
  if (!dbInstance) {

    dbInstance = db;
  }
  return dbInstance;
}

export default class FirestoreService {
  // Utility statica: verifica se un timestamp è più vecchio di 2 giorni
  // Accetta: number (ms), string (ISO) o Date
  static isOlderThanTwoDays(ts, nowMs = Date.now()) {
    let tsMs = NaN;
    if (typeof ts === 'number') {
      tsMs = ts;
    } else if (typeof ts === 'string') {
      tsMs = Date.parse(ts);
    } else if (ts instanceof Date) {
      tsMs = ts.getTime();
    }
    if (!Number.isFinite(tsMs)) return true;
    const TWO_DAYS = 2 * 24 * 60 * 60 * 1000;
    return (nowMs - tsMs) > TWO_DAYS;
  }

  // Metodo per recuperare un documento per ID
  async getById(collection, id) {
    if (!id) return null;
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        console.log('Documento letto con successo:', docSnap.data());
        return docSnap.data();
      } else {
        console.log('Documento non trovato');
        return null;
      }
    } catch (e) {
      console.error('Errore leggendo documento:', e);
      return null;
    }
  }

  // Metodo per salvare o aggiornare un documento per ID
  async saveById(collection, id, data) {
    try {
      const db = getDb();
      // Use merge: true to avoid overwriting fields not present in `data` (safe for partial writes)
      await setDoc(doc(db, collection, id), data, { merge: true });
      return true;
    } catch (e) {
      console.error('Errore salvando documento:', e);
      return false;
    }
  }

  // Metodo per eliminare un documento per ID
  async deleteById(collection, id) {
    if (!id) return false;
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      await deleteDoc(docRef);
      console.log(`Documento ${id} eliminato con successo da ${collection}`);
      return true;
    } catch (e) {
      console.error('Errore eliminando documento:', e);
      return false;
    }
  }

  // Metodo per aggiornare un campo specifico di un documento
  async updateFieldById(collection, id, field, value) {
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      await updateDoc(docRef, { [field]: value });
      console.log(`Campo "${field}" aggiornato con successo`);
      return true;
    } catch (e) {
      console.error("Errore aggiornando campo:", e);
      return false;
    }
  }

  // Atomically add an element to an array field
  async arrayUnionField(collection, id, field, element) {
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      await updateDoc(docRef, { [field]: arrayUnion(element) });
      return true;
    } catch (e) {
      console.error('Errore arrayUnion:', e);
      return false;
    }
  }

  // Atomically remove an element from an array field
  async arrayRemoveField(collection, id, field, element) {
    try {
      const db = getDb();
      const docRef = doc(db, collection, id);
      await updateDoc(docRef, { [field]: arrayRemove(element) });
      return true;
    } catch (e) {
      console.error('Errore arrayRemove:', e);
      return false;
    }
  }

  // Recupera tutte le recensioni di un utente
  async getUserReviews(userID) {
    try {
      const db = getDb();
      const q = query(collection(db, "Reviews"), where("AuthorID", "==", userID));
      const querySnapshot = await getDocs(q);
      const reviews = [];
      querySnapshot.forEach(docSnap => {
        const data = docSnap.data();
        reviews.push({ ...data, firestoreId: docSnap.id });
      });
      return reviews;
    } catch (e) {
      console.error("Errore recuperando recensioni:", e);
      return [];
    }
  }

  //metodo per recuperare i ristoranti preferiti di un utente
  async findLikedRestaurant(userID) {

    const userRef = doc(db, "User", userID);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      console.log("Utente non trovato");
      return [];
    }

    const likedRestaurants = userSnap.data().likedRestaurants || [];
    if (likedRestaurants.length === 0) {
      console.log("Nessun ristorante nei like");
      return [];
    }

    const restaurants = [];

    // Firestore limita "in" a 10 elementi per volta
    for (let i = 0; i < likedRestaurants.length; i += 10) {
      const chunk = likedRestaurants.slice(i, i + 10);
      const q = query(collection(db, "Restaurant"), where("__name__", "in", chunk));
      const snapshot = await getDocs(q);

      snapshot.forEach(docSnap => {
        const data = docSnap.data();

        // Qui formattiamo l'oggetto come vuoi tu
        restaurants.push({
          RestaurantName: data.name || "Senza nome",
          RestaurantID: docSnap.id,
          rating: data.rating || null,
          price_level: data.price_level ?? null,
          address: data.formatted_address || "Indirizzo non disponibile",
          phone_number: data.international_phone_number || "Telefono non disponibile"
        });
      });
    }

    return restaurants;
  }

  // Crea una recensione nella collection "Reviews" con ID auto-generato
  async addReview(reviewData) {
    try {
      const db = getDb();
      // genera un nuovo riferimento con id automatico
      const docRef = doc(collection(db, "Reviews"));
      const id = docRef.id;
      const payload = { ...reviewData, firestoreId: id };
      await setDoc(docRef, payload, { merge: false });
      return { ok: true, id, data: payload };
    } catch (e) {
      console.error("Errore creando recensione:", e);
      return { ok: false, error: e };
    }
  }

  // Recupera recensioni per ristorante (RestaurantID)
  async getReviewsByRestaurant(restaurantID) {
    try {
      const db = getDb();
      const q = query(collection(db, "Reviews"), where("RestaurantID", "==", restaurantID));
      const snapshot = await getDocs(q);
      const arr = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        arr.push({ ...data, firestoreId: docSnap.id });
      });
      return arr;
    } catch (e) {
      console.error("Errore recuperando recensioni per ristorante:", e);
      return [];
    }
  }

  // metodo per eliminare un like di un ristorante
  async removeLikedRestaurant(userID, restaurantID) {
    console.log(" Rimuovo like per ristorante:", restaurantID, "dall'utente:", userID);

    const db = getDb();
    const userRef = doc(db, "User", userID);
    const restaurantRef = doc(db, "Restaurants", restaurantID);

    try {
      // Aggiorna l'utente
      await updateDoc(userRef, {
        likedRestaurants: arrayRemove(restaurantID)
      });

      // Aggiorna il ristorante solo se esiste
      try {
        await updateDoc(restaurantRef, {
          liked: arrayRemove(userID)
        });
      } catch (err) {
        if (err.code === 'not-found' || (err.message && err.message.includes('No document to update'))) {
          // Documento ristorante non esiste, ignora
          console.warn(`Documento ristorante ${restaurantID} non trovato, skip update.`);
        } else {
          throw err;
        }
      }

      console.log(`Rimosso like tra utente ${userID} e ristorante ${restaurantID}`);
      return true;

    } catch (err) {
      console.error("Errore durante la rimozione del like:", err);
      return false;
    }
  }
}
