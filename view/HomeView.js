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
  
  _buildMetaFragment(el) {
    const frag = document.createDocumentFragment();
    const distance = (typeof el.distanceKm === 'number' && isFinite(el.distanceKm))
      ? `${el.distanceKm.toFixed(1)} km` : '';
    const tags = el.tags || {};
    const phoneRaw = (tags.phone || tags['contact:phone'] || '').trim();
    const phone = phoneRaw ? `📞 ${phoneRaw}` : '';
    const parts = [distance, phone].filter(Boolean);

    if (el.isLiked) {
      const heart = document.createElement('span');
      heart.className = 'li-liked';
      heart.setAttribute('aria-hidden', 'true');
      heart.textContent = '♥';
      frag.appendChild(heart);
      // space after heart if there will be text
      if (parts.length) frag.appendChild(document.createTextNode(' '));
    }

    if (el.isReviewed) {
      const rev = document.createElement('span');
      rev.className = 'li-reviewed';
      rev.setAttribute('aria-hidden', 'true');
      rev.title = 'Hai recensito questo ristorante';
      rev.textContent = '✍';
      frag.appendChild(rev);
      if (parts.length) frag.appendChild(document.createTextNode(' '));
    }

    if (parts.length) {
      frag.appendChild(document.createTextNode(parts[0]));
      for (let i = 1; i < parts.length; i++) frag.appendChild(document.createTextNode(' · ' + parts[i]));
    }

    return frag;
  }

  // Fallback: crea nodo list-item completamente via DOM (usato solo se template assente)
  _createItemDom(el, idx) {
    const wrapper = document.createElement('div');
    wrapper.className = 'list-item';
    wrapper.dataset.index = String(idx);

    const row = document.createElement('div');
    Object.assign(row.style, { display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' });

    const left = document.createElement('div');
    const h3 = document.createElement('h3');
    h3.className = 'li-title';
    h3.style.margin = '0';
    h3.textContent = el.name || el.tags?.name || 'Ristorante senza nome';
    const metaDiv = document.createElement('div');
    metaDiv.className = 'li-meta';
    metaDiv.appendChild(this._buildMetaFragment(el));

    left.appendChild(h3);
    left.appendChild(metaDiv);

    const right = document.createElement('div');
    right.style.display = 'flex';
    right.style.gap = '8px';
    const btn = document.createElement('button');
    btn.className = 'back-btn li-details';
    btn.type = 'button';
    btn.title = 'Vedi dettagli';
    btn.setAttribute('aria-label', 'Vedi dettagli');
    btn.textContent = 'Dettagli';
    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);
    wrapper.appendChild(row);

    return wrapper;
  }

  // renderList semplificata: usa template quando presente, event delegation, nessun innerHTML
  renderList(items, onSelect) {
    const container = this.listContainer;
    if (!container) return;

    // rimuovi handler precedente (se presente)
    if (container._listHandler) container.removeEventListener('click', container._listHandler);

    // bind delegato: trova item o button clicked e richiama onSelect con l'elemento corrispondente
    const handler = (e) => {
      const btn = e.target.closest('.li-details');
      const itemNode = e.target.closest('.list-item');
      if (!itemNode) return;
      const idx = itemNode.dataset.index ? Number(itemNode.dataset.index) : null;
      const model = Array.isArray(container._items) && idx != null ? container._items[idx] : null;
      if (btn) { e.stopPropagation(); onSelect && onSelect(model); }
      else { onSelect && onSelect(model); }
    };
    container._listHandler = handler;
    container.addEventListener('click', handler);

    // svuota container
    while (container.firstChild) container.removeChild(container.firstChild);

    if (!items || !items.length) {
      const msg = document.createElement('div');
      msg.textContent = "Nessun ristorante trovato nell'area selezionata.";
      container.appendChild(msg);
      container._items = [];
      return;
    }

    container._items = items; // conserviamo l'array per la delega
    const template = document.getElementById('list-item-template');
    const frag = document.createDocumentFragment();

    items.forEach((el, i) => {
      let node;
      if (template) {
        const clone = document.importNode(template.content, true);
        node = clone.querySelector('.list-item') ?? clone.firstElementChild;
        if (!node) { node = this._createItemDom(el, i); }
        else {
          node.dataset.index = String(i);
          const nameEl = node.querySelector('[data-li-name]');
          if (nameEl) nameEl.textContent = el.name || el.tags?.name || 'Ristorante senza nome';
          const metaEl = node.querySelector('[data-li-meta]');
          if (metaEl) {
            while (metaEl.firstChild) metaEl.removeChild(metaEl.firstChild);
            metaEl.appendChild(this._buildMetaFragment(el));
          }
        }
      } else {
        node = this._createItemDom(el, i);
      }
      frag.appendChild(node);
    });

    container.appendChild(frag);
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