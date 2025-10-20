import { auth } from '../services/firebase-config.js';
import FirestoreService from '../services/FirestoreService.js';
import User from '../model/User.js';

export default class ProfiloController {
    constructor() {
        this.view = null;
        this.router = null;
    }

    handleProfile() {
        console.log("Navigazione alla pagina profilo");
        //Qui repupero i dati dell'utente, come il nome, e poi chiamo la view 
        //Per recuperare i dati devo usare firebase autentication Es:
        /*import { auth } from './firebase-config';

        const user = auth.currentUser;

        if (user) {
        console.log("UID:", user.uid);
        console.log("Email:", user.email);
        } else {
        console.log("Nessun utente loggato");
        }*/

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
                if(userData && userData.photo){
                    user.photo = userData.photo;
                    localStorage.setItem('userPhoto', JSON.stringify(userData.photo));
                }
                return user;
            }
        } else {
            console.log("Nessun utente loggato");
        }
    }
}