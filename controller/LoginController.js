import AuthService from "../services/AuthService.js";

export default class LoginController {

  async handleLogin(email, password) {
    console.log("Tentativo di login con:", email, password);
    const success = await AuthService.login(email, password);
    if (success) {
      console.log("Login corretto, vai alla home");
      this.router.navigate("/home");
    } else {
      alert("Credenziali errate, riprova.");
      console.log("Login fallito");
    }
  }

  async handleFacebookLogin() {
    console.log("Tentativo di login con Facebook");
    const success = await AuthService.loginWithFacebook();
    if (success) {
      console.log("Login corretto, vai alla home");
      this.router.navigate("/home");
    } else {
      alert("Credenziali errate, riprova.");
      console.log("Login fallito");
    }
  }
}
