import { initMap } from "./map/mapInit.js";
import { createRestaurantMarker, selectedIcon, defaultIcon } from "./map/markerManager.js";
import { renderRestaurantList } from "./ui/listPanel.js";
import { renderDetailPanel, showListPanel } from "./ui/detailPanel.js";
import { haversineKm } from "./map/geo.js";

export default class HomeView 
{
  //costruttore
  constructor() {
    this.presenter = null; // sarà assegnato da main.js
    this.router = null;    // sarà assegnato da main.js
  }

  /**
   * Metodo chiamato dal Router dopo che l'HTML è stato caricato
   */
  init() {
    const statusDiv = document.getElementById("status");
    if( "geolocation" in navigator) // navigation è un oggetto del browser, geolocation una sua proprietà
    {
      navigator.geolocation.getCurrentPosition(this.#showMap.bind(this), this.#showError.bind(this));
    }
    else
    {
      statusDiv.innerText = "❌ Geolocalizzazione non supportata dal browser.";
    }
  }

  async #showMap(pos) 
  {
    //const lat = 42.3498;
    //const lon = 13.3995;   
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    // raggio d'azione in metri
    const radius = 10000;
    
    statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;

    // inizializzazione mappa
    const map = this.#initMap("map", [lat, lon], radius);
    
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
  }

  #showError(err) {
    statusDiv.innerText = "⚠️ Permesso posizione negato o errore GPS.";
    alert("Consenti accesso alla posizione.");
  }

  // metodo privato per creare la mappa Leaflet
  #initMap(mapId = "map", userCoords = [0,0], radius = 10000) 
  {
    const map = L.map(mapId).setView(userCoords, 15);
    // Sposta i controlli di zoom in basso a sinistra per non sovrapporsi all'header
    if (map.zoomControl && map.zoomControl.setPosition) 
    {
      map.zoomControl.setPosition('topright');
    }  
    
    //Aggiunta tile layer OpenStreetMap e lo aggiungo alla mappa
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', 
    {
      maxZoom: 19,
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);

    /* Aggiungo sulla mappa l'area di ricerca con centro userCoords e raggio radius, 
    *  più impostazione opacità e colore
    */
    L.circle(userCoords, { radius, color: "#1976d2", fillColor: "#64b5f6", fillOpacity: 0.12, weight:1 }).addTo(map);
    
    // Ritorna l'oggetto mappa
    return map;
  }

  
}

