// Controller principale della Home:
// - orchestra geolocalizzazione, mappa, lista ristoranti, pannello dettagli
// - coordina i servizi (Overpass per OSM, Google Places, Firestore)
// - applica i filtri UI (liked, reviewed, distanza)
// - gestisce azioni dell'utente (like, apertura dettagli, aggiunta/modifica recensione)
import GeolocationService from "../services/GeolocationService.js";
import OverpassService from "../services/OverpassService.js";
import Restaurant from "../model/Restaurant.js";
import Review from "../model/Review.js";
import GooglePlacesService from "../services/GooglePlacesService.js";
import FirestoreService from "../services/FirestoreService.js";
import AuthService from "../services/AuthService.js";
import { auth } from "../services/firebase-config.js";

export default class HomeController {
  constructor(view) {
    // Istanza della View (HomeView) con cui comunichiamo per aggiornare l'interfaccia
    this.view = view;
    // Servizi applicativi
    this.geo = new GeolocationService();
    this.overpass = new OverpassService();
    this.watchId = null;
    this._placesService = null;
    this._firebase = null;
    // Stato dei filtri applicati dalla UI
    this._filters = { liked: false, reviewed: false, distanceKm: 5 };
    // Ultima posizione nota dell'utente (usata per ricaricare risultati/aggiornare raggio)
    this._lastUserPos = null;
    // Ultimo elenco di ristoranti caricato (caching in memoria per ri-render senza rete)
    this._restaurants = [];
    // Insiemi di ID per sapere rapidamente cosa è liked/recensito dall'utente corrente
    this._likedRestaurantIds = new Set();
    this._reviewedRestaurantIds = new Set();
    // AbortController per cancellare richieste Overpass in corso quando cambiano i filtri
    this._abortController = null;
  }

