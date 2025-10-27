// Mappa standalone: gestisce solo rendering e interazioni della mappa (Leaflet)
// Rimane sulla stessa pagina della Home ma in un componente separato.

export default class MapView {
    constructor() {
        // Stato della mappa e dell'interfaccia utente
        this.map = null;
        this.userMarker = null;
        this.markers = new Map(); // id => marker (rosso o blu)
        this.selected = null;
        this.radiusCircle = null;
        this._tilesLayerAdded = false;

        // Icone marker
        this.defaultIcon = window.L ? L.icon({
            iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
            iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        }) : null;
        this.selectedIcon = window.L ? L.icon({
            iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
            iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
            shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
            iconSize: [25, 41],
            iconAnchor: [12, 41],
            popupAnchor: [1, -34],
            tooltipAnchor: [16, -28],
            shadowSize: [41, 41]
        }) : null;
    }

    // Inizializza o aggiorna la mappa e il cerchio di raggio
    initMap(center, radius) {
        const container = document.getElementById('map');
        if (!container || !window.L) return;
        // Riutilizza la mappa memorizzata se presente, altrimenti assicura che il container sia pulito per una nuova inizializzazione
        if (!this.map) {
            if (container.__leafletMapRef) {
                this.map = container.__leafletMapRef;
            } else {
                // Risolve l'errore "Map container is already initialized" resettando l'id interno
                if (container._leaflet_id) {
                    try { container._leaflet_id = null; } catch(e) { /* ignore */ }
                }
                this.map = L.map(container).setView(center, 15);
                container.__leafletMapRef = this.map;
            }
            if (this.map.zoomControl?.setPosition) this.map.zoomControl.setPosition('topright');
            // Aggiungi i livelli delle tiles solo una volta
            if (!this._tilesLayerAdded) {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
                this._tilesLayerAdded = true;
            }
        } else {
            this.map.setView(center, this.map.getZoom() || 15);
        }
        // Assicura che il cerchio di raggio sia unico e condiviso tra istanze
        if (!this.radiusCircle) {
            if (container.__radiusCircleRef) {
                this.radiusCircle = container.__radiusCircleRef;
            } else {
                // Cerca di trovare un cerchio esistente sulla mappa (da istanze di vista precedenti)
                let found = null;
                this.map.eachLayer(l => { if (!found && l instanceof L.Circle) found = l; });
                if (found) {
                    this.radiusCircle = found;
                    container.__radiusCircleRef = found;
                } else {
                    this.radiusCircle = L.circle(center, { radius, color: "#1976d2", fillColor: "#64b5f6", fillOpacity: 0.12, weight: 1 }).addTo(this.map);
                    container.__radiusCircleRef = this.radiusCircle;
                }
            }
        }
        // Aggiorna la posizione e il raggio del cerchio
        if (this.radiusCircle) {
            this.radiusCircle.setLatLng(center);
            this.radiusCircle.setRadius(radius);
        }
        // Rimuovi eventuali cerchi duplicati oltre il principale
        const keep = this.radiusCircle;
        const toRemove = [];
        this.map.eachLayer(l => { if (l instanceof L.Circle && l !== keep) toRemove.push(l); });
        toRemove.forEach(l => { try { l.remove(); } catch(e) { /* ignore */ } });
    }

    // Imposta il marker della posizione dell'utente
    setUserMarker(lat, lon) {
        if (!window.L || !this.map) return;
        if (!this.userMarker) this.userMarker = L.marker([lat, lon], { icon: this.selectedIcon, interactive: false }).addTo(this.map);
        else this.userMarker.setLatLng([lat, lon]);
    }

    // Aggiorna la posizione del marker utente
    updateUserPosition(lat, lon) {
        if (this.userMarker) this.userMarker.setLatLng([lat, lon]);
    }

