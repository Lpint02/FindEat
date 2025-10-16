import { initMap } from "./map/mapInit.js";
import { createRestaurantMarker, selectedIcon, defaultIcon } from "./map/markerManager.js";
import { renderRestaurantList } from "./ui/listPanel.js";
import { renderDetailPanel, showListPanel } from "./ui/detailPanel.js";
import { haversineKm } from "./map/geo.js";


const statusDiv = document.getElementById("status");

if ("geolocation" in navigator) 
{
  navigator.geolocation.getCurrentPosition(async (pos) => {
    //const lat = 42.3498;
    //const lon = 13.3995;
    
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    const radius = 10000;

    statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;
    const map = initMap("map", [lat, lon], radius);

    // Marker posizione utente: usa pin rosso standard + tooltip "Sei qui"
    const userMarkerIcon = L.icon({
      iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
      iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      iconSize: [25,41],
      iconAnchor: [12,41],
      popupAnchor: [1,-34],
      tooltipAnchor: [16,-28],
      shadowSize: [41,41]
    });
  let userMarker = L.marker([lat, lon], { icon: userMarkerIcon, interactive: false }).addTo(map);

    // Se in futuro riattivi le coordinate reali, puoi usare watchPosition per aggiornarlo
    if (navigator.geolocation.watchPosition) {
      try {
        navigator.geolocation.watchPosition(p => {
          const nLat = p.coords.latitude; const nLon = p.coords.longitude;
          userMarker.setLatLng([nLat, nLon]);
        });
      } catch(e){ /* silenzioso */ }
    }

    const query = `[out:json][timeout:25]; (node["amenity"="restaurant"](around:${radius},${lat},${lon}); way["amenity"="restaurant"](around:${radius},${lat},${lon}); relation["amenity"="restaurant"](around:${radius},${lat},${lon}); ); out center;`;
    const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
    const data = await res.json();

    if (!data.elements.length) { statusDiv.innerText = "😔 Nessun ristorante trovato."; return; }

    statusDiv.innerText = `🍽️ Trovati ${data.elements.length} ristoranti!`;

    // Stato
    const elements = data.elements.map(el => {
      const eLat = el.lat ?? el.center?.lat;
      const eLon = el.lon ?? el.center?.lon;
      if (typeof eLat === 'number' && typeof eLon === 'number') {
        el.__distanceKm = haversineKm(lat, lon, eLat, eLon);
      } else {
        el.__distanceKm = Number.POSITIVE_INFINITY;
      }
      return el;
    }).sort((a, b) => (a.__distanceKm ?? Infinity) - (b.__distanceKm ?? Infinity));
    const markers = new Map();
    let selected = null;

    const listContainer = document.getElementById('listView');
    const backBtn = document.getElementById('dpBackToList');
    if (backBtn) backBtn.addEventListener('click', () => {
      // ripristina icona del marker selezionato
      if (selected?.el?.id) {
        const prevMarker = markers.get(selected.el.id);
        if (prevMarker) prevMarker.setIcon(defaultIcon);
      }
      selected = null;
      showListPanel();
    });

    function handleSelect({ data, fallbackName, el, location }) {
      // reset icona precedente
      if (selected?.el?.id && selected.el.id !== el.id) {
        const prevMarker = markers.get(selected.el.id);
        if (prevMarker) prevMarker.setIcon(defaultIcon);
      }
      selected = { data, el, location };
      // colora di rosso il marker selezionato
      const selMarker = markers.get(el.id);
      if (selMarker) selMarker.setIcon(selectedIcon);
      renderDetailPanel(data, fallbackName, el);
      if (location?.lat && location?.lon) {
        map.setView([location.lat, location.lon], Math.max(map.getZoom(), 16));
      }
    }

    // Crea marker con callback
    elements.forEach(el => {
      const marker = createRestaurantMarker(map, el, handleSelect);
      if (marker) markers.set(el.id, marker);
    });

    // Lista iniziale
    renderRestaurantList(listContainer, elements, (el) => {
      const marker = markers.get(el.id);
      if (marker) marker.fire('click');
    });
  }, err => { statusDiv.innerText = "⚠️ Permesso posizione negato o errore GPS."; alert("Consenti accesso alla posizione."); });
} 

