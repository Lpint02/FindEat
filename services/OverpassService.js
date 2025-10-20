export default class OverpassService {
  async fetchRestaurants(lat, lon, radius = 10000) {
    const query = `
    [out:json][timeout:30];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center;`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 100000);
    try {
      const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query, signal: controller.signal });
      const data = await res.json();
      return data.elements || [];
    } finally {
      clearTimeout(timer);
      
    }
  }
}
