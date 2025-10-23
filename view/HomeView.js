import ProfiloController from "../controller/ProfileController.js";
import MapView from "./MapView.js";
import DetailsView from './DetailsView.js';

export default class HomeView {
  //costruttore
  constructor() {
    this.controller = null;
    this.router = null;
    this.listContainer = null;
    this.backBtn = null;
    this.mapView = new MapView(); // Delegato a MapView per separare le responsabilità della mappa
    this.detailsView = new DetailsView(); 
    this._defaultFilters = { liked: false, reviewed: false, distanceKm: 5 };
    this._currentFilters = { ...this._defaultFilters };

  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  async init()  {
    let utente = await new ProfiloController().fetchUserProfile();
    console.log("IN STORAGE:",localStorage);

    // Aggancia elementi UI
    this.listContainer = document.getElementById('listView');
    this.backBtn = document.getElementById('dpBackToList');
    if (this.backBtn) {
      this.backBtn.addEventListener('click', () => this.controller?.onBack());
    }

    this.#navbarAreaPersonaleEvent();
    this.#navbarLogoutEvent();

    // Bind filtri UI
    this._bindFiltersUI();

    // Avvia il controller dell'area Home
    if (this.controller && typeof this.controller.init === 'function') {
      this.controller.init(this._currentFilters);
    }
        
  }//fine init

  // --- Parte dei filtri --- 
  _bindFiltersUI() {
    const liked = document.getElementById('fltLiked');
    const reviewed = document.getElementById('fltReviewed');
    const dist = document.getElementById('fltDistance');
    const distValue = document.getElementById('fltDistanceValue');
    const btnApply = document.getElementById('applyFiltersBtn');
    const btnReset = document.getElementById('resetFiltersBtn');

    // distance + buttons are required; liked/reviewed optional
    if (!dist || !distValue || !btnApply || !btnReset) {
      console.warn('[FILTERS] elementi filtro distanza o bottoni mancanti, bind abortito');
      return;
    }

    // Initialize UI from current state (handle optional checkboxes)
    if (liked) liked.checked = !!this._currentFilters.liked;
    if (reviewed) reviewed.checked = !!this._currentFilters.reviewed;
    dist.value = String(this._currentFilters.distanceKm ?? this._defaultFilters.distanceKm ?? 5);
    distValue.textContent = `${parseInt(dist.value, 10)} km`;
    this._updateFilterButtonsState();

    const onChange = () => {
      // update only keys that exist in UI (keep others as-is)
      this._currentFilters.distanceKm = parseInt(dist.value, 10);
      if (liked) this._currentFilters.liked = !!liked.checked;
      if (reviewed) this._currentFilters.reviewed = !!reviewed.checked;
      distValue.textContent = `${this._currentFilters.distanceKm} km`;
      this._updateFilterButtonsState();
    };

    if (liked) liked.addEventListener('change', onChange);
    if (reviewed) reviewed.addEventListener('change', onChange);
    dist.addEventListener('input', onChange);

    btnReset.addEventListener('click', () => {
      // reset to default (defaults may not include liked/reviewed in GenericHomeView)
      this._currentFilters = { ...this._defaultFilters };
      if (liked) liked.checked = !!this._currentFilters.liked;
      if (reviewed) reviewed.checked = !!this._currentFilters.reviewed;
      dist.value = String(this._currentFilters.distanceKm ?? this._defaultFilters.distanceKm ?? 5);
      distValue.textContent = `${parseInt(dist.value, 10)} km`;
      this._updateFilterButtonsState();
      this.controller?.applyFilters && this.controller.applyFilters(this._currentFilters);
    });

    btnApply.addEventListener('click', () => {
      this._updateFilterButtonsState(true);
      this.controller?.applyFilters && this.controller.applyFilters(this._currentFilters);
    });
  }


  _filtersAreDefault() {
    const a = this._defaultFilters, b = this._currentFilters;
    return a.liked === b.liked && a.reviewed === b.reviewed && a.distanceKm === b.distanceKm;
  }

  _updateFilterButtonsState(disableNow = false) {
    const btnApply = document.getElementById('applyFiltersBtn');
    const btnReset = document.getElementById('resetFiltersBtn');
    if (!btnApply || !btnReset) return;
    const isDefault = this._filtersAreDefault();
    btnApply.disabled = disableNow ? true : isDefault;
    btnReset.disabled = isDefault;
  }

  // --- parte della lista --- 
  
  // La view rende la lista e gestisce i click utente, notificando il controller via callback
  renderList(items, onSelect) {
    const container = this.listContainer;
    if (!container) return;
    container.innerHTML = '';
    if (!items || !items.length) {
      container.innerHTML = '<div>Nessun ristorante trovato nell\'area selezionata.</div>';
      return;
    }
    for (const el of items) {
      // el è Restaurant
      const name = el.name || el.tags?.name || 'Ristorante senza nome';
      const distance = (typeof el.distanceKm === 'number' && isFinite(el.distanceKm)) ? `${el.distanceKm.toFixed(1)} km` : '';
      const tags = el.tags || {};
      const phoneRaw = (tags.phone || tags['contact:phone'] || '').trim();
      const phone = phoneRaw ? `📞 ${phoneRaw}` : '';
      const metaParts = [distance, phone || null].filter(Boolean);
      const metaLine = metaParts.join(' · ');
      const div = document.createElement('div');
      div.className = 'list-item';
      const likedBadge = el.isLiked ? `<span class="li-liked" aria-hidden="true">♥</span>` : '';
      // Put the heart next to the distance in the meta line (distance is usually the first meta part)
      const metaWithLike = metaParts.length ?
        [ (metaParts[0] ? `${likedBadge} ${metaParts[0]}` : likedBadge), ...metaParts.slice(1) ] :
        (likedBadge ? [likedBadge] : []);
      const metaLineWithLike = metaWithLike.join(' · ');

      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div>
            <h3 class="li-title" style="margin:0;">${name}</h3>
            <div class="li-meta">${metaLineWithLike}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="back-btn li-details" title="Vedi dettagli" aria-label="Vedi dettagli">Dettagli</button>
          </div>
        </div>
      `;
      div.querySelector('.li-details').addEventListener('click', (e) => { e.stopPropagation(); onSelect && onSelect(el); });
      div.addEventListener('click', () => onSelect && onSelect(el));
      container.appendChild(div);
    }
  }

  // La view torna alla lista
  showList() {
    const detailView = document.getElementById('detailView');
    const listView = document.getElementById('listView');
    const filtersBar = document.getElementById('filtersBar');
    if (!detailView || !listView) return;
    detailView.classList.add('hidden');
    listView.classList.remove('hidden');
    if (filtersBar) filtersBar.classList.remove('hidden');
    document.body.classList.remove('detail-mode');
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.style.display = '';
  }

  // --- Parte della mappa ---

  // Mappa: delegata a MapView (stessa pagina, componenti separati)
  initMap(center, radius) { return this.mapView.initMap(center, radius); }
  setUserMarker(lat, lon) { return this.mapView.setUserMarker(lat, lon); }
  updateUserPosition(lat, lon) { return this.mapView.updateUserPosition(lat, lon); }
  renderMapRestaurants(elements, onSelect) { return this.mapView.renderMapRestaurants(elements, onSelect); }
  selectOnMapById(id) { return this.mapView.selectOnMapById(id); }
  clearMapSelection() { return this.mapView.clearMapSelection(); }


  // --- Parte dei dettagli ---
  showDetails(data, fallbackName, el) {
    // ensure controller is available to details view
    if (this.detailsView && typeof this.detailsView.setController === 'function') {
      this.detailsView.setController(this.controller);
    }
    if (this.detailsView && typeof this.detailsView.showDetails === 'function') {
      this.detailsView.showDetails(data, fallbackName, el);
    }
  }

  // --- Metodi privati di comodo

  #navbarLogoutEvent(){
    // Navbar: Logout event
    // Find the nav link whose text includes 'Logout' (avoid positional selectors)
    const links = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
    const logoutLink = links.find(a => (a.textContent || '').trim().toLowerCase().includes('logout')) || null;
    if (logoutLink) {
      logoutLink.addEventListener('click', (e) => {
        e.preventDefault();
        // Prefer controller logout when available
        if (this.controller && typeof this.controller.logout === 'function') {
          this.controller.logout();
        } else {
          console.log('Logout cliccato');
        }
      });
    }
  }

  #navbarAreaPersonaleEvent(){
    // Navbar: Area Personale event
    const links = Array.from(document.querySelectorAll('.navbar-nav .nav-link'));
    const areaPersonaleLink = links.find(a => (a.textContent || '').trim().toLowerCase().includes('profil')) || null;
    if (areaPersonaleLink) {
      areaPersonaleLink.addEventListener('click', (e) => {
        e.preventDefault();
        if (this.router && typeof this.router.navigate === 'function') {
          this.router.navigate('/profilo');
        } else {
          console.log('Area Personale cliccata');
        }
      });
    }
  }
}