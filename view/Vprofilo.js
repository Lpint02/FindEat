export default class VProfilo {

    constructor() {
        this.router = null; // Router instance
        this.controller = null; // Controller instance
    }

    init() 
    {
        console.log("VProfilo initialized");
        // Seleziona il link Home nella navbar in modo robusto
        const homeLink = [...document.querySelectorAll('.navbar-nav .nav-link')].find(el => el.textContent.trim() === 'Home');
        if (homeLink) {
            console.log("Home link trovato, aggiungo event listener");
            homeLink.addEventListener('click', (e) => {
                console.log("Home link cliccato");
                e.preventDefault();
                if (this.router) {
                    this.router.navigate("/home");
                } else {
                    console.error("Router non definito in VProfilo");
                }
            });
        }
    }
}