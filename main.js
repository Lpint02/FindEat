import { initMap } from "./map/mapInit.js";
import { createRestaurantMarker } from "./map/markerManager.js";
import { showModalWithData } from "./ui/modal.js";
import { getDocumentById, saveDocumentWithId } from "./api/firebaseDB.js";

const statusDiv = document.getElementById("status");

if ("geolocation" in navigator) {
  navigator.geolocation.getCurrentPosition(async pos => {
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const radius = 10000;

    statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;
    const map = initMap("map", [lat, lon], radius);

    const query = `[out:json][timeout:25]; (node["amenity"="restaurant"](around:${radius},${lat},${lon}); way["amenity"="restaurant"](around:${radius},${lat},${lon}); relation["amenity"="restaurant"](around:${radius},${lat},${lon}); ); out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
    const data = await res.json();

    if (!data.elements.length) { statusDiv.innerText = "😔 Nessun ristorante trovato."; return; }

    statusDiv.innerText = `🍽️ Trovati ${data.elements.length} ristoranti!`;

    data.elements.forEach(el => createRestaurantMarker(map, el));
  }, err => { statusDiv.innerText = "⚠️ Permesso posizione negato o errore GPS."; alert("Consenti accesso alla posizione."); });
} else {
  statusDiv.innerText = "❌ Geolocalizzazione non supportata dal browser.";
}
