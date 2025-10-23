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

    // Se già inizializzati, non aggiungere di nuovo i listeners 
    if (this._filtersBindingsInitialized) {
      return;
    }

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
      // Toast informativo per reset
      this._showToast('Filtri ripristinati', 'info');
    });

    btnApply.addEventListener('click', () => {
      this._updateFilterButtonsState(true);
      this.controller?.applyFilters && this.controller.applyFilters(this._currentFilters);
      // Toast di successo per applicazione filtri
      this._showToast('Filtri applicati', 'success');
    });

    // Segna bind completato per evitare doppie registrazioni
    this._filtersBindingsInitialized = true;
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


  // Bind degli eventi del pannello dettagli (UI only). Chiama il controller per le azioni di navigazione.
  bindDetailPanelEventsOnce() {
    if (this._detailBindingsInitialized) return;
    this._detailBindingsInitialized = true;

    // Like button
    const likeBtn = document.getElementById('dpLikeBtn');
    if (likeBtn && !likeBtn.__bound) {
      if (!likeBtn.querySelector('span')) {
        likeBtn.textContent = '';
        const sp = document.createElement('span');
        sp.textContent = '♡';
        likeBtn.appendChild(sp);
      }
      likeBtn.addEventListener('click', async () => {
        // Require login for like
        const isLogged = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
        if (!isLogged) {
          this._showToast('Devi essere loggato per fare questo', 'error');
          console.log('User not logged in - like action blocked');
          return;
        }
        // optimistic UI toggle
        const sp = likeBtn.querySelector('span');
        likeBtn.classList.toggle('liked');
        if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';

        // call controller to persist (controller.toggleLike must exist)
        try {
          const ctx = this._currentDetail || {};
          const docId = ctx.docId;
          const payload = ctx.payload || ctx.data || null;
          if (!docId) {
            console.warn('No docId available for like toggle');
            return;
          }
          if (!this.controller || typeof this.controller.toggleLike !== 'function') {
            console.warn('Controller.toggleLike not found');
            return;
          }
          const res = await this.controller.toggleLike(docId, payload);
          const likeChip = document.getElementById('dpLikeChip');
          if (!res || !res.ok) {
            // revert UI
            likeBtn.classList.toggle('liked');
            if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
            console.warn('toggleLike failed', res?.error);
            this._showToast('Operazione non riuscita', 'error');
          } else {
            // ensure final UI matches server and update likes chip
            if (res.liked) {
              likeBtn.classList.add('liked');
              if (sp) sp.textContent = '♥';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${cur + 1} ❤️`;
              }
              this._showToast('Aggiunto ai preferiti', 'success');
            } else {
              likeBtn.classList.remove('liked');
              if (sp) sp.textContent = '♡';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${Math.max(0, cur - 1)} ❤️`;
              }
              this._showToast('Rimosso dai preferiti', 'info');
            }
          }
        } catch (e) {
          console.error('Error toggling like', e);
          // revert optimistic UI
          likeBtn.classList.toggle('liked');
          if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
          this._showToast('Errore durante il like', 'error');
        }
      });
      likeBtn.__bound = true;
    }

    // Prev/Next buttons
    const prevBtn = document.getElementById('dpPrevPhoto');
    if (prevBtn && !prevBtn.__bound) {
      prevBtn.addEventListener('click', () => this.controller?.onPrevPhoto && this.controller.onPrevPhoto());
      prevBtn.__bound = true;
    }
    const nextBtn = document.getElementById('dpNextPhoto');
    if (nextBtn && !nextBtn.__bound) {
      nextBtn.addEventListener('click', () => this.controller?.onNextPhoto && this.controller.onNextPhoto());
      nextBtn.__bound = true;
    }

    // Keyboard shortcuts (global once)
    if (!window.__dp_kb_bound) {
      document.addEventListener('keydown', (e) => {
        const detailView = document.getElementById('detailView');
        if (!detailView || detailView.classList.contains('hidden')) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.controller?.onPrevPhoto && this.controller.onPrevPhoto();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.controller?.onNextPhoto && this.controller.onNextPhoto();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (this.controller?.onBack) this.controller.onBack(); else document.getElementById('dpBackToList')?.click();
        } else if (e.key === 'l' || e.key === 'L') {
          // Toggle like
          document.getElementById('dpLikeBtn')?.click();
        }
      });
      window.__dp_kb_bound = true;
    }

    // Bottone "Aggiungi recensione": visibile sempre, ma disabilitato se non loggato (come il like)
    const addBtn = document.getElementById('dpAddReviewBtn');
    if (addBtn) {
      const isLogged = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
      // Visualmente disabilitato ma cliccabile per mostrare toast
      addBtn.classList.toggle('is-disabled', !isLogged);
      addBtn.setAttribute('aria-disabled', String(!isLogged));
      if (!isLogged) addBtn.title = 'Accedi per aggiungere una recensione'; else addBtn.title = '';
      if (!addBtn.__bound) {
        addBtn.addEventListener('click', () => {
          // Se non loggato, mostra toast e non aprire form
          const ok = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
          if (!ok) { this._showToast('Devi essere loggato per fare questo', 'error'); return; }
          this._showAddReviewForm();
        });
        addBtn.__bound = true;
      }
    }
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

  // La view mostra i dettagli
  showDetails(data, fallbackName, el) {
    const detailView = document.getElementById('detailView');
    const listView = document.getElementById('listView');
    const filtersBar = document.getElementById('filtersBar');
    if (!detailView || !listView) return;
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
    if (filtersBar) filtersBar.classList.add('hidden');
    document.body.classList.add('detail-mode');
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.style.display = 'none';

  const titleEl = document.getElementById('dpTitle');
  const baseName = data?.name || fallbackName || (el?.name ?? el?.tags?.name ?? 'Dettagli ristorante');
    let openBadge = '';
    const openNow = (data?.open_now !== undefined ? data.open_now : (data?.opening_hours?.open_now));
    if (openNow !== undefined) {
      openBadge = `<span class="open-badge ${openNow ? 'open' : 'closed'}">${openNow ? 'Aperto' : 'Chiuso'}</span>`;
    }
    titleEl.innerHTML = `${baseName} ${openBadge}`;

    const img = document.getElementById('dpCurrentPhoto');
    const noPhotoMsg = document.getElementById('dpNoPhotoMsg');
    this._photosArray = data?.photos || [];
    if (this._photosArray.length) {
      img.style.display = 'block';
      noPhotoMsg.style.display = 'none';
      this._showPhoto(0);
    } else {
      img.style.display = 'none';
      noPhotoMsg.style.display = 'block';
      img.src = '';
    }

    const detailsEl = document.getElementById('dpDetails');
    const tags = el?.tags || {};
    const g = data || {};
    const distanceKm = typeof el?.distanceKm === 'number' ? `${el.distanceKm.toFixed(1)} km` : null;
    const price = g.price_level != null ? '€'.repeat(g.price_level || 1) : null;
    const rating = g.rating != null ? g.rating.toFixed(1) : null;
    const totalRatings = g.user_ratings_total != null ? g.user_ratings_total : null;
    const addr = g.formatted_address || null;
    const phone = g.international_phone_number || tags.phone || null;
    const website = g.website || tags.website || null;
    const cuisine = tags.cuisine || null;
    const wheelchair = (g.wheelchair_accessible_entrance || tags.wheelchair === 'yes') ? '♿ Accessibile' : null;
    const outdoor = tags.outdoor_seating === 'yes' ? '🌤️ Esterno' : null;
    const smoking = tags.smoking === 'yes' ? '🚬 Fumatori' : (tags.smoking === 'no' ? '🚭 Non fumatori' : null);
    const vegetarian = g.serves_vegetarian_food ? '🥦 Veg options' : null;
    const breakfast = g.serves_breakfast ? '🍳 Colazione' : null;
    const lunch = g.serves_lunch ? '🍝 Pranzo' : null;
    const dinner = g.serves_dinner ? '🍽️ Cena' : null;
    const dineIn = g.dine_in === false ? null : '🪑 Sala';
    const delivery = g.delivery ? '🚚 Delivery' : null;
    const takeout = g.takeout ? '🥡 Asporto' : null;
    const reservable = g.reservable ? '📅 Prenotabile' : null;
    const email = tags.email ? `✉️ ${tags.email}` : null;
    const facebook = tags['contact:facebook'] ? `ⓕ Facebook` : null;
    const instagram = tags['contact:instagram'] ? `📸 Instagram` : null;
    const dietVegan = tags['diet:vegan'] === 'yes' ? '🌱 Vegan' : null;
    const dietVegetarian = tags['diet:vegetarian'] === 'yes' ? '🥗 Vegetarian' : null;
    const dietGlutenFree = tags['diet:gluten_free'] === 'yes' ? '🚫🌾 Gluten-free' : null;
    const cards = (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') ? '💳 Carte' : null;
    const cash = tags['payment:cash'] === 'no' ? null : (tags['payment:cash'] === 'yes' ? '💶 Contanti' : null);

    const chipMeta = [
      { label: distanceKm, cat: 'meta' }, { label: price, cat: 'meta' },
      { label: wheelchair, cat: 'access' }, { label: vegetarian, cat: 'diet' },
      { label: breakfast, cat: 'service' }, { label: lunch, cat: 'service' }, { label: dinner, cat: 'service' },
      { label: outdoor, cat: 'service' }, { label: smoking, cat: 'service' }, { label: dineIn, cat: 'service' },
      { label: delivery, cat: 'service' }, { label: takeout, cat: 'service' }, { label: reservable, cat: 'service' },
      { label: dietVegan, cat: 'diet' }, { label: dietVegetarian, cat: 'diet' }, { label: dietGlutenFree, cat: 'diet' },
      { label: cards, cat: 'pay' }, { label: cash, cat: 'pay' }
    ];
    // Likes count chip (show even if zero so position is stable)
    const likesCount = Array.isArray(g?.liked) ? g.liked.length : (Array.isArray(el?.liked) ? el.liked.length : 0);
    chipMeta.unshift({ label: `${likesCount} ❤️`, cat: 'meta', id: 'dpLikeChip' });
    const chips = chipMeta.filter(o => o.label !== null && o.label !== undefined).map(o => {
      const idAttr = o.id ? ` id="${o.id}"` : '';
      return `<span class="chip" data-cat="${o.cat}"${idAttr}>${o.label}</span>`;
    }).join('');
    const contactLines = [
      addr ? `<div class="fact"><span class="icon">📍</span><span class="fact-text">${addr}</span></div>` : '',
      phone ? `<div class="fact"><span class="icon">📞</span><span class="fact-text">${phone}</span></div>` : '',
      website ? `<div class="fact"><span class="icon">🔗</span><a href="${website}" target="_blank" rel="noopener" style="font-size: 18px;">Sito Web</a></div>` : '',
      email ? `<div class="fact"><span class="icon">✉️</span><span class="fact-text">${email.replace('✉️ ','')}</span></div>` : '',
      facebook ? `<div class="fact"><span class="icon">ⓕ</span><span class="fact-text">${facebook.replace('ⓕ ','')}</span></div>` : '',
      instagram ? `<div class="fact"><span class="icon">📸</span><span class="fact-text">${instagram.replace('📸 ','')}</span></div>` : '',
      cuisine ? `<div class="fact"><span class="icon">🍽️</span><span class="fact-text">${cuisine}</span></div>` : ''
    ].filter(Boolean).join('');

    const hoursSource = g.opening_hours_weekday_text || g.opening_hours || tags.opening_hours;
    const hoursHtml = hoursSource ? `<div class="hours-block">${this.renderOpeningHoursHTML(hoursSource)}</div>` : '';
    const editorial = g.editorial_summary?.overview ? `<div class="editorial"><p>${g.editorial_summary.overview}</p></div>` : '';

    detailsEl.innerHTML = `
      <section class="chips-section">${chips}</section>
      <section class="card info-card">
        <h3 class="card-title">Info</h3>
        <div class="facts-grid">${contactLines}</div>
      </section>
      ${hoursHtml ? `<section class=\"card hours-card\">${hoursHtml}</section>` : ''}
      ${editorial ? `<section class=\"card editorial-card\">${editorial}</section>` : ''}
    `;

    this._renderStars(g?.rating, 'dpStars');
    const ratingNumEl = document.getElementById('dpRatingNumber');
    if (ratingNumEl) ratingNumEl.textContent = rating ? rating : '';

    const reviewsListEl = document.getElementById('dpReviewsList');
    const reviewsCount = document.getElementById('dpReviewsCount');
    reviewsListEl.innerHTML = '';
    const googleReviews = Array.isArray(data?.reviews) ? data.reviews.slice(0, 5) : [];
    if (googleReviews.length) {
      googleReviews.forEach(r => {
        const name = r.author_name || 'Anonimo';
        const url = r.author_url || null;
        const avatar = r.profile_photo_url || '';
        const rating = (typeof r.rating === 'number' && isFinite(r.rating)) ? r.rating : null;
        const rounded = rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : null;
        const relTime = r.relative_time_description || '';
        const text = r.text || '';

        const starsHtml = this._buildReviewStars(rating);
        const nameHtml = url ? `<a href="${url}" target="_blank" rel="noopener" class="review-author">${name}</a>`
                             : `<span class="review-author">${name}</span>`;
        const avatarHtml = avatar ? `<img class="review-avatar" src="${avatar}" alt="Foto profilo di ${name}">`
                                  : `<div class="review-avatar fallback" aria-hidden="true">👤</div>`;
        const rightCluster = (rounded != null)
          ? `<div class="review-stars">${starsHtml}<span class="review-rating-number">(${rounded})</span></div>`
          : '';

        const div = document.createElement('div');
        div.className = 'review';
        div.innerHTML = `
          <div class="review-header">
            <div class="review-id">
              ${avatarHtml}
              <div class="review-header-text">
                ${nameHtml}
                ${relTime ? `<div class="review-time">${relTime}</div>` : ''}
              </div>
            </div>
            ${rightCluster}
          </div>
          <div class="review-text">${text}</div>
        `;
        reviewsListEl.appendChild(div);
      });
      reviewsCount.textContent = `(${googleReviews.length})`;
    } else {
      reviewsListEl.innerHTML = '<div class="review">Nessuna recensione disponibile.</div>';
      reviewsCount.textContent = '';
    }

    // Ensure the detail panel UI bindings (like, prev/next, keyboard) are attached once.
    // Prepare current detail context for persistence actions (like)
    try {
      const raw = el?.raw ?? el;
      const docId = raw ? `osm_${raw.type}_${raw.id}` : null;
      const minimalPayload = {
        name: data?.name || fallbackName || raw?.tags?.name || null,
        placeId: data?.placeId || null,
        formatted_address: data?.formatted_address || null,
        international_phone_number: data?.international_phone_number || null,
        cuisine: (el?.tags?.cuisine) || null,
        location: (data?.location || (raw && raw.lat && raw.lon ? { lat: raw.lat, lng: raw.lon } : null)),
        savedAt: data?.savedAt || new Date().toISOString()
      };
      this._currentDetail = { docId, payload: minimalPayload, rawEl: el, data };
    } catch (e) { console.warn('Unable to compute current detail context for like toggling', e); }
    this.bindDetailPanelEventsOnce();
    // Reset like button state synchronously to avoid propagation of previous optimistic toggles
    try {
      const likeBtn = document.getElementById('dpLikeBtn');
      const sp = likeBtn?.querySelector('span');
      if (likeBtn) {
        likeBtn.classList.remove('liked');
        if (sp) sp.textContent = '♡';
      }
      // Async: fetch authoritative like state and update UI
      (async () => {
        try {
          const ctx = this._currentDetail || {};
          const docId = ctx.docId;
          if (!docId || !this.controller || typeof this.controller.isRestaurantLikedByCurrentUser !== 'function') return;
          const liked = await this.controller.isRestaurantLikedByCurrentUser(docId);
          if (likeBtn) {
            if (liked) { likeBtn.classList.add('liked'); if (sp) sp.textContent = '♥'; }
            else { likeBtn.classList.remove('liked'); if (sp) sp.textContent = '♡'; }
          }
          // Update likes chip with server value
          if (this.controller && typeof this.controller.getSavedRestaurant === 'function') {
            const saved = await this.controller.getSavedRestaurant(docId);
            const likeChip = document.getElementById('dpLikeChip');
            const likesCount = Array.isArray(saved?.liked) ? saved.liked.length : 0;
            if (likeChip) { likeChip.textContent = `${likesCount} ❤️`; }
          }
        } catch (e) { console.warn('Error refreshing like state', e); }
      })();
    } catch(e) { /* ignore */ }

    // Carica e mostra le recensioni utente (oltre a quelle di Google)
    (async () => {
      try {
        const ctx = this._currentDetail || {};
        const rid = ctx.docId;
        if (rid && this.controller && typeof this.controller.fetchUserReviews === 'function') {
          const userReviews = await this.controller.fetchUserReviews(rid);
          this._userReviews = Array.isArray(userReviews) ? userReviews : [];
          if (this._userReviews.length) {
            this._renderUserReviewsAppend(this._userReviews);
            const googleCount = googleReviews.length;
            const total = googleCount + this._userReviews.length;
            const reviewsCount = document.getElementById('dpReviewsCount');
            if (reviewsCount) reviewsCount.textContent = `(${total})`;
          }
        }
      } catch (e) { console.warn('Impossibile caricare recensioni utente', e); }
    })();
  }

  // Rende un form inline per aggiungere recensione utente (solo loggati). Nome da localStorage, rating obbligatorio.
  _showAddReviewForm() {
    const listEl = document.getElementById('dpReviewsList');
    if (!listEl) return;

    // Save current HTML to restore on cancel
    if (this._savedReviewsHtml == null) this._savedReviewsHtml = listEl.innerHTML;

    // Build a simple form UI
    const lsName = (()=>{ try { return localStorage.getItem('userName') || 'Anonimo'; } catch { return 'Anonimo'; } })();
    listEl.innerHTML = `
      <form id="addReviewForm" class="add-review-form" onsubmit="return false;">
        <div class="arf-row">
          <label>Nome</label>
          <input type="text" id="arfName" value="${lsName}" disabled />
        </div>
        <div class="arf-row">
          <label>Voto</label>
          <div class="arf-stars" id="arfStars" role="radiogroup" aria-label="Seleziona voto in stelle">
            ${[1,2,3,4,5].map(i => `<button type="button" class="arf-star" data-value="${i}" aria-label="${i} stelle">★</button>`).join('')}
          </div>
          <input type="number" id="arfRating" min="1" max="5" step="1" placeholder="1-5" inputmode="numeric" aria-label="Voto numerico" />
        </div>
        <div class="arf-row">
          <label>Commento (facoltativo)</label>
          <textarea id="arfText" rows="3" placeholder="Scrivi qui la tua esperienza (opzionale)"></textarea>
        </div>
        <div class="arf-actions">
          <button type="button" id="arfCancel" class="btn-secondary">Annulla</button>
          <button type="button" id="arfSave" class="btn-primary" disabled>Aggiungi</button>
        </div>
      </form>
    `;

    // State
    let currentRating = null;
    const stars = Array.from(listEl.querySelectorAll('.arf-star'));
    const ratingInput = listEl.querySelector('#arfRating');

    const renderStars = () => {
      stars.forEach((s, idx) => {
        const active = currentRating != null && idx < currentRating;
        s.classList.toggle('active', !!active);
        s.style.color = active ? '#FFD54A' : '#ddd';
      });
      // Enable save only when a rating is selected (name fixed; text optional)
      const saveBtn = listEl.querySelector('#arfSave');
      if (saveBtn) saveBtn.disabled = (currentRating == null);
    };

    // Star click -> set rating
    stars.forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = parseInt(btn.getAttribute('data-value'), 10);
        currentRating = (v >= 1 && v <= 5) ? v : null;
        ratingInput.value = currentRating != null ? String(currentRating) : '';
        renderStars();
      });
    });

    // Numeric input -> update stars
    ratingInput.addEventListener('input', () => {
      const v = parseInt(ratingInput.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 5) currentRating = v; else currentRating = null;
      renderStars();
    });

    // Cancel -> restore previous list content
    const cancelBtn = listEl.querySelector('#arfCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      if (this._savedReviewsHtml != null) {
        listEl.innerHTML = this._savedReviewsHtml;
        this._savedReviewsHtml = null;
      } else {
        node = this._createItemDom(el, i);
      }
    });

    // Salva recensione (rating obbligatorio, testo opzionale)
    const saveBtn = listEl.querySelector('#arfSave');
    if (saveBtn) saveBtn.addEventListener('click', async () => {
      try {
        const nameInput = listEl.querySelector('#arfName');
        const textInput = listEl.querySelector('#arfText');
        const author_name = nameInput?.value || 'Anonimo';
        const rating = currentRating;
        const text = (textInput?.value || '').trim();
        // Validazione minima
        if (!(rating >= 1 && rating <= 5)) return;
        const ctx = this._currentDetail || {};
        const restaurantId = ctx.docId;
        const restaurantName = ctx?.payload?.name || '';
        if (!restaurantId || !this.controller || typeof this.controller.addUserReview !== 'function') return;
        const res = await this.controller.addUserReview({ restaurantId, restaurantName, author_name, rating, text });
        if (!res || !res.ok) {
          this._showToast('Impossibile aggiungere la recensione. Riprova.', 'error');
          return;
        }
        // Feedback utente: toast in alto al centro (classe CSS esterna)
        this._showToast('Recensione aggiunta con successo', 'success');

        // Torna allo stato precedente (uscire dalla modalità inserimento)
        if (this._savedReviewsHtml != null) {
          listEl.innerHTML = this._savedReviewsHtml;
          this._savedReviewsHtml = null;
        } else {
          listEl.innerHTML = '';
        }

        // Aggiorna lista locale e append la nuova recensione utente dopo le Google
        const saved = res.data;
        if (!Array.isArray(this._userReviews)) this._userReviews = [];
        this._userReviews.unshift(saved);
        this._renderUserReviewsAppend([saved]);
        // Aggiorna contatore totale (Google + utenti)
        const googleCount = Array.isArray((this._currentDetail?.data?.reviews)) ? Math.min(5, this._currentDetail.data.reviews.length) : 0;
        const total = googleCount + this._userReviews.length;
        const reviewsCount = document.getElementById('dpReviewsCount');
        if (reviewsCount) reviewsCount.textContent = `(${total})`;
      } catch (e) {
        console.warn('Errore salvataggio recensione', e);
        this._showToast('Errore durante il salvataggio della recensione.', 'error');
      }
    });

    // Initial paint
    renderStars();
  }

  // Appende recensioni utente al fondo della lista, con avatar standard
  _renderUserReviewsAppend(reviews) {
    const reviewsListEl = document.getElementById('dpReviewsList');
    if (!reviewsListEl || !Array.isArray(reviews) || !reviews.length) return;
    for (const r of reviews) {
      const name = r.author_name || 'Anonimo';
      const rating = (typeof r.rating === 'number' && isFinite(r.rating)) ? r.rating : null;
      const rounded = rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : null;
      const text = r.text || '';
      const starsHtml = this._buildReviewStars(rating);
      const avatarHtml = `<div class="review-avatar fallback" aria-hidden="true">👤</div>`;
      const rightCluster = (rounded != null)
        ? `<div class="review-stars">${starsHtml}<span class="review-rating-number">(${rounded})</span></div>`
        : '';
      const div = document.createElement('div');
      div.className = 'review';
      div.innerHTML = `
        <div class="review-header">
          <div class="review-id">
            ${avatarHtml}
            <div class="review-header-text">
              <span class="review-author">${name}</span>
              ${r.time ? `<div class="review-time">${new Date(r.time).toLocaleDateString('it-IT')}</div>` : ''}
            </div>
          </div>
          ${rightCluster}
        </div>
        <div class="review-text">${text}</div>
      `;
      reviewsListEl.appendChild(div);
    }
  }

  // Toast helper: usa container fisso in cima alla pagina, stili definiti in CSS/style.css (namespaced: fe-toast)
  _showToast(message, variant = 'success') {
    try {
      let container = document.querySelector('.fe-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'fe-toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `fe-toast fe-toast--${variant}`;
      toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
      toast.textContent = message;
      container.appendChild(toast);
      // Auto remove after 2.5s with fade-out
      setTimeout(() => {
        toast.classList.add('fe-toast--hide');
        setTimeout(() => { try { toast.remove(); } catch {} }, 250);
      }, 2500);
    } catch {}
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