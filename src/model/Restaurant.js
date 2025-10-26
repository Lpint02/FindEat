import GeolocationService from "../services/GeolocationService.js";

export default class Restaurant {
  constructor({ id, name, lat, lon, tags, raw }) {
    this.id = id;
    this.name = name || tags?.name || "Ristorante senza nome";
    this.lat = lat;
    this.lon = lon;
    this.tags = tags || {};
    this.raw = raw; // conserva elemento Overpass grezzo
    this.distanceKm = null; // calcolata rispetto alla posizione utente
  }

  computeDistance(fromLat, fromLon) {
    if (typeof this.lat === 'number' && typeof this.lon === 'number') {
      this.distanceKm = GeolocationService.haversineKm(fromLat, fromLon, this.lat, this.lon);
    } else {
      this.distanceKm = Number.POSITIVE_INFINITY;
    }
    return this.distanceKm;
  }
//ciao a tutti
  static fromOverpass(el) {
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    return new Restaurant({ id: el.id, name: el.tags?.name, lat, lon, tags: el.tags, raw: el });
  }
}
