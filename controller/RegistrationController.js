import AuthService from "../services/AuthService.js";
import FirestoreService from "../services/FirestoreService.js";

export default class RegistrationController {

    async handleRegistration(email, password, name) {
        console.log("Tentativo di registrazione con:", email, password);
        const { success, user } = await AuthService.register(email, password);
        if (success) {
            console.log("Registrazione avvenuta con successo");

          //Salvo sul db l'utente (mail e nome)
            try { 
                const firebase = new FirestoreService();
                const toSaveRaw = { email: email, name: name };
                const toSave = JSON.parse(JSON.stringify(toSaveRaw)); // strip undefined
                await firebase.saveById('User', user.uid, toSave);
            } catch(e) {
                console.warn('Impossibile salvare su Firebase (non blocking)', e); 
            }


            this.router.navigate("/home");
        } else {
            alert("Errore nella registrazione, riprova.");
            console.log("Registrazione fallita");
        }
    }

      // Salva l'utente su Firestore
    async save(email, password) {
        try {
        await setDoc(doc(db, "users", this.uid), {
            nome: email,
            password: password,
        });
        console.log("Utente salvato su Firestore:", this.uid);
        } catch (error) {
        console.error("Errore salvataggio utente:", error);
        }
    }


}