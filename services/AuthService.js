import { auth } from "../services/firebase-config.js";
import { signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js";

export default class AuthService {
  
  // metodo statico per il login
  static async login(email, password) {
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      console.log("Login eseguito con successo:", userCredential.user.email);
      return true;
    } catch (error) {
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
}