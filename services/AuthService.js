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

static async loginWithFacebook() {
    const provider = new FacebookAuthProvider();

    try {
        const result = await signInWithPopup(auth, provider);

        const user = result.user;
        const credential = FacebookAuthProvider.credentialFromResult(result);
        const accessToken = credential?.accessToken;

        console.log("Login Facebook riuscito:", user);
        console.log("Access Token:", accessToken);

        return true;  
    } catch (error) {
        console.error("Errore nel login Facebook:", error.message);
        return false;
    }
}


}