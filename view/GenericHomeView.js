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

        // --- Navbar adjustments: remove profile/logout and add Login link ---
        const navLinks = document.querySelectorAll('.navbar-nav .nav-link');
        navLinks.forEach(link => {
            if (link.textContent.trim() === 'Logout' || link.textContent.trim() === 'Profilo') {
                link.remove();
            }
        });
        const navbarNav = document.querySelector('.navbar-nav');
        if (navbarNav && !document.getElementById('loginBtn')) {
                const loginBtn = document.createElement('a');
                loginBtn.className = 'nav-link';
                loginBtn.textContent = 'Login';
                loginBtn.id = 'loginBtn';
                loginBtn.style.cursor = 'pointer';
                // Add href so native navigation or middle-clicks work as fallback
                loginBtn.href = '/login';
                loginBtn.setAttribute('role', 'link');
                navbarNav.appendChild(loginBtn);
                // Primary SPA navigation handler
                loginBtn.addEventListener('click', (e) => { e.preventDefault(); this.router.navigate('/login'); });
                // Fallback delegated handler in case the element gets re-created by other scripts
                if (!window.__generic_home_login_delegated) {
                    document.addEventListener('click', (ev) => {
                        const target = ev.target instanceof Element ? ev.target.closest('#loginBtn') : null;
                        if (target) {
                            ev.preventDefault();
                            try { this.router.navigate('/login'); } catch(e) { console.warn('Router navigate failed', e); }
                        }
                    });
                    window.__generic_home_login_delegated = true;
                }
        }

        // --- Filters UI: simplify to only distance before HomeView binds them ---
        const filtersTitle = document.querySelector('.filters-title');
        if (filtersTitle) filtersTitle.textContent = 'Distanza';

        // Remove liked/reviewed filter labels when present
        document.querySelectorAll('.filters-row-1 .filter-label').forEach(label => {
            const span = label.querySelector('.filter-text');
            if (span && (span.textContent.includes('Solo liked') || span.textContent.includes('Solo recensiti'))) {
                label.remove();
            }
        });
        // Remove side 'Distanza' label if present
        document.querySelectorAll('.filters-row-2 .filter-text').forEach(span => { if (span.textContent.trim() === 'Distanza') span.remove(); });

        // Change buttons text
        const resetBtn = document.getElementById('resetFiltersBtn');
        const applyBtn = document.getElementById('applyFiltersBtn');
        if (resetBtn) resetBtn.textContent = 'Ripristina';
        if (applyBtn) applyBtn.textContent = 'Applica';

        // Delegate to parent init which will bind filters and start controller
        await super.init();
    }
}
