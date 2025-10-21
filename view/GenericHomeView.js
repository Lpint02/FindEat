export default class GenericHomeView {
    //costruttore
    constructor() {
        this.controller = null;
        this.router = null;    // sarà assegnato da main.js
        this._defaultFilters = { distanceKm: 5 };
        this._currentFilters = { ...this._defaultFilters };
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


        // Aggancia elementi UI
        this.listContainer = document.getElementById('listView');
        this.backBtn = document.getElementById('dpBackToList');
        if (this.backBtn) {
            this.backBtn.addEventListener('click', () => this.controller?.onBack());
        }

        // Bind filtri UI
        this._bindFiltersUI();

        // Avvia il controller dell'area Home
        if (this.controller && typeof this.controller.init === 'function') {
        this.controller.init(this._currentFilters);
        }
    }

    _bindFiltersUI() {
        //Recupera riferimenti agli elementi
        const dist = document.getElementById('fltDistance');
        const distValue = document.getElementById('fltDistanceValue');
        const btnApply = document.getElementById('applyFiltersBtn');
        const btnReset = document.getElementById('resetFiltersBtn');

        //Se mancano gli elementi, esci
        if (!dist || !distValue || !btnApply || !btnReset) return;

        //Inizializzazione stato UI
        dist.value = String(this._currentFilters.distanceKm);
        distValue.textContent = `${this._currentFilters.distanceKm} km`;
        this._updateFilterButtonsState();

        const onChange = () => {
            this._currentFilters = {
                distanceKm: parseInt(dist.value, 10)
            };
            distValue.textContent = `${this._currentFilters.distanceKm} km`;
            this._updateFilterButtonsState();
        };

        dist.addEventListener('input', onChange);

        btnReset.addEventListener('click', () => {
            this._currentFilters = { ...this._defaultFilters };
            dist.value = String(this._currentFilters.distanceKm);
            distValue.textContent = `${this._currentFilters.distanceKm} km`;
            this._updateFilterButtonsState();
            // Inform controller to re-fetch with defaults
            this.controller?.applyFilters && this.controller.applyFilters(this._currentFilters);
        });

        btnApply.addEventListener('click', () => {
            this._updateFilterButtonsState(true); // disable right away
            this.controller?.applyFilters && this.controller.applyFilters(this._currentFilters);
        });
    }

    _filtersAreDefault() {
        const defaultFilters = this._defaultFilters, currentFilters = this._currentFilters;
        return defaultFilters.distanceKm === currentFilters.distanceKm;
    }

    _updateFilterButtonsState(disableNow = false) {
        const btnApply = document.getElementById('applyFiltersBtn');
        const btnReset = document.getElementById('resetFiltersBtn');
        if (!btnApply || !btnReset) return;
        const isDefault = this._filtersAreDefault();
        btnApply.disabled = disableNow ? true : isDefault;
        btnReset.disabled = isDefault;
    }

}
