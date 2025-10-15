export default class LoginView {
  constructor() {
    this.presenter = null; // sarà assegnato da main.js
  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  init() {
    // Riferimenti agli elementi DOM già presenti nella pagina
    this.form = document.getElementById("loginForm");
    this.emailInput = document.getElementById("email");
    this.passwordInput = document.getElementById("password");
    this.errorMessage = document.getElementById("errorMessage");

    // Collego gli eventi al presenter
    this.form.addEventListener("submit", (e) => {
      e.preventDefault(); // evita il reload
      const email = this.emailInput.value.trim();
      const password = this.passwordInput.value.trim();
      this.presenter.onLoginClicked(email, password);
    });
  }

  /**
   * Mostra un messaggio di errore
   */
  showError(msg) {
    this.errorMessage.textContent = msg;
    this.errorMessage.classList.remove("hidden");
  }

  /**
   * Pulisce eventuali errori e campi
   */
  clear() {
    this.errorMessage.classList.add("hidden");
    this.errorMessage.textContent = "";
    this.emailInput.value = "";
    this.passwordInput.value = "";
  }

  /**
   * Distruzione della view (opzionale)
   * — utile se vuoi rimuovere listener o timer quando si cambia pagina
   */
  destroy() {
    this.form.removeEventListener("submit", this._submitHandler);
  }
}