    // Renderizza i marker dei ristoranti
    renderMapRestaurants(elements, onSelect) {
        // Rimuovi i marker esistenti
        for (const m of this.markers.values()) { try { m.remove(); } catch(e) {} }
        this.markers.clear();
        // Reset selezione corrente per evitare marker "rossi" appesi quando la lista cambia
        if (this.selectedMarker) {
            try { this.selectedMarker.setIcon(this.defaultIcon); } catch(e) { /* ignore */ }
        }
        this.selectedMarker = null;
        this.selected = null;

        if (!Array.isArray(elements) || elements.length === 0) return;

        // Se abbiamo un cerchio di raggio, usalo per filtrare (radius in metri)
        const circle = this.radiusCircle || null;
        const circleCenter = circle ? circle.getLatLng() : null;
        const circleRadius = circle ? circle.getRadius() : null; // metri

        elements.forEach((el, idx) => {
            const lat = el.lat;
            const lon = el.lon;
            if (lat == null || lon == null) return;

            // Se abbiamo il cerchio, calcola distanza e filtra
            if (circleCenter && typeof circleRadius === 'number') {
                try {
                    const d = L.latLng(circleCenter).distanceTo(L.latLng(lat, lon)); // metri
                    if (d > circleRadius) return; // scarta se fuori raggio
                } catch (e) {
                    // fallback: non filtrare se errore
                }
            }

            const marker = this._createRestaurantMarker(this.map, el, (payload) => this._onSelectMarker(payload, onSelect));
            if (marker) {
                const key = el.id ?? (`_${lat}_${lon}_${idx}`);
                this.markers.set(key, marker);
            }
        });
    }

    // Gestisce la selezione di un marker
    _onSelectMarker({ data, fallbackName, el, location }, externalSelect) {
        // Ripristina il marker selezionato in precedenza (se diverso dal nuovo)
        const selMarker = this.markers.get(el.id);
        if (this.selectedMarker && this.selectedMarker !== selMarker) {
            try { this.selectedMarker.setIcon(this.defaultIcon); } catch(e) { /* ignore */ }
        }
        this.selected = { data, el, location };
        if (selMarker) {
            try { selMarker.setIcon(this.selectedIcon); } catch(e) { /* ignore */ }
            this.selectedMarker = selMarker;
        }
        if (location?.lat && location?.lon && this.map) {
            this.map.setView([location.lat, location.lon], Math.max(this.map.getZoom(), 16));
        }
        if (externalSelect) externalSelect({ data, fallbackName, el, location });
    }

    // Crea un marker per un ristorante
    _createRestaurantMarker(map, el, onSelect) {
        if (!map || !window.L) return;
        const lat = el.lat;
        const lon = el.lon;
        if (!lat || !lon) return;
        const marker = L.marker([lat, lon], { icon: this.defaultIcon }).addTo(map);
        const tooltipHtml = this._buildPopupHtml(el.tags || {});
        marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -6], opacity: 0.95 });
        marker.on('click', () => {
            const name = el.name || el.tags?.name || null;
            if (!name) return alert('Nessun nome per questo ristorante.');
            if (onSelect) onSelect({ el, location: { lat, lon }, fallbackName: name });
        });
        return marker;
    }

    // Costruisce l'HTML del popup per un marker
    _buildPopupHtml(tags = {}) {
        const name = tags.name || 'Ristorante senza nome';
        const cuisine = tags.cuisine || 'Tipo sconosciuto';
        const phone = tags.phone || 'N/D';
        const website = tags.website ? `<a href="${tags.website}" target="_blank" rel="noopener">Sito web</a>` : 'N/D';
        return `<b>${name}</b><br>🍽️ Cucina: ${cuisine}<br>📞 Telefono: ${phone}<br>🌐 ${website}`;
    }

    // Seleziona un marker sulla mappa tramite ID
    selectOnMapById(id) {
        const m = this.markers.get(id);
        if (m) m.fire('click');
    }

    // Cancella la selezione sulla mappa
    clearMapSelection() {
        if (this.selectedMarker) {
            try { this.selectedMarker.setIcon(this.defaultIcon); } catch(e) { /* ignore */ }
        }
        this.selectedMarker = null;
        this.selected = null;
    }
}