  async init(filters) {
    // Punto di ingresso della schermata Home: inizializza mappa, posizione, carica ristoranti e aggancia eventi.
    if (filters) this._filters = { ...this._filters, ...filters }; //se init viene chiamata con nuovi filtri, li fonde a quelli esistenti (this._filters)
    const statusDiv = document.getElementById("status");
    const mapSpinner = document.getElementById('mapSpinner');
    const leftSpinner = document.getElementById('leftSpinner');
    try {
      if (statusDiv) statusDiv.innerText = "📍 Recupero la tua posizione...";
      if (mapSpinner) mapSpinner.classList.remove('hidden');
      if (leftSpinner) leftSpinner.classList.remove('hidden');

      // Ottieni la posizione corrente con gestione errori granulare:
      // - se la geolocalizzazione non è disponibile usiamo un fallback (L'Aquila) e lo comunichiamo in UI
      // - se è una posizione cache recente, indichiamo all'utente che stiamo migliorando la precisione
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
        return;
      }

      const lat = pos.coords.latitude;
      const lon = pos.coords.longitude;
      this._lastUserPos = { lat, lon };
      // Normalizziamo il raggio (1-10 km) partendo dal valore del filtro distanza
      const kmInit = Math.max(1, Math.min(10, this._filters.distanceKm || 5));
      const radius = kmInit * 1000;
      if (statusDiv) statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;

      // Inizializza la mappa centrata sulla posizione utente
      try {
        if (!this.view) throw new Error('View non inizializzata');
        this.view.initMap([lat, lon], radius);
        this.view.setUserMarker(lat, lon);
      } catch (viewErr) {
        console.error('HomeController: errore inizializzando la mappa o il view', viewErr);
        if (statusDiv) statusDiv.innerText = '⚠️ Errore inizializzando la mappa.';
        return;
      }

      // Ascolta aggiornamenti di posizione (non bloccante) per muovere il marker utente sulla mappa (lo disattivo per ora)
      // try {
      //   this.watchId = this.geo.watchPosition(p => {
      //     try { this.view.updateUserPosition(p.coords.latitude, p.coords.longitude); } catch(e) { console.warn('updateUserPosition failed', e); }
      //   });
      // } catch (watchErr) {
      //   console.warn('HomeController: watchPosition failed', watchErr);
      // }

      // Inizializza il servizio Firestore e pre-carica gli insiemi liked/recensiti dell'utente (non bloccante)
      try {
        this._firebase = new FirestoreService();
        // tentativo di aggiornare gli insiemi liked/reviewed, ignora errori
        try { await this._refreshLikedSet(); } catch(e) { console.warn('refreshLikedSet failed', e); }
        try { await this._refreshReviewedSet(); } catch(e) { console.warn('refreshReviewedSet failed', e); }
      } catch(e) { console.warn('Unable to init Firestore service early', e); }

      //Carica i ristoranti (chiamata di rete) e renderizza l'UI
      const restaurants = await this._loadRestaurants(lat, lon, radius, statusDiv);
      // Annotiamo ogni ristorante con:
      // - docId (chiave nel DB)
      // - isLiked / isReviewed (per icone in lista e per filtri)
      for (const r of restaurants) {
        try {
          const docId = this._computeDocIdFromRestaurant(r);
          r.docId = docId;
          r.isLiked = this._likedRestaurantIds.has(docId);
          r.isReviewed = this._reviewedRestaurantIds.has(docId);
        } catch(e) { r.isLiked = false; r.isReviewed = false; }
      }
      if (!Array.isArray(restaurants) || restaurants.length === 0) {
        if (statusDiv) statusDiv.innerText = "😔 Nessun ristorante trovato.";
        return;
      }

      if (statusDiv) statusDiv.innerText = `🍽️ Trovati ${restaurants.length} ristoranti!`;

      // Render mappa e lista (la View gestisce binding/eventi); applichiamo i filtri liked/reviewed se richiesti
      try {
        this._placesService = new GooglePlacesService();
        // Apply liked/reviewed filters if active
        let renderList = restaurants;
        if (this._filters.liked) renderList = renderList.filter(r => r.isLiked);
          if (this._filters.reviewed) renderList = renderList.filter(r => r.isReviewed);
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
   * Attiva/disattiva il "mi piace" per un ristorante dato il suo docId. Questo:
   * - assicura che il documento Restaurant esista (salvataggio in merge se necessario)
   * - aggiunge/rimuove in modo atomico l'uid dell'utente corrente in Restaurant.liked
   * - aggiunge/rimuove in modo atomico l'id del ristorante in User.likedRestaurants
   * Restituisce { ok: true, liked: boolean } in caso di successo, oppure { ok: false, error }
   */
  async toggleLike(docId, restaurantPayload) {
    // Gestisce il click sul cuore:
    // - se è il primo like, salviamo/mergiamo un payload minimo del ristorante in Restaurant/{docId}
    // - aggiorniamo sia Restaurant.liked che User.likedRestaurants in modo atomico (arrayUnion/arrayRemove)
    try {
      // Controlla autorizzazione utente
      const user = auth.currentUser;
      if (!user) return { ok: false, error: 'not-authenticated' };
      const uid = user.uid;

      // Assicura disponibilità servizio firebase
      if (!this._firebase) this._firebase = new FirestoreService();

      // Assicura che il documento ristorante esista (solo al primo like)
      if (restaurantPayload) {
        // Salva/fondi il payload di base (questo non rimuoverà campi esistenti)
        await this._firebase.saveById('Restaurant', docId, restaurantPayload);
      }

      // Leggi lo stato corrente dei like per decidere se quel click aggiunge o rimuove
      const saved = await this._firebase.getById('Restaurant', docId);
      const likedArray = Array.isArray(saved?.liked) ? saved.liked : [];
      const alreadyLiked = likedArray.includes(uid);

      if (!alreadyLiked) {
        // Aggiungi userId a Restaurant.liked e restaurant id a User.likedRestaurants
        const p1 = this._firebase.arrayUnionField('Restaurant', docId, 'liked', uid);
        const p2 = this._firebase.arrayUnionField('User', uid, 'likedRestaurants', docId);
        await Promise.all([p1, p2]);
        // aggiorna local set
        this._likedRestaurantIds.add(docId);
        return { ok: true, liked: true };
      } else {
        // Rimuovi userId da Restaurant.liked e restaurant id da User.likedRestaurants
        const p1 = this._firebase.arrayRemoveField('Restaurant', docId, 'liked', uid);
        const p2 = this._firebase.arrayRemoveField('User', uid, 'likedRestaurants', docId);
        await Promise.all([p1, p2]);
        // aggiorna local set
        this._likedRestaurantIds.delete(docId);
        return { ok: true, liked: false };
      }
    } catch (e) {
      console.error('toggleLike error', e);
      return { ok: false, error: e };
    }
  }

  async getSavedRestaurant(docId) {
    // Ritorna il documento Restaurant/{docId} se esiste, altrimenti null
    try {
      if (!this._firebase) this._firebase = new FirestoreService();
      return await this._firebase.getById('Restaurant', docId);
    } catch (e) {
      console.warn('getSavedRestaurant failed', e);
      return null;
    }
  }

  _computeDocIdFromRestaurant(r) {
    // Calcola il docId a partire dal nodo OSM (tipo+id). Se già presente, lo riusa.
    // Esempio: osm_way_123456789
    const raw = r.raw ?? r;
    if (raw && raw.type && raw.id) return `osm_${raw.type}_${raw.id}`;
    return r.docId || null;
  }

  async _refreshLikedSet() {
    // Popola l'insieme di ristoranti liked leggendo User/{uid}.likedRestaurants
    try {
      const user = auth.currentUser;
      this._likedRestaurantIds = new Set();
      if (!user) return;
      // Leggi User/{uid} doc to get likedRestaurants array
      if (!this._firebase) this._firebase = new FirestoreService();
      const udoc = await this._firebase.getById('User', user.uid);
      const arr = Array.isArray(udoc?.likedRestaurants) ? udoc.likedRestaurants : [];
      for (const id of arr) this._likedRestaurantIds.add(id);
    } catch (e) {
      console.warn('Failed to refresh liked set', e);
    }
  }

  async _refreshReviewedSet() {
    // Popola l'insieme di ristoranti recensiti dall'utente corrente interrogando Reviews
    try {
      const user = auth.currentUser;
      this._reviewedRestaurantIds = new Set();
      if (!user) return;
      if (!this._firebase) this._firebase = new FirestoreService();
      const reviews = await this._firebase.getUserReviews(user.uid);
      for (const rv of (reviews || [])) {
        const rid = rv.RestaurantID || rv.restaurantId;
        if (rid) this._reviewedRestaurantIds.add(rid);
      }
    } catch (e) {
      console.warn('Failed to refresh reviewed set', e);
    }
  }

  // Restituisce true se l'utente corrente ha messo like al ristorante indicato
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
    // Applica i filtri scelti e ricarica i ristoranti in base al nuovo raggio
    this._filters = { ...this._filters, ...filters };
    const statusDiv = document.getElementById('status');
    const mapSpinner = document.getElementById('mapSpinner');
    const leftSpinner = document.getElementById('leftSpinner');
    if (!this._lastUserPos) return; 
    const { lat, lon } = this._lastUserPos;
    const kmApply = Math.max(1, Math.min(10, this._filters.distanceKm || 5));
    const radius = kmApply * 1000;
    if (statusDiv) statusDiv.innerText = `🔄 Aggiorno risultati entro ${radius} m...`;
    if (mapSpinner) mapSpinner.classList.remove('hidden');
    if (leftSpinner) leftSpinner.classList.remove('hidden');
      // Aggiorna il raggio della mappa
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
      // Annotiamo e filtriamo la lista in memoria in base a liked/reviewed attivi
      for (const r of restaurants) {
        try {
          const docId = this._computeDocIdFromRestaurant(r);
          r.docId = docId;
          r.isLiked = this._likedRestaurantIds.has(docId);
          r.isReviewed = this._reviewedRestaurantIds.has(docId);
        } catch(e) { r.isLiked = false; r.isReviewed = false; }
      }
      let renderList = restaurants;
      if (this._filters.liked) renderList = renderList.filter(r => r.isLiked);
      if (this._filters.reviewed) renderList = renderList.filter(r => r.isReviewed);
      this.view.renderMapRestaurants(renderList, (payload) => this.handleMarkerClick(payload));
      this.view.renderList(renderList, (el) => this.onListSelect(el));
      if (mapSpinner) mapSpinner.classList.add('hidden');
      if (leftSpinner) leftSpinner.classList.add('hidden');
  }

  async _loadRestaurants(lat, lon, radius, statusDiv) {
    // Richiama Overpass per ottenere i POI ristorante, calcola distanza e ordina per prossimità.
    // Usa AbortController per evitare race condition se l'utente cambia rapidamente i filtri/raggio.
    try {
      // Cancella eventuali richieste precedenti in corso
      if (this._abortController) {
        try { this._abortController.abort(); } catch {}
      }
      this._abortController = new AbortController();
      const elements = await this.overpass.fetchRestaurants(lat, lon, radius, { signal: this._abortController.signal });
      const list = elements.map(Restaurant.fromOverpass);
      for (const r of list) r.computeDistance(lat, lon);
      list.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
      this._restaurants = list;
      return list;
    } catch (loadErr) {
      console.error('HomeController: errore caricando i ristoranti', loadErr);
      if (statusDiv) statusDiv.innerText = '⚠️ Errore caricando i dati dei ristoranti.';
      return [];
    }
  }

  onMarkerSelected({ data, fallbackName, el }) {
    // Entrata unica per mostrare il pannello dettagli con i dati disponibili (Google/DB/solo OSM)
    if (this.view?.showDetails) {
      // Assicuriamoci che gli eventi del pannello dettagli siano bindati una sola volta
      if (typeof this.view.bindDetailPanelEventsOnce === 'function') this.view.bindDetailPanelEventsOnce();
      // el è Restaurant
      this.view.showDetails(data, fallbackName, el);
    }
  }

  async handleMarkerClick({ el, location, fallbackName }) {
    // Click su marker/lista:
    // 1) proviamo a leggere Restaurant/{docId} da Firestore (cache locale del ristorante)
    // 2) se presente, valutiamo se le foto sono "stale" (>2 giorni) e tentiamo un refresh da Google Places
    // 3) se non presente, usiamo Google Places per arricchire i dati e salviamo in Restaurant/{docId}
    // 4) se anche Places fallisce, mostriamo dettagli minimi basati su OSM
    // Nota: le foto sono URL pre-generati e salvati nel DB per evitare 403 al ri-rendering
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

    // Nessun documento salvato -> provalo con Google Places e persisti (merge) il risultato
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
    // Dalla lista, selezione di un ristorante: chiediamo alla View di selezionare il marker corrispondente sulla mappa
    this.view.selectOnMapById(el.id);
  }

  onBack() {
    // Torna dalla vista dettagli alla lista e ri-applica i filtri correnti
    this.view.clearMapSelection();
    this.view.showList();
    // Re-render the list applying current filters so unliked items disappear when 'Solo liked' is active
    try { this._reRenderListForCurrentFilters(); } catch (e) { console.warn('re-render after back failed', e); }
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

  _reRenderListForCurrentFilters() {
    // Ri-renderizza la lista a sinistra senza toccare la mappa, usando i ristoranti già caricati e gli insiemi liked/reviewed
    try {
      const restaurants = Array.isArray(this._restaurants) ? this._restaurants : [];
      // annotate
      for (const r of restaurants) {
        try {
          const docId = this._computeDocIdFromRestaurant(r);
          r.docId = docId;
          r.isLiked = this._likedRestaurantIds.has(docId);
          r.isReviewed = this._reviewedRestaurantIds && this._reviewedRestaurantIds.has ? this._reviewedRestaurantIds.has(docId) : false;
        } catch(e) { r.isLiked = false; r.isReviewed = false; }
      }
      // filter
      let renderList = restaurants;
      if (this._filters?.liked) renderList = renderList.filter(r => r.isLiked);
      if (this._filters?.reviewed) renderList = renderList.filter(r => r.isReviewed);
      // render only the list (keep map as-is)
      this.view.renderList(renderList, (el) => this.onListSelect(el));
    } catch(e) {
      console.warn('Failed to re-render list with current filters', e);
    }
  }

  destroy() {
    if (this.watchId) this.geo.clearWatch(this.watchId);
  }

  async logout() {
    // Effettua logout dall'app: chiama AuthService, pulisce lo storage e torna alla pagina iniziale
    let result = await AuthService.logout();
    if (result) {
      console.log("Logout avvenuto con successo");
      localStorage.clear();
      this.router.navigate("/");
    } else {
      console.log("Logout fallito");
    }
  }

  // Ritorna true se esiste un utente loggato (usato dalla View per abilitare/disabilitare UI)
  isLoggedIn() {
    return !!auth.currentUser;
  }
  getCurrentUserId() {
    return auth.currentUser ? auth.currentUser.uid : null;
  }

  /**
   * Aggiunge o aggiorna (upsert) la recensione dell'utente corrente per un dato ristorante.
   * - Usa il model Review per normalizzare i dati
   * - Scrive su Firestore duplicando i campi ID (AuthorID/authorId, RestaurantID/restaurantId) per compatibilità
   * - Se esiste già una recensione dell'utente per quel ristorante, fa un update; altrimenti crea un nuovo documento
   */
  async addUserReview({ restaurantId, restaurantName, author_name, rating, text }) {
      try {
        const user = auth.currentUser;
        if (!user) return { ok: false, error: 'not-authenticated' };
        if (!(rating >= 1 && rating <= 5)) return { ok: false, error: 'invalid-rating' };
        if (!this._firebase) this._firebase = new FirestoreService();
        // Costruisci un Review model per normalizzare i campi
        const reviewModel = new Review({
          authorID: user.uid,
          restaurantID: restaurantId,
          restaurantName: restaurantName || '',
          author_name: author_name || '',
          language: 'it',
          original_language: 'it',
          rating: Number(rating),
          text: text || '',
          time: new Date().toISOString(),
          translated: false
        });

        // Upsert: if user already reviewed this restaurant, update that review; else create a new one
        const myReviews = await this._firebase.getUserReviews(user.uid);
        const existing = (myReviews || []).find(rv => (rv.RestaurantID || rv.restaurantId) === restaurantId);
        // Converte dal model a payload compatibile con Firestore (duplicando i campi ID)
        const payload = {
          AuthorID: reviewModel.authorID,
          authorId: reviewModel.authorID,
          RestaurantID: reviewModel.restaurantID,
          restaurantId: reviewModel.restaurantID,
          RestaurantName: reviewModel.restaurantName,
          author_name: reviewModel.author_name,
          language: reviewModel.language,
          original_language: reviewModel.original_language,
          rating: reviewModel.rating,
          text: reviewModel.text,
          time: reviewModel.time,
          translated: reviewModel.translated
        };
        if (existing && existing.firestoreId) {
          await this._firebase.saveById('Reviews', existing.firestoreId, payload);
          try { await this._firebase.saveById('reviews', existing.firestoreId, payload); } catch {}
          this._reviewedRestaurantIds.add(restaurantId);
          return { ok: true, id: existing.firestoreId, data: { ...existing, ...payload } };
        } else {
          const res = await this._firebase.addReview(payload);
          if (res?.ok) this._reviewedRestaurantIds.add(restaurantId);
          return res;
        }
      } catch (e) {
        console.error('addUserReview failed', e);
        return { ok: false, error: e };
      }
    }

  /**
   * Recupera le recensioni utente per un ristorante e le mappa in istanze Review per la View.
   * Mantiene firestoreId come proprietà addizionale per eventuali update/eliminazioni future.
   */
    async fetchUserReviews(restaurantId) {
      try {
        if (!this._firebase) this._firebase = new FirestoreService();
        const rows = await this._firebase.getReviewsByRestaurant(restaurantId);
        // Mappa a Review model per la View (mantiene anche firestoreId come proprietà addizionale)
        return (rows || []).map(r => {
          const model = new Review({
            authorID: r.AuthorID || r.authorId || '',
            restaurantID: r.RestaurantID || r.restaurantId || restaurantId,
            restaurantName: r.RestaurantName || r.restaurantName || '',
            author_name: r.author_name || '',
            language: r.language || 'it',
            original_language: r.original_language || 'it',
            rating: typeof r.rating === 'number' ? r.rating : 0,
            text: r.text || '',
            time: r.time || new Date().toISOString(),
            translated: !!r.translated
          });
          if (r.firestoreId) model.firestoreId = r.firestoreId;
          return model;
        });
      } catch (e) {
        console.error('fetchUserReviews failed', e);
        return [];
      }
    }
}