import { auth } from '../services/firebase-config.js';
import FirestoreService from '../services/FirestoreService.js';
import User from '../model/User.js';
import Review from '../model/Review.js';

export default class ProfiloController {
    constructor() {
        this.firestore = new FirestoreService();
        this.view = null;
        this.router = null;
    }

    handleProfile() {
        console.log("Navigazione alla pagina profilo");
        // Qui recupero i dati dell'utente, come il nome, e poi chiamo la view 
        // Per recuperare i dati devo usare firebase authentication Es:
        /* import { auth } from './firebase-config';

        const user = auth.currentUser;

        if (user) {
            console.log("UID:", user.uid);
            console.log("Email:", user.email);
        } else {
            console.log("Nessun utente loggato");
        } */

        this.router.navigate("/profilo");
    }

    // Metodo per recuperare i dati del profilo utente
    async fetchUserID() {
        const user = auth.currentUser;
        if (user) {
            localStorage.setItem('userID', user.uid);
            return user.uid;
        } else {
            return null;
        }
    }

    // Metodo per recuperare i dati del profilo utente
    async fetchUserProfile() {
        const userID = await this.fetchUserID();
        if (userID) {
            // Qui puoi fare una chiamata al tuo database per recuperare i dati del profilo
            let userData = await new FirestoreService().getById('User', userID);
            if (userData) {
                let user = new User(userData.uid, userData.name, userData.email);
                localStorage.setItem('userName', userData.name);
                localStorage.setItem('userEmail', userData.email);
                if (userData && userData.photo) {
                    user.photo = userData.photo;
                    localStorage.setItem('userPhoto', JSON.stringify(userData.photo));
                }
                return user;
            }
        } else {
            console.log("Nessun utente loggato");
        }
    }

    // metodo per controllare se l'utente ha la foto profilo
    checkUserProfilePhoto() {
        // Se l'utente è nel profilo, allora è loggato, controllo in sessione
        const userPhoto = localStorage.getItem('userPhoto');
        if (userPhoto) {
            return { esito: true, photo: JSON.parse(userPhoto) };
        } else {
            return { esito: false };
        }
    }
 
    // metodo per impostare la foto profilo nell'interfaccia
    setUserProfilePhoto() {
        const userPhoto = localStorage.getItem('userPhoto');
        if (userPhoto) {
            // Carica l'immagine di profilo dell'utente
            const img = document.getElementById('profile-avatar');
            img.src = JSON.parse(userPhoto);
            img.alt = 'Foto utente';
        } else {
            console.log("Nessuna foto profilo trovata");
        }
    }
    
    // metodo per modificare la foto profilo
    async editUserProfilePhoto(file) {
    if (!file) return;

    const reader = new FileReader();

    reader.onload = async (e) => {
        const imageData = e.target.result;

        // Aggiorna immagine nel DOM
        const img = document.getElementById('profile-avatar');
        img.src = imageData;

        // Salva localmente
        localStorage.setItem('userPhoto', JSON.stringify(imageData));
        console.log("Foto profilo aggiornata!");

        // Aggiorna anche su Firestore
        await this.updateUserPhotoInFirestore(imageData);
    };
    reader.readAsDataURL(file);
    }
  
    // metodo per eliminare la foto profilo
    async deleteUserProfilePhoto() {
    const user = auth.currentUser;
    if (!user) return;

    // Ripristina immagine di default
    const img = document.getElementById('profile-avatar');
    img.src = "../images/person-circle.svg"; // Usa il tuo path immagine di default

    // Rimuovi da localStorage
    localStorage.removeItem('userPhoto');

    // 🔹 Aggiorna Firestore (photo: null)
    await this.updateUserPhotoInFirestore(null);

    console.log("Foto profilo eliminata");
   }

    // Metodo per aggiornare la foto profilo su Firestore
    async updateUserPhotoInFirestore(photoData) {
        const user = auth.currentUser;
        if (!user) {
            console.error("Nessun utente loggato, impossibile aggiornare Firestore");
            return;
        }

        try {
            const firestore = new FirestoreService();
            const success = await firestore.saveById('User', user.uid, {
                email: user.email,
                name: localStorage.getItem('userName'),
                photo: photoData ?? null
            });

            if (success) {
                console.log("Campo 'photo' aggiornato con successo su Firestore");
            } else {
                console.error("Errore durante l'aggiornamento della foto su Firestore");
            }
        } catch (e) {
            console.error("Errore in updateUserPhotoInFirestore:", e);
        }
    }

    // metodo per recuperare le recensioni dal DB e le passa alla view
    async loadUserReviews() {
        const userID = await this.fetchUserID();
        if (!userID) return;

        const reviewsData = await this.firestore.getUserReviews(userID);
        const reviews = reviewsData.map(r => new Review(r));
        this.view.displayReviews(reviews);
    }

    // metodo per aggiornare una recensione su Firestore e ricaricare la view
    async updateReview(review) {
        await this.firestore.saveById('Reviews', `${review.authorID}_${review.restaurantID}`, { ...review });
        await this.loadUserReviews();
    }
}