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

        // --- Navbar ---
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            if (link.textContent.trim() === "Logout" || link.textContent.trim() === "Profilo") {
                link.remove();
            }
        });
        const navbarNav = document.querySelector('.navbar-nav');
        if (navbarNav) {
            const loginBtn = document.createElement('a');
            loginBtn.className = 'nav-link';
            loginBtn.textContent = 'Login';
            loginBtn.id = 'loginBtn';
            loginBtn.style.cursor = 'pointer';
            navbarNav.appendChild(loginBtn);
            loginBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.router.navigate("/login");
            });
        }

        // --- Filtri ---
        // Cambia "Filtri" in "Distanza"
        const filtersTitle = document.querySelector('.filters-title');
        if (filtersTitle) {
            filtersTitle.textContent = "Distanza";
        }

        // Rimuovi "Solo liked" e "Solo recensiti"
        document.querySelectorAll('.filters-row-1 .filter-label').forEach(label => {
            const span = label.querySelector('.filter-text');
            if (span && (span.textContent.includes("Solo liked") || span.textContent.includes("Solo recensiti"))) {
                label.remove();
            }
        });

        // Rimuovi la scritta "Distanza" di lato
        document.querySelectorAll('.filters-row-2 .filter-text').forEach(span => {
            if (span.textContent.trim() === "Distanza") {
                span.remove();
            }
        });

        // Cambia testo dei bottoni
        const resetBtn = document.getElementById('resetFiltersBtn');
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (resetBtn) resetBtn.textContent = "Ripristina";
        if (applyBtn) applyBtn.textContent = "Applica";
    }
}
