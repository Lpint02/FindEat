

export default class RegistrationView {
  constructor() {
    this.controller = null; // sarà assegnato da main.js
    this.router = null;    // sarà assegnato da main.js
  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  init() {
    console.log("RegistrationView initialized");
    // Listener submit form registrazione
    document.querySelector('form').addEventListener('submit', (e) => {
      e.preventDefault();
      const name = document.getElementById('regName').value;
      const email = document.getElementById('regEmail').value;
      const password = document.getElementById('regPassword').value;
      const password2 = document.getElementById('regPassword2').value;

      if (password !== password2) {
        allert("Le password non coincidono");
        return;
      }

      if (this.controller && typeof this.controller.handleRegistration === 'function') {
        this.controller.handleRegistration(email, password, name);
      } else {
        console.error('controller.handleRegistration non definito');
      }
    });

    // Listener click su "Accedi" per navigazione SPA
    const link_login = document.querySelector('p.mb-0.mt-4 a');
    if (link_login) {
      link_login.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.router) {
          this.router.navigate("/");
        }
      });
    }
  }

}