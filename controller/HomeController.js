import GeolocationService from "../services/GeolocationService.js";
import OverpassService from "../services/OverpassService.js";
import Restaurant from "../model/Restaurant.js";
import GooglePlacesService from "../services/GooglePlacesService.js";
import FirestoreService from "../services/FirestoreService.js";
import AuthService from "../services/AuthService.js";
import { auth } from "../services/firebase-config.js";

export default class HomeController {
  constructor(view) {
    this.view = view; // Vhome instance
    this.geo = new GeolocationService();
    this.overpass = new OverpassService();
    this.watchId = null;
    this._placesService = null;
    this._firebase = null;
    this._filters = { liked: false, reviewed: false, distanceKm: 5 };
    this._lastUserPos = null;
    this._restaurants = [];
    this._likedRestaurantIds = new Set();
    this._abortController = null;
  }

  async init(filters) {
    if (filters) this._filters = { ...this._filters, ...filters };
    const statusDiv = document.getElementById("status");
    const mapSpinner = document.getElementById('mapSpinner');
    const leftSpinner = document.getElementById('leftSpinner');
    try {
      if (statusDiv) statusDiv.innerText = "📍 Recupero la tua posizione...";
      if (mapSpinner) mapSpinner.classList.remove('hidden');
      if (leftSpinner) leftSpinner.classList.remove('hidden');

      // Get current position with a dedicated try/catch to surface precise geolocation errors
      let pos;
      try {
        console.debug('HomeController: calling geo.getCurrentPosition()');
        pos = await this.geo.getCurrentPosition();
        console.debug('HomeController: geo.getCurrentPosition resolved', pos);
        // If the geolocation service returned a synthetic fallback, inform the user
        if (pos && pos.isFallback && statusDiv) {
          statusDiv.innerText = '⚠️ Geolocalizzazione non disponibile: usiamo una posizione predefinita (L\'Aquila).';
        } else if (pos && pos.isCached && statusDiv) {
          statusDiv.innerText = 'ℹ️ Posizione recente usata (in attesa di precisione).';
        }
      } catch (geoErr) {
        console.error('HomeController: geolocation error', geoErr);
        if (statusDiv) statusDiv.innerText = `⚠️ Errore geolocalizzazione: ${geoErr?.message || geoErr}`;
        // Keep user informed but don't throw to the outer catch — just stop initialization
        return;
      }

  const lat = pos.coords.latitude;
  const lon = pos.coords.longitude;
  this._lastUserPos = { lat, lon };
  const kmInit = Math.max(1, Math.min(10, this._filters.distanceKm || 5));
  const radius = kmInit * 1000;
  if (statusDiv) statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;

      // Initialize the map and user marker (defensive: check view exists)
      try {
        if (!this.view) throw new Error('View non inizializzata');
        this.view.initMap([lat, lon], radius);
        this.view.setUserMarker(lat, lon);
      } catch (viewErr) {
        console.error('HomeController: errore inizializzando la mappa o il view', viewErr);
        if (statusDiv) statusDiv.innerText = '⚠️ Errore inizializzando la mappa.';
        return;
      }

      // watch position updates (non-blocking)
      try {
        this.watchId = this.geo.watchPosition(p => {
          try { this.view.updateUserPosition(p.coords.latitude, p.coords.longitude); } catch(e) { console.warn('updateUserPosition failed', e); }
        });
      } catch (watchErr) {
        console.warn('HomeController: watchPosition failed', watchErr);
      }

      // Initialize Firestore service and refresh liked set for current user (non-blocking)
      try {
        this._firebase = new FirestoreService();
        // attempt to refresh liked set, ignore errors
        try { await this._refreshLikedSet(); } catch(e) { console.warn('refreshLikedSet failed', e); }
      } catch(e) { console.warn('Unable to init Firestore service early', e); }

  // Load restaurants (network call) and render UI
      const restaurants = await this._loadRestaurants(lat, lon, radius, statusDiv);
      // Annotate restaurants with docId and isLiked flag
      for (const r of restaurants) {
        try { const docId = this._computeDocIdFromRestaurant(r); r.docId = docId; r.isLiked = this._likedRestaurantIds.has(docId); } catch(e) { r.isLiked = false; }
      }
      if (!Array.isArray(restaurants) || restaurants.length === 0) {
        if (statusDiv) statusDiv.innerText = "😔 Nessun ristorante trovato.";
        return;
      }

      if (statusDiv) statusDiv.innerText = `🍽️ Trovati ${restaurants.length} ristoranti!`;

      // Render markers and list (view handles UI bindings)
      try {
        this._placesService = new GooglePlacesService();
        // Apply liked filter if active
        const renderList = this._filters.liked ? restaurants.filter(r => r.isLiked) : restaurants;
        this.view.renderMapRestaurants(renderList, (payload) => this.handleMarkerClick(payload));
        this.view.renderList(renderList, (el) => this.onListSelect(el));
      } catch (renderErr) {
        console.error('HomeController: errore rendering view', renderErr);
        if (statusDiv) statusDiv.innerText = '⚠️ Errore rendering UI.';
        return;
      }

      // Ensure back button handler exists only once
      const backBtn = document.getElementById('dpBackToList');
      if (backBtn && !backBtn.__boundToController) {
        backBtn.addEventListener('click', () => this.onBack());
        backBtn.__boundToController = true;
      }
    } catch (err) {
      // Fallback catch: show message and log full error for debugging
      if (statusDiv) statusDiv.innerText = "⚠️ Errore durante l'inizializzazione.";
      console.error('HomeController: unexpected error in init', err);
      alert(`Errore inizializzazione: ${err?.message || err}`);
    } finally { if (mapSpinner) mapSpinner.classList.add('hidden'); if (leftSpinner) leftSpinner.classList.add('hidden'); }
  }

