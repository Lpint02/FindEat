import HomeView from './HomeView.js';

export default class GenericHomeView extends HomeView {
    constructor() {
        super();
        // Only distance filter is exposed in the generic view
        this._defaultFilters = { distanceKm: 5 };
        this._currentFilters = { ...this._defaultFilters };
    }

    // Override init to alter the DOM for non-logged users, then delegate to HomeView
    async init() {
        console.log('GenericHomeView initialized');

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

        // Cambia testo dei bottoni
        const resetBtn = document.getElementById('resetFiltersBtn');
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (resetBtn) resetBtn.textContent = "Ripristina";
        if (applyBtn) applyBtn.textContent = "Applica";

        // Richiama il metodo _bindFiltersUI per collegare gli eventi al filtro della distanza
        this._bindFiltersUI();

        // Delegate to parent init
        await super.init();
    }
}
