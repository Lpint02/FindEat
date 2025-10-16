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
        if( "geolocation" in navigator){

        }
        else{
          statusDiv.innerText = "❌ Geolocalizzazione non supportata dal browser.";
        }
  }

  
}

