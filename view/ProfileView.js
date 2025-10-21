import ProfileController from "../controller/ProfileController.js";

export default class ProfileView {

    constructor() {
        this.router = new ProfileController(); // Router instance
        this.controller = null; // Controller instance
    }

    init() 
    {
        console.log("ProfileView initialized");

        //Controllo se l'utente ha la foto profilo
        let risultato_check = this.controller.checkUserProfilePhoto().esito;
        if(risultato_check){
            console.log("Utente ha la foto profilo, la carico");
            this.controller.setUserProfilePhoto();
        }
        else{
            console.log("Utente non ha la foto profilo, carico immagine di default");
        }

        //Setto se l'utente ha nome e email 
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        if (userName && userEmail) {
            document.getElementById('user-name').textContent = userName;
            document.getElementById('user-email').textContent = userEmail;
        }

        // Evento click sul link "Home" nella navbar
        const homeLink = [...document.querySelectorAll('.navbar-nav .nav-link')].find(el => el.textContent.trim() === 'Home');
        if (homeLink) {
            console.log("Home link trovato, aggiungo event listener");
            homeLink.addEventListener('click', (e) => {
                console.log("Home link cliccato");
                e.preventDefault();
                if (this.router) {
                    this.router.navigate("/home");
                } else {
                    console.error("Router non definito in ProfileView");
                }
            });
        }
    }

}