  /**
   * Toggle like for a given restaurant docId. This will:
   * - ensure the restaurant doc exists (merge save when needed)
   * - atomically add/remove the current user id to Restaurant.liked
   * - atomically add/remove the restaurant id to User.likedRestaurants
   * Returns { ok: true, liked: boolean } on success, or { ok: false, error }
   */
  async toggleLike(docId, restaurantPayload) {
    try {
      // Require auth
      const user = auth.currentUser;
      if (!user) return { ok: false, error: 'not-authenticated' };
      const uid = user.uid;

      // Ensure firebase service available
      if (!this._firebase) this._firebase = new FirestoreService();

      // Ensure restaurant document exists on first like (merge save is safe)
      if (restaurantPayload) {
        // Merge-save the basic payload (this will not remove existing fields)
        await this._firebase.saveById('Restaurant', docId, restaurantPayload);
      }

      // Read current restaurant doc to decide add/remove
      const saved = await this._firebase.getById('Restaurant', docId);
      const likedArray = Array.isArray(saved?.liked) ? saved.liked : [];
      const alreadyLiked = likedArray.includes(uid);

      if (!alreadyLiked) {
        // Add user id to Restaurant.liked and restaurant id to User.likedRestaurants
        const p1 = this._firebase.arrayUnionField('Restaurant', docId, 'liked', uid);
        const p2 = this._firebase.arrayUnionField('User', uid, 'likedRestaurants', docId);
        await Promise.all([p1, p2]);
        // update local set
        this._likedRestaurantIds.add(docId);
        return { ok: true, liked: true };
      } else {
        // Remove
        const p1 = this._firebase.arrayRemoveField('Restaurant', docId, 'liked', uid);
        const p2 = this._firebase.arrayRemoveField('User', uid, 'likedRestaurants', docId);
        await Promise.all([p1, p2]);
        // update local set
        this._likedRestaurantIds.delete(docId);
        return { ok: true, liked: false };
      }
    } catch (e) {
      console.error('toggleLike error', e);
      return { ok: false, error: e };
    }
  }

