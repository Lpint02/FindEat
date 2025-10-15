export function initMap(mapId = "map", userCoords = [0,0], radius = 10000) {
  const map = L.map(mapId).setView(userCoords, 15);
  // Sposta i controlli di zoom in basso a sinistra per non sovrapporsi all'header
  if (map.zoomControl && map.zoomControl.setPosition) {
    map.zoomControl.setPosition('topright');
  }

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);

  // Rimosso marker/popup legacy "Sei qui" (gestito ora in main.js)
  L.circle(userCoords, { radius, color: "#1976d2", fillColor: "#64b5f6", fillOpacity: 0.12, weight:1 }).addTo(map);

  return map;
}
