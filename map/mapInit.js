export function initMap(mapId = "map", userCoords = [0,0], radius = 10000) {
  const map = L.map(mapId).setView(userCoords, 15);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  L.circle(userCoords, { radius, color: "blue", fillColor: "#3a86ff", fillOpacity: 0.2 }).addTo(map);
  L.marker(userCoords).addTo(map).bindPopup("🧍‍♂️ Sei qui!").openPopup();

  return map;
}
