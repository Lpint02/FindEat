// Mappa standalone: gestisce solo rendering e interazioni della mappa (Leaflet)
// Rimane sulla stessa pagina della Home ma in un componente separato.

export default class MapView {
    constructor() {
        // Stato mappa/ui
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

    // Inizializza/aggiorna la mappa e il cerchio di raggio
    initMap(center, radius) {
        const container = document.getElementById('map');
        if (!container || !window.L) return;
        // Reuse cached map if present, otherwise ensure container is clean for a fresh init
        if (!this.map) {
            if (container.__leafletMapRef) {
                this.map = container.__leafletMapRef;
            } else {
                // Fix sporadic 'Map container is already initialized' by resetting internal id
                if (container._leaflet_id) {
                    try { container._leaflet_id = null; } catch(e) { /* ignore */ }
                }
                this.map = L.map(container).setView(center, 15);
                container.__leafletMapRef = this.map;
            }
            if (this.map.zoomControl?.setPosition) this.map.zoomControl.setPosition('topright');
            // Add tiles only once
            if (!this._tilesLayerAdded) {
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap' }).addTo(this.map);
                this._tilesLayerAdded = true;
            }
        } else {
            this.map.setView(center, this.map.getZoom() || 15);
        }
        // Ensure single radius circle shared across instances
        if (!this.radiusCircle) {
            if (container.__radiusCircleRef) {
                this.radiusCircle = container.__radiusCircleRef;
            } else {
                // Try to find an existing circle on the map (from previous view instances)
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
        // Update circle position and radius
        if (this.radiusCircle) {
            this.radiusCircle.setLatLng(center);
            this.radiusCircle.setRadius(radius);
        }
        // Remove any duplicate circles beyond the primary one
        const keep = this.radiusCircle;
        const toRemove = [];
        this.map.eachLayer(l => { if (l instanceof L.Circle && l !== keep) toRemove.push(l); });
        toRemove.forEach(l => { try { l.remove(); } catch(e) { /* ignore */ } });
    }

    // Marker posizione utente
    setUserMarker(lat, lon) {
        if (!window.L || !this.map) return;
        if (!this.userMarker) this.userMarker = L.marker([lat, lon], { icon: this.selectedIcon, interactive: false }).addTo(this.map);
        else this.userMarker.setLatLng([lat, lon]);
    }

    updateUserPosition(lat, lon) {
        if (this.userMarker) this.userMarker.setLatLng([lat, lon]);
    }

    // Render dei marker ristoranti
    renderMapRestaurants(elements, onSelect) {
        for (const m of this.markers.values()) { try { m.remove(); } catch(e) {} }
        this.markers.clear();
        elements.forEach(el => {
            const marker = this._createRestaurantMarker(this.map, el, (payload) => this._onSelectMarker(payload, onSelect));
            if (marker) this.markers.set(el.id, marker);
        });
    }

    _onSelectMarker({ data, fallbackName, el, location }, externalSelect) {
        if (this.selected?.el?.id && this.selected.el.id !== el.id) {
            const prevMarker = this.markers.get(this.selected.el.id);
            if (prevMarker) prevMarker.setIcon(this.defaultIcon);
        }
        this.selected = { data, el, location };
        const selMarker = this.markers.get(el.id);
        if (selMarker) selMarker.setIcon(this.selectedIcon);
        if (location?.lat && location?.lon && this.map) {
            this.map.setView([location.lat, location.lon], Math.max(this.map.getZoom(), 16));
        }
        if (externalSelect) externalSelect({ data, fallbackName, el, location });
    }

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

    _buildPopupHtml(tags = {}) {
        const name = tags.name || 'Ristorante senza nome';
        const cuisine = tags.cuisine || 'Tipo sconosciuto';
        const phone = tags.phone || 'N/D';
        const website = tags.website ? `<a href="${tags.website}" target="_blank" rel="noopener">Sito web</a>` : 'N/D';
        return `<b>${name}</b><br>🍽️ Cucina: ${cuisine}<br>📞 Telefono: ${phone}<br>🌐 ${website}`;
    }

    selectOnMapById(id) {
        const m = this.markers.get(id);
        if (m) m.fire('click');
    }

    clearMapSelection() {
        if (this.selected?.el?.id) {
            const prevMarker = this.markers.get(this.selected.el.id);
            if (prevMarker) prevMarker.setIcon(this.defaultIcon);
        }
        this.selected = null;
    }
}