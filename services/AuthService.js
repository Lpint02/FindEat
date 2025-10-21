import { auth } from "../services/firebase-config.js";
import { signInWithEmailAndPassword, FacebookAuthProvider, signInWithPopup } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";
import { createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";


export default class AuthService {

  // metodo statico per la registrazione
  static async register(email, password) {
    console.log("AuthService: Tentativo di registrazione con email:", email);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      console.log("Registrazione eseguita con successo:", userCredential.user.email);
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Errore nella registrazione:", error.message);
      return { success: false };
    }
  }

  // metodo statico per il login
  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login eseguito con successo:", userCredential.user.email);
      console.log("AuthService: Utente loggato:", userCredential.user);
      return true;
    } catch (error) {
      console.log("AuthService: Login fallito per email:", email);
      console.error("Errore nel login:", error.message);
      return false;
    }
  }

  // metodo statico per il logout
  static async logout() {
    try {
      await auth.signOut();
      console.log("Logout eseguito con successo");
      return true;
    } catch (error) {
      console.error("Errore nel logout:", error.message);
      return false;
    }
  }

  //metodo per eliminare l'utente dal servizio di autenticazione
  static async deleteUser() {
    const user = auth.currentUser;
    if (user) {
      try {
        await user.delete();
        console.log("Utente eliminato con successo");
        return true;
      } catch (error) {
        console.error("Errore nell'eliminazione dell'utente:", error.message);
        return false;
      }
    } else {
      console.log("Nessun utente loggato");
     return false;
   }
  }
}