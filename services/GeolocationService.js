export default class GeolocationService {
  /**
   * Attempts to obtain the real geolocation quickly and reliably using a multi-strategy approach.
   * - Races a fast, low-accuracy request (usually very quick) with a high-accuracy one
   * - Applies an overall short fallback timeout
   * - Caches the last successful position in localStorage to speed up subsequent loads
   * If everything fails (denied, unavailable, timeout), returns a Position-like fallback
   * centered su L'Aquila. The result mirrors the browser Position shape and includes
   * `isFallback: true` when using the default coordinates.
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

    // If permission is explicitly denied, avoid waiting long
    try {
      if (navigator.permissions && navigator.permissions.query) {
        const p = await navigator.permissions.query({ name: 'geolocation' });
        if (p.state === 'denied') {
          console.warn('Permission geolocation denied: fallback immediate');
          return makeFallback();
        }
      }
    } catch { /* ignore */ }

    // Helper to request a position with given options
    const requestPosition = (opts) => new Promise((resolve, reject) => {
      try {
        navigator.geolocation.getCurrentPosition(resolve, reject, opts);
      } catch (e) { reject(e); }
    });

    // Build two competing requests: fast low-accuracy and precise high-accuracy
    const lowAccOpts = { enableHighAccuracy: false, timeout: 6000, maximumAge: 120000 };
    const highAccOpts = { enableHighAccuracy: true, timeout: Math.max(8000, options.timeout || 20000), maximumAge: options.maximumAge ?? 10000 };

    // Overall safety timeout (to avoid waiting too long before fallback)
    const overallTimeoutMs = 8000;

    return await new Promise((resolve) => {
      let settled = false;
      const settleOnce = (value) => { if (!settled) { settled = true; resolve(value); } };

      // Quick overall fallback (log only if we really use it)
      const overallTimer = setTimeout(() => {
        if (!settled) {
          console.warn('Geolocalizzazione lenta: uso fallback temporaneo (L\'Aquila)');
          settleOnce(makeFallback());
        }
      }, overallTimeoutMs);

      // Race low-accuracy and high-accuracy
      requestPosition(lowAccOpts)
        .then((pos) => {
          try { localStorage.setItem('geo:lastPosition', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, ts: Date.now(), acc: pos.coords.accuracy ?? null })); } catch {}
          settleOnce(pos);
        })
        .catch((err) => {
          console.warn('Low-accuracy geolocation failed', err);
        });

      requestPosition(highAccOpts)
        .then((pos) => {
          try { localStorage.setItem('geo:lastPosition', JSON.stringify({ lat: pos.coords.latitude, lon: pos.coords.longitude, ts: Date.now(), acc: pos.coords.accuracy ?? null })); } catch {}
          settleOnce(pos);
        })
        .catch((err) => {
          console.warn('High-accuracy geolocation failed', err);
        });

      // As an additional speed-up, if we have a very recent cached value, prefer it immediately
      try {
        const cached = JSON.parse(localStorage.getItem('geo:lastPosition') || 'null');
        if (cached && (Date.now() - cached.ts) <= 120000) {
          // fabricate a Position-like result
          const cachedPos = {
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
          // Return immediately if nothing has settled yet; underlying requests continue but will be ignored
          settleOnce(cachedPos);
        }
      } catch { /* ignore */ }

      // Cleanup when settled
      const stopWhenSettled = setInterval(() => { if (settled) clearInterval(stopWhenSettled); }, 100);
      // Also clear overall timer when settled
      const clearAll = () => { try { clearTimeout(overallTimer); } catch {} };
      const origResolve = resolve;
      resolve = (v) => { clearAll(); origResolve(v); };
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


