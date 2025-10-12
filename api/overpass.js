import { CONFIG } from "../config.js";

export async function fetchRestaurants(lat, lon, radius = 10000) {
  const query = `
    [out:json][timeout:30];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center;
  `;
  const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query, timeout: 40000 });
  const data = await res.json();
  return data.elements || [];
}
