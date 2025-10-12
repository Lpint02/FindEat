import { createPopupContent } from "../map/popuptemplate.js";
import { fetchPlaceDetails } from "../api/googlePlaces.js";
import { getDocumentById, saveDocumentWithId } from "../api/firebaseDB.js";
import { showModalWithData } from "../ui/modal.js";

export function createRestaurantMarker(map, el) {
  const lat = el.lat || el.center?.lat;
  const lon = el.lon || el.center?.lon;
  if (!lat || !lon) return;

  const marker = L.marker([lat, lon]).addTo(map);
  marker.bindTooltip(createPopupContent(el.tags));

  marker.on("click", async () => {
    const name = el.tags.name;
    if (!name) return alert("Nessun nome per questo ristorante.");
    const docId = `osm_${el.type}_${el.id}`;

    const saved = await getDocumentById("Restaurant", docId);
    if (saved) {
      console.log("Dati già salvati, uso quelli.");
      return showModalWithData(saved, name, el);
    }

    try {
      const place = await fetchPlaceDetails(name, lat, lon);
      console.log("cerco Dati Google Places");
      const toSave = {
        name: place.name,
        placeId: place.place_id,
        formatted_address: place?.formatted_address || null,
        international_phone_number: place?.international_phone_number || null,
        website: place?.website || null,
        cuisine: el.tags?.cuisine || null,
        opening_hours: place?.opening_hours?.weekday_text?.join(" | ") || null,
        rating: place?.rating || null,
        reviews: place?.reviews || [],
        photos: place?.photos?.slice(0, 5).map(p => p.getUrl({ maxWidth: 800, maxHeight: 600 })) || [],
        location: { lat, lng: lon },
        savedAt: new Date().toISOString()
      };
      await saveDocumentWithId("Restaurant", docId, toSave);
      showModalWithData(toSave, name, el);
    } catch (e) {
      console.error("Errore Google Places:", e);
    }
  });
}