  // Return saved restaurant doc (or null)
  async getSavedRestaurant(docId) {
    try {
      if (!this._firebase) this._firebase = new FirestoreService();
      return await this._firebase.getById('Restaurant', docId);
    } catch (e) {
      console.warn('getSavedRestaurant failed', e);
      return null;
    }
  }

  _computeDocIdFromRestaurant(r) {
    // r.raw may contain type and id, otherwise fallback to stored docId
    const raw = r.raw ?? r;
    if (raw && raw.type && raw.id) return `osm_${raw.type}_${raw.id}`;
    return r.docId || null;
  }

  async _refreshLikedSet() {
    try {
      const user = auth.currentUser;
      this._likedRestaurantIds = new Set();
      if (!user) return;
      // Read user doc to get likedRestaurants array
      if (!this._firebase) this._firebase = new FirestoreService();
      const udoc = await this._firebase.getById('User', user.uid);
      const arr = Array.isArray(udoc?.likedRestaurants) ? udoc.likedRestaurants : [];
      for (const id of arr) this._likedRestaurantIds.add(id);
    } catch (e) {
      console.warn('Failed to refresh liked set', e);
    }
  }

  // Returns true if current logged-in user has liked the restaurant
  async isRestaurantLikedByCurrentUser(docId) {
    try {
      const user = auth.currentUser;
      if (!user) return false;
      const saved = await this.getSavedRestaurant(docId);
      return Array.isArray(saved?.liked) && saved.liked.includes(user.uid);
    } catch (e) {
      console.warn('isRestaurantLikedByCurrentUser failed', e);
      return false;
    }
  }

  async applyFilters(filters) {
    // Merge and re-fetch
  this._filters = { ...this._filters, ...filters };
  const statusDiv = document.getElementById('status');
  const mapSpinner = document.getElementById('mapSpinner');
  const leftSpinner = document.getElementById('leftSpinner');
  if (!this._lastUserPos) return; // safety
  const { lat, lon } = this._lastUserPos;
  const kmApply = Math.max(1, Math.min(10, this._filters.distanceKm || 5));
  const radius = kmApply * 1000;
  if (statusDiv) statusDiv.innerText = `🔄 Aggiorno risultati entro ${radius} m...`;
  if (mapSpinner) mapSpinner.classList.remove('hidden');
  if (leftSpinner) leftSpinner.classList.remove('hidden');
    // Update map radius circle (view keeps persistent map)
    try {
      this.view.initMap([lat, lon], radius);
      this.view.setUserMarker(lat, lon);
    } catch(e) { /* ignore */ }

  const restaurants = await this._loadRestaurants(lat, lon, radius, statusDiv);
    if (!Array.isArray(restaurants) || restaurants.length === 0) {
      if (statusDiv) statusDiv.innerText = "😔 Nessun ristorante trovato.";
      return;
    }
    if (statusDiv) statusDiv.innerText = `🍽️ Trovati ${restaurants.length} ristoranti!`;
    // Annotate and filter by liked if required
    for (const r of restaurants) {
      try { const docId = this._computeDocIdFromRestaurant(r); r.docId = docId; r.isLiked = this._likedRestaurantIds.has(docId); } catch(e) { r.isLiked = false; }
    }
    const renderList = this._filters.liked ? restaurants.filter(r => r.isLiked) : restaurants;
    this.view.renderMapRestaurants(renderList, (payload) => this.handleMarkerClick(payload));
    this.view.renderList(renderList, (el) => this.onListSelect(el));
    if (mapSpinner) mapSpinner.classList.add('hidden');
    if (leftSpinner) leftSpinner.classList.add('hidden');
  }

