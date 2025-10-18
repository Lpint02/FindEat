import * as L from 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';
import { createRestaurantMarker, selectedIcon, defaultIcon } from "../map/markerManager.js";
import { renderDetailPanel, showListPanel } from "./detailPanel.js";
import { haversineKm } from "../map/geo.js";
import HomeController from "../controller/Chome.js"

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
    const statusDiv = document.getElementById("status");
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

    this.controller = new HomeController(self);
    const data = await this.controller.findrestaurants(radius, lat, lon);
    if (!data.elements || !data.elements.length) 
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
    elements.forEach(el => 
    {
      const marker = createRestaurantMarker(this.map, el, this.#handleSelect.bind(this));
      
      // Se il marker è valido, aggiungilo alla mappa dei marker con l'id del ristorante
      if (marker) {
        this.markers.set(el.id, marker);
      }
    });
    // Lista iniziale
    const listContainer = document.getElementById('listView');
    this.#renderRestaurantList(listContainer, elements, (restaurant) => {
      // Recupera il marker corrispondente al ristorante selezionato
      const marker = this.markers.get(restaurant.id);

      // Simula un clic sul marker, se esiste
      if (marker) {
        marker.fire('click');
      }
    });
  }

  // Metodo privato per gestire errori geolocalizzazione
  #showError(err) {
    const statusDiv = document.getElementById("status");
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
      let eLat, eLon;

      if (el.lat != null) 
      {
        eLat = el.lat;
      } 
      else if (el.center?.lat != null) 
      {
        eLat = el.center.lat;
      }

      if (el.lon != null) 
      {
        eLon = el.lon;
      } 
      else if (el.center?.lon != null) 
      {
        eLon = el.center.lon;
      }

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

  // Metodo privato per rendere la lista dei ristoranti
  #renderRestaurantList(container, items, onSelect) {
    if (!container) return;
    container.innerHTML = '';

    if (!items || !items.length) {
      container.innerHTML = '<div>Nessun ristorante trovato nell\'area selezionata.</div>';
      return;
    }

    for (const el of items) {
      const name = el.tags?.name || 'Ristorante senza nome';
      // Distanza (se disponibile in futuro: qui placeholder "- km")
      const distance = el.__distanceKm != null ? `${el.__distanceKm.toFixed(1)} km` : '';

      const div = document.createElement('div');
      div.className = 'list-item';
      div.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
          <div>
            <h3 class="li-title" style="margin:0;">${name}</h3>
            <div class="li-meta">${distance}</div>
          </div>
          <div style="display:flex; gap:8px;">
            <button class="like-btn li-like" title="Mi piace" aria-label="Mi piace">♡</button>
            <button class="back-btn li-details" title="Vedi dettagli" aria-label="Vedi dettagli">Dettagli</button>
          </div>
        </div>
      `;
      // Click su Dettagli
      div.querySelector('.li-details').addEventListener('click', (e) => { e.stopPropagation(); onSelect && onSelect(el); });
      // Click su like NON apre i dettagli
      const likeBtn = div.querySelector('.li-like');
      likeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        likeBtn.classList.toggle('liked');
        likeBtn.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
      });
      // Click ovunque sul box apre i dettagli
      div.addEventListener('click', () => onSelect && onSelect(el));
      container.appendChild(div);
    }
  }
}

