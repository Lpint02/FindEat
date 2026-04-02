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

        // Rimuovi bottoni "Profilo" e "Logout" per utente non loggato
        const profileBtn = document.getElementById('navProfileBtn');
        const logoutBtn = document.getElementById('navLogoutBtn');
        if (profileBtn) profileBtn.remove();
        if (logoutBtn) logoutBtn.remove();

        // Aggiungi il bottone "Login" se non esiste
        const navbarActions = document.querySelector('.navbar-actions');
        if (navbarActions && !document.getElementById('navLoginBtn')) {
            const loginBtn = document.createElement('a');
            // Stile bottone primario verde pisello per richiamare subito l'attenzione
            loginBtn.className = 'nav-btn nav-btn-primary'; 
            loginBtn.id = 'navLoginBtn';
            loginBtn.style.cursor = 'pointer';
            
            // Icona di user-login da abbinare al nuovo stile
            loginBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path>
                <polyline points="10 17 15 12 10 7"></polyline>
                <line x1="15" y1="12" x2="3" y2="12"></line>
              </svg>
              Login
            `;
            
            navbarActions.appendChild(loginBtn);
            
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
        //this._bindFiltersUI();

        // Delegate to parent init
        await super.init();
    }
}