  async _loadRestaurants(lat, lon, radius, statusDiv) {
    try {
      // Cancel previous in-flight Overpass request if any
      if (this._abortController) {
        try { this._abortController.abort(); } catch {}
      }
      this._abortController = new AbortController();
      const elements = await this.overpass.fetchRestaurants(lat, lon, radius, { signal: this._abortController.signal });
      const list = elements.map(Restaurant.fromOverpass);
      for (const r of list) r.computeDistance(lat, lon);
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      this._restaurants = list;
      // Note: liked/reviewed filters are UI-only placeholders for now
      return list;
    } catch (loadErr) {
      console.error('HomeController: errore caricando i ristoranti', loadErr);
      if (statusDiv) statusDiv.innerText = '⚠️ Errore caricando i dati dei ristoranti.';
      return [];
    }
  }

  onMarkerSelected({ data, fallbackName, el }) {
    if (this.view?.showDetails) {
      // Ensure UI bindings for the detail panel are initialized (like/keys/prev-next)
      if (typeof this.view.bindDetailPanelEventsOnce === 'function') this.view.bindDetailPanelEventsOnce();
      // el è Restaurant
      this.view.showDetails(data, fallbackName, el);
    }
  }

  // New: centralize enrichment logic here (Firebase + Google Places) previously in markerManager
  async handleMarkerClick({ el, location, fallbackName }) {
    // el è Restaurant: recupera raw quando serve
    const raw = el.raw ?? el; // compat: se mai venisse passato il raw
    const lat = location?.lat; const lon = location?.lon;
    const name = fallbackName || el?.name || el?.tags?.name;
    const docId = `osm_${raw.type}_${raw.id}`;

    // Assicuriamoci che il servizio Places sia disponibile
    if (!this._placesService) this._placesService = new GooglePlacesService();

    // Recupero da Firebase se disponibile
    try {
      console.log('HomeController: checking Firebase for docId', docId);
      const saved = await this._firebase.getById('Restaurant', docId);
      if (saved) {
        // Salviamo gli URL delle foto in DB, ma quando le recuperiamo controlliamo
        // se savedAt è più vecchio di 2 giorni rinfreschiamo le foto e aggiorniamo il DB.
        const now = Date.now();
        const tooOld = FirestoreService.isOlderThanTwoDays(saved?.savedAt, now);

        // Se NON è troppo vecchio e ci sono foto salvate, usa direttamente quelle
        if (!tooOld && Array.isArray(saved.photos) && saved.photos.length > 0) {
          return this.onMarkerSelected({ data: saved, fallbackName: name, el });
        }

        // Altrimenti prova a rinfrescare da Google Places (preferibilmente via placeId)
        let dataUpdated = { ...saved };
        try {
          console.log("troppo vecchio, rinfresco foto da Google Places");
          let place = null;
          if (saved.placeId) {
            place = await this._placesService.getDetailsById(saved.placeId);
          } else {
            // Se manca placeId, prova un match per nome/posizione per ottenerlo
            place = await this._placesService.getDetailsByName(name, lat, lon);
            if (place?.place_id && !saved.placeId) dataUpdated.placeId = place.place_id;
          }
          const newPhotos = place?.photos?.slice(0,5).map(p => p.getUrl({ maxWidth:800, maxHeight:600 })) || [];
          if (newPhotos.length > 0) {
            dataUpdated.photos = newPhotos;
          }
          dataUpdated.savedAt = new Date(now).toISOString();
          // Persisto le modifiche (merge) per aggiornare savedAt e, se trovate, le foto/placeId
          try { await this._firebase.saveById('Restaurant', docId, dataUpdated); } catch(e) { console.warn('Impossibile aggiornare il ristorante con le nuove foto', e); }
        } catch(e) {
          console.warn('Refresh foto fallito: uso dati salvati in DB', e);
        }
        return this.onMarkerSelected({ data: dataUpdated, fallbackName: name, el });
      }
    } catch(e) {
      console.warn('Firebase getById failed (non blocking)', e);
    }

    // No saved doc -> try Google Places
    try {
      const place = await this._placesService.getDetailsByName(name, lat, lon);
      const openNow = (place?.current_opening_hours?.open_now ?? place?.opening_hours?.open_now);
      const weekdayText = place?.current_opening_hours?.weekday_text || place?.opening_hours?.weekday_text || null;
  // Foto: generiamo URL e li SALVIAMO nel DB 
  const photos = place?.photos?.slice(0,5).map(p => p.getUrl({ maxWidth:800, maxHeight:600 })) || [];

      const toSaveRaw = {
        name: place?.name || name,
        placeId: place?.place_id || null,
        formatted_address: place?.formatted_address || null,
        international_phone_number: place?.international_phone_number || null,
        website: place?.website || null,
        cuisine: el.tags?.cuisine || null,
        opening_hours_weekday_text: weekdayText,
        open_now: (openNow === true ? true : openNow === false ? false : null),
        rating: place?.rating || null,
        user_ratings_total: place?.user_ratings_total || null,
        price_level: place?.price_level ?? null,
        reviews: place?.reviews || [],
        editorial_summary: place?.editorial_summary || null,
        serves_breakfast: place?.serves_breakfast || false,
        serves_lunch: place?.serves_lunch || false,
        serves_dinner: place?.serves_dinner || false,
        serves_vegetarian_food: place?.serves_vegetarian_food || false,
        reservable: place?.reservable || false,
        delivery: place?.delivery || false,
        dine_in: place?.dine_in || false,
        takeout: place?.takeout || false,
        wheelchair_accessible_entrance: place?.wheelchair_accessibile_entrance || false,
        photos,
        location: { lat, lng: lon },
        savedAt: new Date().toISOString()
      };
      const toSave = JSON.parse(JSON.stringify(toSaveRaw)); // strip undefined
      try { await this._firebase.saveById('Restaurant', docId, toSave); } catch(e) { console.warn('Impossibile salvare su Firebase (non blocking)', e); }
      // Mostra i dettagli usando i dati appena salvati (incluso photos)
      return this.onMarkerSelected({ data: toSave, fallbackName: name, el });
    } catch(e) {
      console.warn('Google Places fallback failed (non blocking)', e);
    }

    // Fallback: show OSM-only details
    return this.onMarkerSelected({ data: null, fallbackName: name, el });
  }

