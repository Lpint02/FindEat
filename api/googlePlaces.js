// Funzione per ottenere i dettagli di un luogo da Google Places API
export async function fetchPlaceDetails(name, lat, lng) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error("Google Maps Places API non è caricata"));
      return;
    }

    const service = new google.maps.places.PlacesService(document.createElement('div'));

    const location = new google.maps.LatLng(lat, lng);

    service.findPlaceFromQuery({
      query: name,
      fields: ["place_id"],
      locationBias: location // oggetto LatLng corretto
    }, (results, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK || !results || !results[0]) {
        reject(new Error(`Google Places findPlaceFromQuery fallita: ${status}`));
        return;
      }

      const placeId = results[0].place_id;

      service.getDetails({
      placeId: placeId,
      fields: [
          "name",
          "photos",
          "formatted_address",
          "international_phone_number",
          "website",
          "types",
          "geometry",
          "place_id",
          "reviews",
          "rating",
          "user_ratings_total",
          "opening_hours",
          "current_opening_hours",
          "business_status",
          "utc_offset_minutes",
          "price_level",
          "editorial_summary",
          "serves_breakfast",
          "serves_lunch",
          "serves_dinner",
          "serves_vegetarian_food",
          "reservable",
          "delivery",
          "dine_in",
          "takeout",
          "wheelchair_accessible_entrance"
        ]
      }, (place, detailsStatus) => {
        if (detailsStatus !== google.maps.places.PlacesServiceStatus.OK) {
          reject(new Error(`Google Places getDetails fallita: ${detailsStatus}`));
          return;
        }
        resolve(place);
      });
    });
  });
}

// Ottiene i dettagli di un luogo a partire dal placeId (utile per rigenerare URL delle foto)
export async function fetchPlaceDetailsById(placeId) {
  return new Promise((resolve, reject) => {
    if (!window.google || !window.google.maps || !window.google.maps.places) {
      reject(new Error("Google Maps Places API non è caricata"));
      return;
    }

    const service = new google.maps.places.PlacesService(document.createElement('div'));
    service.getDetails({
      placeId,
      fields: [
        "name",
        "photos",
        "formatted_address",
        "international_phone_number",
        "website",
        "types",
        "geometry",
        "place_id",
        "reviews",
        "rating",
        "user_ratings_total",
        "opening_hours",
        "current_opening_hours",
        "business_status",
        "utc_offset_minutes",
        "price_level",
        "editorial_summary",
        "serves_breakfast",
        "serves_lunch",
        "serves_dinner",
        "serves_vegetarian_food",
        "reservable",
        "delivery",
        "dine_in",
        "takeout",
        "wheelchair_accessible_entrance"
      ]
    }, (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) {
        reject(new Error(`Google Places getDetails (byId) fallita: ${status}`));
        return;
      }
      resolve(place);
    });
  });
}
