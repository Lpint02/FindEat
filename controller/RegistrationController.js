import AuthService from "../services/AuthService.js";

export default class RegistrationController {

    async handleRegistration(email, password) {
        console.log("Tentativo di registrazione con:", email, password);
        const success = await AuthService.register(email, password);
        if (success) {
          console.log("Registrazione avvenuta con successo");
          this.router.navigate("/home");
        } else {
          alert("Credenziali errate, riprova.");
          console.log("Registrazione fallita");
        }
      }


}