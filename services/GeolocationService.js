export default class GeolocationService {
  /**
   * Attempts to obtain the real geolocation. If not available or the call
   * fails (for example permission denied), returns a Position-like object
   * centered on L'Aquila so the app can still function.
   * The returned object mirrors the browser Position shape and includes
   * an `isFallback` boolean set to true when using the default coordinates.
   */
  async getCurrentPosition(options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }) {
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

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve(pos),
        (err) => {
          // Log and return fallback so application can continue
          console.warn('Geolocalizzazione fallita, usando coordinate di default (L\'Aquila):', err);
          resolve(makeFallback());
        },
        options
      );
    });
  }

  watchPosition(onSuccess, onError = () => {}, options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }) {
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