  onListSelect(el) {
    // el è Restaurant: Chiede alla View di attivare il marker corrispondente
    this.view.selectOnMapById(el.id);
  }

  onBack() {
    this.view.clearMapSelection();
    this.view.showList();
  }

  // Photo navigation callbacks used by the view bindings (keyboard/prev/next)
  onPrevPhoto() {
    // Prefer to instruct DetailsView to navigate
    try {
      if (this.view?.detailsView && typeof this.view.detailsView.prevPhoto === 'function') {
        this.view.detailsView.prevPhoto();
        return;
      }
      // fallback (compat): if view exposes _showPhoto directly
      if (this.view && typeof this.view._showPhoto === 'function') {
        const idx = (this.view._currentPhotoIndex || 0) - 1;
        this.view._showPhoto(idx);
      }
    } catch (e) { console.warn('onPrevPhoto fallback failed', e); }
  }

  onNextPhoto() {
    try {
      if (this.view?.detailsView && typeof this.view.detailsView.nextPhoto === 'function') {
        this.view.detailsView.nextPhoto();
        return;
      }
      if (this.view && typeof this.view._showPhoto === 'function') {
        const idx = (this.view._currentPhotoIndex || 0) + 1;
        this.view._showPhoto(idx);
      }
    } catch (e) { console.warn('onNextPhoto fallback failed', e); }
  }

  destroy() {
    if (this.watchId) this.geo.clearWatch(this.watchId);
  }

  async logout() {
    let result = await AuthService.logout();
    if (result) {
      console.log("Logout avvenuto con successo");
      localStorage.clear();
      this.router.navigate("/");
    } else {
      console.log("Logout fallito");
    }
  }

}