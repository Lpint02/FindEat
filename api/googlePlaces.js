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
          "opening_hours"
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
