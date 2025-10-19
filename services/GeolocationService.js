export default class GeolocationService {
  async getCurrentPosition(options = { enableHighAccuracy: true, timeout: 20000, maximumAge: 10000 }) {
    if (!('geolocation' in navigator)) throw new Error('Geolocalizzazione non supportata');
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, options);
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


