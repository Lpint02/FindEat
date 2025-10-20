export default class GeolocationService {
  /**
   * Ottiene la posizione in modo rapido e stabile senza tentativi successivi ad alta precisione.
   * Strategia:
   * - Se disponibile una posizione recente in cache (<= 2 min), restituisce quella subito
   * - Altrimenti, fa UNA sola richiesta a bassa precisione (timeout breve)
   * - Se fallisce/negata, ritorna un fallback su L'Aquila
   * La risposta rispetta la shape di Position; `isFallback: true` quando in fallback,
   * `isCached: true` quando usa la cache.
   */
  async getCurrentPosition(options = { enableHighAccuracy: false, timeout: 8000, maximumAge: 120000 }) {
    // Default coordinates: L'Aquila (lat, lon)
    const FALLBACK_LAT = 42.3499;
    const FALLBACK_LON = 13.3995;

    // Helper to produce a Position-like object
    const makeFallback = () => ({
      coords: {
        latitude: FALLBACK_LAT,
        longitude: FALLBACK_LON,
        accuracy: 10000,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null
      },
      timestamp: Date.now(),
      // Inform callers this is a synthetic fallback
      isFallback: true
    });

    if (!('geolocation' in navigator)) {
      console.warn('Geolocalizzazione non supportata: usando coordinate di default (L\'Aquila)');
      return makeFallback();
    }

    // Se i permessi sono negati, evita attese
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const p = await navigator.permissions.query({ name: 'geolocation' });
        if (p.state === 'denied') {
          console.warn('Permission geolocation denied: fallback immediate');
          return makeFallback();
        }
      }
    } catch { /* ignore */ }

    // Se abbiamo una posizione recente in cache (<=2 minuti), usala subito
    try {
      const cached = JSON.parse(localStorage.getItem('geo:lastPosition') || 'null');
      if (cached && (Date.now() - cached.ts) <= 120000) {
        return {
          coords: {
            latitude: cached.lat,
            longitude: cached.lon,
            accuracy: cached.acc ?? 5000,
            altitude: null,
            altitudeAccuracy: null,
            heading: null,
            speed: null
          },
          timestamp: cached.ts,
          isCached: true
        };
      }
    } catch { /* ignore */ }

    // Unica richiesta a bassa precisione
    const lowAccOpts = {
      enableHighAccuracy: false,
      timeout: options?.timeout ?? 8000,
      maximumAge: options?.maximumAge ?? 120000
    };
    return await new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          try { localStorage.setItem('geo:lastPosition', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, ts: Date.now(), acc: pos.coords.accuracy ?? null })); } catch {}
          resolve(pos);
        },
        (err) => {
          console.warn('Geolocalizzazione fallita, uso fallback (L\'Aquila):', err);
          resolve(makeFallback());
        },
        lowAccOpts
      );
    });
  }

  watchPosition(onSuccess, onError = () => {}, options = { enableHighAccuracy: false, timeout: 15000, maximumAge: 15000 }) {
    if (!('geolocation' in navigator) || !navigator.geolocation.watchPosition) return null;
    try {
      const id = navigator.geolocation.watchPosition(onSuccess, onError, options);
      return id;
    } catch (e) {
      onError(e);
      return null;
    }
  }

  clearWatch(id) {
    if (id != null && navigator.geolocation?.clearWatch) navigator.geolocation.clearWatch(id);
  }

  // Expose haversine as a static method on the class so callers can use
  // GeolocationService.haversineKm(...) without instantiating the service.
  static haversineKm(lat1, lon1, lat2, lon2) {
    const toRad = (v) => v * Math.PI / 180;
    const R = 6371; // Earth radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }
}


