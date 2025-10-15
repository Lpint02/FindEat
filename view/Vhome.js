export default class HomeView 
{
  //costruttore
  constructor() {
    this.presenter = null; // sarà assegnato da main.js
    this.router = null;    // sarà assegnato da main.js
  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  init() {
        const app = document.getElementById("app");
        let welcomeMsg = document.createElement("h1");
        welcomeMsg.textContent = "Meglio il bianco!";
        app.appendChild(welcomeMsg);
  }
}

