import LoginController from "../controller/LoginController.js";

export default class LoginView 
{
  //costruttore
  constructor() {
    this.controller = new LoginController();
    this.presenter = null; // sarà assegnato da main.js
    this.router = null;    // sarà assegnato da main.js
  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  init() {
    // Riferimenti agli elementi DOM già presenti nella pagina
    this.form = document.getElementById("loginForm");
    this.username = document.getElementById("username");
    this.password = document.getElementById("password");
    this.submitButton = document.getElementById("loginButton");
    

    // Collego gli eventi al presenter
    this.submitButton.addEventListener("click", (e) => {
      e.preventDefault(); // previene il comportamento di default del form
      const email = document.getElementById("username").value;
      const password = document.getElementById("password").value;
      this.controller.handleLogin(email, password);
    });
  }

}