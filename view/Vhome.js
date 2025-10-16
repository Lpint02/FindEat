import { createRestaurantMarker, selectedIcon, defaultIcon } from "./map/markerManager.js";
import { renderRestaurantList } from "./ui/listPanel.js";
import { renderDetailPanel, showListPanel } from "./ui/detailPanel.js";
import { haversineKm } from "./map/geo.js";
import { HomeController } from "../controller/Chome.js"

export default class HomeView 
{
  //costruttore
  constructor() {
    this.controller = null; // sarà assegnato dalle rotte in main.js
    this.router = null;    // sarà assegnato dalle rotte in main.js
    this.markers = new Map();
    this.selected = null;
    this.map = null;
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
    const lat = pos.coords.latitude;
    const lon = pos.coords.longitude;
    // raggio d'azione in metri
    const radius = 10000;
    statusDiv.innerText = `✅ Posizione trovata! Cerco ristoranti entro ${radius} m...`;

    // inizializzazione mappa
    this.map = this.#initMap("map", [lat, lon], radius);
    
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

    // Marker posizione utente
    let userMarker = L.marker([lat, lon], { icon: userMarkerIcon, interactive: false }).addTo(this.map);

    // Se in futuro riattivi le coordinate reali, puoi usare watchPosition per aggiornarlo
    this.#watchUserPosition(userMarker);

    this.controller= new HomeController(self);
    const data=this.controller.findrestaurants(radius,lat,lon);
    if (!data.elements.length) 
    { 
      statusDiv.innerText = "😔 Nessun ristorante trovato."; 
      return; 
    }
    statusDiv.innerText = `🍽️ Trovati ${data.elements.length} ristoranti!`;
    // riordina i ristoranti in base alla distanza dall'utente
    const elements = this.#distanceRestaurantSorted(data, lat, lon);
            
    this.markers = new Map(); // non è la mappa, intende la struttura dati Map!
    this.selected=null;
    
    this.#setupBackButton();
    
    // Crea marker con callback
    elements.forEach(el => {
      const marker = createRestaurantMarker(this.map, el, this.#handleSelect.bind(this));
      if (marker) this.markers.set(el.id, marker);
    });
    // Lista iniziale
    renderRestaurantList(listContainer, elements, (el) => {
      const marker = this.markers.get(el.id);
      if (marker) marker.fire('click');
    });
  }

  // Metodo privato per gestire errori geolocalizzazione
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

  // Metodo privato per per aggiornare la posizione dell'utente
  #watchUserPosition(userMarker) {
    if (navigator.geolocation.watchPosition) {
      try {
        navigator.geolocation.watchPosition(p => {
        const nLat = p.coords.latitude;
        const nLon = p.coords.longitude;
        userMarker.setLatLng([nLat, nLon]);
        });
      } catch(e){ /* silenzioso */ }
    }
  }

  // Metodo privato per calcolare distanza e ordinare i ristoranti
  #distanceRestaurantSorted(data, lat, lon) 
  {
    return data.elements.map(el => {
      const eLat = el.lat ?? el.center?.lat;
      const eLon = el.lon ?? el.center?.lon;
      if (typeof eLat === 'number' && typeof eLon === 'number') 
      {
        el.__distanceKm = haversineKm(lat, lon, eLat, eLon);
      } 
      else 
      {
      el.__distanceKm = Number.POSITIVE_INFINITY;
      }
      return el;
    }).sort((a, b) => (a.__distanceKm ?? Infinity) - (b.__distanceKm ?? Infinity));
  }


  #handleSelect({ data, fallbackName, el, location }) {
    // reset icona precedente
    if (this.selected?.el?.id && this.selected.el.id !== el.id) {
      const prevMarker = this.markers.get(this.selected.el.id);
      if (prevMarker) prevMarker.setIcon(defaultIcon);
    }
    this.selected = { data, el, location };
    // colora di rosso il marker selezionato
    const selMarker = this.markers.get(el.id);
    if (selMarker) selMarker.setIcon(selectedIcon);
    renderDetailPanel(data, fallbackName, el);
    if (location?.lat && location?.lon) {
      this.map.setView([location.lat, location.lon], Math.max(this.map.getZoom(), 16));
    }
  }

  // Metodo privato per impostare il bottone "Indietro" nel pannello dettaglio
  #setupBackButton() {
    const listContainer = document.getElementById('listView');
    const backBtn = document.getElementById('dpBackToList');
    if (backBtn) backBtn.addEventListener('click', () => {
      if (this.selected?.el?.id) 
      {
        const prevMarker = this.markers.get(this.selected.el.id);
        if (prevMarker) prevMarker.setIcon(defaultIcon);
      }
      this.selected = null;
      showListPanel();
    });
  }
}

