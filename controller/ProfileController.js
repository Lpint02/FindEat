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
}