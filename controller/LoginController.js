import AuthService from "../services/AuthService.js";

export default class LoginController {

  constructor() {
        this.view = null;
        this.router = null;
    }

  async handleLogin(email, password) {
    console.log("Tentativo di login con:", email, password);
    const success = await AuthService.login(email, password);

    if (success) {
      console.log("Login corretto, vai alla home");
      this.router.navigate("/home");
    } else {
      const loginMessage = document.querySelector('p.text-white-50.mb-4');
      loginMessage.textContent = "Credenziali errate, riprova.";
      console.log("Login fallito");
    }
  }

}
