import GeolocationService from "../services/GeolocationService.js";
import OverpassService from "../services/OverpassService.js";
import RestaurantModel from "../model/RestaurantModel.js";
import GooglePlacesService from "../services/GooglePlacesService.js";
import FirebaseService from "../services/FirebaseService.js";

export default class HomeController {
  constructor(view) {
    this.view = view; // Vhome instance
    this.geo = new GeolocationService();
    this.overpass = new OverpassService();
    this.model = new RestaurantModel(this.overpass);
    this.watchId = null;
    this._placesService = null;
    this._firebase = null;
  }

  async init() {
    const statusDiv = document.getElementById("status");
    try {
      if (statusDiv) statusDiv.innerText = "📍 Recupero la tua posizione...";

      // Get current position with a dedicated try/catch to surface precise geolocation errors
      let pos;
      try {
        console.debug('HomeController: calling geo.getCurrentPosition()');
        pos = await this.geo.getCurrentPosition();
        console.debug('HomeController: geo.getCurrentPosition resolved', pos);
      } catch (geoErr) {
        console.error('HomeController: geolocation error', geoErr);
        if (statusDiv) statusDiv.innerText = `⚠️ Errore geolocalizzazione: ${geoErr?.message || geoErr}`;
        // Keep user informed but don't throw to the outer catch — just stop initialization
        return;
      }

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      const radius = 10000;
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

      // Load restaurants (network call) and render UI
      let restaurants = [];
      try {
        restaurants = await this.model.loadNearby(lat, lon, radius);
      } catch (loadErr) {
        console.error('HomeController: errore caricando i ristoranti', loadErr);
        if (statusDiv) statusDiv.innerText = '⚠️ Errore caricando i dati dei ristoranti.';
        return;
      }

      if (!Array.isArray(restaurants) || restaurants.length === 0) {
        if (statusDiv) statusDiv.innerText = "😔 Nessun ristorante trovato.";
        return;
      }

      if (statusDiv) statusDiv.innerText = `🍽️ Trovati ${restaurants.length} ristoranti!`;

      // Render markers and list (view handles UI bindings)
      try {
        this._placesService = new GooglePlacesService();
        this._firebase = new FirebaseService();
        this.view.renderMapRestaurants(restaurants, (payload) => this.handleMarkerClick(payload));
        this.view.renderList(restaurants.map(r => r.raw ?? r), (el) => this.onListSelect(el));
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
    }
  }

  onMarkerSelected({ data, fallbackName, el }) {
    if (this.view?.showDetails) {
      // Ensure UI bindings for the detail panel are initialized (like/keys/prev-next)
      if (typeof this.view.bindDetailPanelEventsOnce === 'function') this.view.bindDetailPanelEventsOnce();
      this.view.showDetails(data, fallbackName, el.raw ?? el);
    }
  }

  // New: centralize enrichment logic here (Firebase + Google Places) previously in markerManager
  async handleMarkerClick({ el, location, fallbackName }) {
    // el is the raw Overpass element; build docId
    const lat = location?.lat; const lon = location?.lon;
    const name = fallbackName || el?.tags?.name;
    const docId = `osm_${el.type}_${el.id}`;

    // Start with firebase if available
    try {
      const saved = await this._firebase.getById('Restaurant', docId);
      if (saved) {
        // attempt to refresh via placeId
        let dataOut = saved;
        try {
          if (saved.placeId) {
            const fresh = await this._placesService.getDetailsById(saved.placeId);
            const freshPhotos = fresh?.photos?.slice(0,5).map(p => p.getUrl({ maxWidth:800, maxHeight:600 })) || [];
            const openNowFresh = fresh?.current_opening_hours?.open_now ?? fresh?.opening_hours?.open_now;
            const weekdayTextFresh = fresh?.current_opening_hours?.weekday_text || fresh?.opening_hours?.weekday_text || saved.opening_hours_weekday_text;
            dataOut = { ...saved, photos: freshPhotos.length ? freshPhotos : saved.photos, open_now: openNowFresh !== undefined ? openNowFresh : saved.open_now, opening_hours_weekday_text: weekdayTextFresh };
          }
        } catch(e) { console.warn('Impossibile rigenerare dati da placeId', e); }
        return this.onMarkerSelected({ data: dataOut, fallbackName: name, el: { raw: el } });
      }
    } catch(e) {
      console.warn('Firebase getById failed (non blocking)', e);
    }

    // No saved doc -> try Google Places
    try {
      const place = await this._placesService.getDetailsByName(name, lat, lon);
      const openNow = place?.current_opening_hours?.open_now ?? place?.opening_hours?.open_now;
      const weekdayText = place?.current_opening_hours?.weekday_text || place?.opening_hours?.weekday_text || null;
      const toSave = {
        name: place?.name || name,
        placeId: place?.place_id || null,
        formatted_address: place?.formatted_address || null,
        international_phone_number: place?.international_phone_number || null,
        website: place?.website || null,
        cuisine: el.tags?.cuisine || null,
        opening_hours_weekday_text: weekdayText,
        open_now: openNow,
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
        wheelchair_accessible_entrance: place?.wheelchair_accessible_entrance || false,
        photos: place?.photos?.slice(0,5).map(p => p.getUrl({ maxWidth:800, maxHeight:600 })) || [],
        location: { lat, lng: lon },
        savedAt: new Date().toISOString()
      };
      try { await this._firebase.saveById('Restaurant', docId, toSave); } catch(e) { console.warn('Impossibile salvare su Firebase (non blocking)', e); }
      return this.onMarkerSelected({ data: toSave, fallbackName: name, el: { raw: el } });
    } catch(e) {
      console.warn('Google Places fallback failed (non blocking)', e);
    }

    // Fallback: show OSM-only details
    return this.onMarkerSelected({ data: null, fallbackName: name, el: { raw: el } });
  }

  onListSelect(el) {
    // Chiede alla View di attivare il marker corrispondente
    this.view.selectOnMapById(el.id);
  }

  onBack() {
    this.view.clearMapSelection();
    this.view.showList();
  }

  // Photo navigation callbacks used by the view bindings (keyboard/prev/next)
  onPrevPhoto() {
    if (this.view && typeof this.view._showPhoto === 'function') {
      const idx = (this.view._currentPhotoIndex || 0) - 1;
      this.view._showPhoto(idx);
    }
  }

  onNextPhoto() {
    if (this.view && typeof this.view._showPhoto === 'function') {
      const idx = (this.view._currentPhotoIndex || 0) + 1;
      this.view._showPhoto(idx);
    }
  }

  destroy() {
    if (this.watchId) this.geo.clearWatch(this.watchId);
  }
}
