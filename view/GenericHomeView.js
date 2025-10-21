

export default class GenericHomeView {
    //costruttore
    constructor() {
        this.controller = null;
        this.router = null;    // sarà assegnato da main.js
    }

    /**
     * Metodo chiamato dal Router dopo che l'HTML è stato caricato
     */
    init() {
        console.log("GenericHomeView initialized");

        // Recupera tutti i link della navbar
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            if (link.textContent.trim() === "Logout" || link.textContent.trim() === "Profilo") {
                link.remove();
            }
        });

        // Aggiungi il bottone Login
        const navbarNav = document.querySelector('.navbar-nav');
        if (navbarNav) {
            const loginBtn = document.createElement('a');
            loginBtn.className = 'nav-link';
            loginBtn.textContent = 'Login';
            loginBtn.id = 'loginBtn';
            loginBtn.style.cursor = 'pointer';
            navbarNav.appendChild(loginBtn);
        }

        // Gestione submit del form di login
        document.getElementById('loginBtn').addEventListener('click', (e) => {
            e.preventDefault();
            this.router.navigate("/login");
        });
    }
}
