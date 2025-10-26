import { GOOGLE_MAPS_API_KEY } from "../config.js";

export default class GooglePlacesService {
  static _loadingPromise = null;
  static _loaded = false;

  static ensureLoaded() {
    if (GooglePlacesService._loaded || (window.google && window.google.maps && window.google.maps.places)) {
      GooglePlacesService._loaded = true;
      return Promise.resolve();
    }
    if (GooglePlacesService._loadingPromise) return GooglePlacesService._loadingPromise;

    GooglePlacesService._loadingPromise = new Promise((resolve, reject) => {
      const resolveWhenReady = async () => {
        if (window.google && window.google.maps && window.google.maps.places) { GooglePlacesService._loaded = true; resolve(); return; }
        try {
          if (window.google && window.google.maps && typeof window.google.maps.importLibrary === 'function') {
            await window.google.maps.importLibrary('places');
            if (window.google.maps.places) { GooglePlacesService._loaded = true; resolve(); return; }
          }
        } catch (_) {}
        let tries = 0; const max = 100;
        const tick = () => {
          if (window.google && window.google.maps && window.google.maps.places) { GooglePlacesService._loaded = true; resolve(); return; }
          if (++tries >= max) { reject(new Error('Google Maps Places non disponibile')); return; }
          setTimeout(tick, 50);
        };
        tick();
      };
      const existing = document.querySelector('script[data-google-maps-loaded="true"]');
      if (existing) { existing.addEventListener('load', resolveWhenReady); existing.addEventListener('error', () => reject(new Error('Impossibile caricare Google Maps JS'))); resolveWhenReady(); return; }
      const s = document.createElement('script');
      s.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(GOOGLE_MAPS_API_KEY)}&libraries=places&v=weekly&loading=async`;
      s.async = true; s.defer = true; s.setAttribute('data-google-maps-loaded','true');
      s.onload = resolveWhenReady; s.onerror = () => reject(new Error('Impossibile caricare Google Maps JS'));
      document.head.appendChild(s);
    });
    return GooglePlacesService._loadingPromise;
  }

  async getDetailsByName(name, lat, lng) {
    await GooglePlacesService.ensureLoaded();
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) { reject(new Error("Google Maps Places API non è caricata")); return; }
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      const location = new google.maps.LatLng(lat, lng);
      service.findPlaceFromQuery({ query: name, fields: ["place_id"], locationBias: location }, (results, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results[0]) { reject(new Error(`Google Places findPlaceFromQuery fallita: ${status}`)); return; }
        const placeId = results[0].place_id;
        this.getDetailsById(placeId).then(resolve).catch(reject);
      });
    });
  }

  async getDetailsById(placeId) {
    await GooglePlacesService.ensureLoaded();
    return new Promise((resolve, reject) => {
      if (!window.google || !window.google.maps || !window.google.maps.places) { reject(new Error("Google Maps Places API non è caricata")); return; }
      const service = new google.maps.places.PlacesService(document.createElement('div'));
      service.getDetails({
        placeId,
        fields: [
          "name","photos","formatted_address","international_phone_number","website","types","geometry","place_id","reviews","rating","user_ratings_total","opening_hours","current_opening_hours","business_status","utc_offset_minutes","price_level","editorial_summary","serves_breakfast","serves_lunch","serves_dinner","serves_vegetarian_food","reservable","delivery","dine_in","takeout","wheelchair_accessible_entrance"
        ]
      }, (place, status) => {
        if (status !== google.maps.places.PlacesServiceStatus.OK) { reject(new Error(`Google Places getDetails fallita: ${status}`)); return; }
        resolve(place);
      });
    });
  }
}
