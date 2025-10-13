// Importa le librerie necessarie da Firebase
  import { initializeApp } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js";
  import { getFirestore, doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js";
  import { FIREBASE_API_KEY } from "../config.js"
 
  // Configurazione del tuo progetto Firebase
  const firebaseConfig = {
    apiKey: FIREBASE_API_KEY ,
    authDomain: "findeat-ae5f9.firebaseapp.com",
    projectId: "findeat-ae5f9",
    storageBucket: "findeat-ae5f9.firebasestorage.app",
    messagingSenderId: "200334640667",
    appId: "1:200334640667:web:583abbdbc4533490739abe",
    measurementId: "G-6DQJ5RPM1B"
  };
 
  // Inizializzazione
  const app = initializeApp(firebaseConfig);
  const db = getFirestore(app);

  export async function controlloInCollection(collectionName, documentId){
    const docRef = doc(db, collectionName, documentId);
    try {
        const docSnap = await getDoc(docRef);
        return docSnap.exists();
    } 
    catch (e) {
        console.error("❌ Errore durante la lettura:", e);
        return false;
    }
  }

  // Controllo basato su OSM id: costruisce un documentId come `osm_<osmId>`
  // Esempio: controlloInCollectionByOSM('Restaurant', 123456789)
  export async function controlloInCollectionByOSM(collectionName, osmId){
    if(!osmId) return false;
    // Usa anche il tipo se vuoi evitare collisioni: qui accettiamo osmId già normalizzato
    const docId = `osm_${osmId}`;
    return await controlloInCollection(collectionName, docId);
  }

  // Recupera documento con ID fornito (o null se non esiste)
  export async function getDocumentById(collectionName, docId){
    if(!docId) return null;
    try{
      const docRef = doc(db, collectionName, docId);
      const docSnap = await getDoc(docRef);
      return docSnap.exists() ? docSnap.data() : null;
    } catch(e){
      console.error('Errore leggendo documento:', e);
      return null;
    }
  }

  // Salva (o sovrascrive) un documento con ID specifico
  export async function saveDocumentWithId(collectionName, docId, data){
    try{
      await setDoc(doc(db, collectionName, docId), data);
      return true;
    } catch(e){
      console.error('Errore salvando documento:', e);
      return false;
    }
  }

  // Esponi le funzioni sul window per l'uso da script module-inline nell'HTML
  if (typeof window !== 'undefined') {
    window.controlloInCollection = controlloInCollection;
    window.controlloInCollectionByOSM = controlloInCollectionByOSM;
    window.getDocumentById = getDocumentById;
    window.saveDocumentWithId = saveDocumentWithId;
  }

  
