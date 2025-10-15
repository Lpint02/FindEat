import { fetchPlaceDetails, fetchPlaceDetailsById } from "../api/googlePlaces.js";
import { createPopupContent } from "./popupTemplate.js";
import { getDocumentById, saveDocumentWithId } from "../api/firebaseDB.js";

// Icone Leaflet: default (blu) e selezionato (rosso)
export const defaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export const selectedIcon = L.icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png',
  iconRetinaUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41]
});

export function createRestaurantMarker(map, el, onSelect) {
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (!lat || !lon) return;

  const marker = L.marker([lat, lon], { icon: defaultIcon }).addTo(map);
  // Tooltip leggero per modalità lista (si può nascondere via CSS quando in dettaglio)
  const tooltipHtml = createPopupContent(el.tags || {});
  marker.bindTooltip(tooltipHtml, { direction: 'top', offset: [0, -6], opacity: 0.95 });

  marker.on("click", async () => {
    const name = el.tags.name;
    if (!name) return alert("Nessun nome per questo ristorante.");
    const docId = `osm_${el.type}_${el.id}`;

    const saved = await getDocumentById("Restaurant", docId);
    if (saved) {
      console.log("Dati già salvati, uso quelli.");
      // Rigenera foto e stato apertura via placeId per evitare 403 e aggiornare open_now
      let dataOut = saved;
      try {
        if (saved.placeId) {
          const fresh = await fetchPlaceDetailsById(saved.placeId);
          const freshPhotos = fresh?.photos?.slice(0, 5).map(p => p.getUrl({ maxWidth: 800, maxHeight: 600 })) || [];
          const openNowFresh = fresh?.current_opening_hours?.open_now ?? fresh?.opening_hours?.open_now;
          const weekdayTextFresh = fresh?.current_opening_hours?.weekday_text || fresh?.opening_hours?.weekday_text || saved.opening_hours_weekday_text;
          dataOut = {
            ...saved,
            photos: freshPhotos.length ? freshPhotos : saved.photos,
            open_now: openNowFresh !== undefined ? openNowFresh : saved.open_now,
            opening_hours_weekday_text: weekdayTextFresh
          };
        }
      } catch (e) {
        console.warn("Impossibile rigenerare dati freschi da placeId:", e);
      }
      if (onSelect) return onSelect({ data: dataOut, fallbackName: name, el, location: { lat, lon } });
      return;
    }

    try {
      const place = await fetchPlaceDetails(name, lat, lon);
      console.log("cerco Dati Google Places");
      const openNow = place?.current_opening_hours?.open_now ?? place?.opening_hours?.open_now;
      const weekdayText = place?.current_opening_hours?.weekday_text || place?.opening_hours?.weekday_text || null;
      const toSave = {
        name: place.name,
        placeId: place.place_id,
        formatted_address: place?.formatted_address || null,
        international_phone_number: place?.international_phone_number || null,
        website: place?.website || null,
        cuisine: el.tags?.cuisine || null,
        opening_hours_weekday_text: weekdayText, // array originale
        open_now: openNow,
        rating: place?.rating || null,
        user_ratings_total: place?.user_ratings_total || null,
        price_level: place?.price_level ?? null,
        reviews: place?.reviews || [],
        editorial_summary: place?.editorial_summary || null,
        serves_breakfast: place?.serves_breakfast || false,
        serves_lunch: place?.serves_lunch || false,
        serves_dinner: place?.serves_dinner || false,
        serves_vegetarian_food: place?.serves_vegetarian_food || false,
        reservable: place?.reservable || false,
        delivery: place?.delivery || false,
        dine_in: place?.dine_in || false,
        takeout: place?.takeout || false,
        wheelchair_accessible_entrance: place?.wheelchair_accessible_entrance || false,
        photos: place?.photos?.slice(0, 5).map(p => p.getUrl({ maxWidth: 800, maxHeight: 600 })) || [],
        location: { lat, lng: lon },
        savedAt: new Date().toISOString()
      };
      await saveDocumentWithId("Restaurant", docId, toSave);
      if (onSelect) return onSelect({ data: toSave, fallbackName: name, el, location: { lat, lon } });
    } catch (e) {
      console.error("Errore Google Places:", e);
    }
  });

  return marker;
}
