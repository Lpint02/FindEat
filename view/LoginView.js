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
    console.log("LoginView initialized");

    
    // Gestione submit del form di login
    document.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const email = document.getElementById('typeEmailX').value;
      const password = document.getElementById('typePasswordX').value;
      if (this.controller && typeof this.controller.handleLogin === 'function') {
        this.controller.handleLogin(email, password);
      } else {
        console.error('controller.handleLogin non definito');
      }
    });

    // Gestione click sul link di registrazione
    const link_registration = document.querySelector('p.mb-0.mt-4 a');
    link_registration.addEventListener('click', (e) => {
      e.preventDefault();
      this.router.navigate("/registrazione");
    });


  }

  

}