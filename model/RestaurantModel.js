import Restaurant from "./Restaurant.js";

export default class RestaurantModel {
  constructor(overpassService) {
    this.overpass = overpassService;
    this.restaurants = [];
  }

  async loadNearby(lat, lon, radius) {
    const elements = await this.overpass.fetchRestaurants(lat, lon, radius);
    this.restaurants = elements.map(Restaurant.fromOverpass);
    for (const r of this.restaurants) {
      r.computeDistance(lat, lon);
      if (r.raw) r.raw.__distanceKm = r.distanceKm; // compat con listPanel
    }
    this.restaurants.sort((a, b) => (a.distanceKm ?? Infinity) - (b.distanceKm ?? Infinity));
    return this.restaurants;
  }
}
