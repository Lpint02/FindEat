export default class OverpassService 
{
    async findRestaurants(radius, lat, lon)
    {
        const query = `[out:json][timeout:25]; (node["amenity"="restaurant"](around:${radius},${lat},${lon}); way["amenity"="restaurant"](around:${radius},${lat},${lon}); relation["amenity"="restaurant"](around:${radius},${lat},${lon}); ); out center;`;
        const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query });
        const data = await res.json();
        return data;
    }

    // Metodo per fetchare i ristoranti da Overpass API
    async fetchRestaurants(lat, lon, radius = 10000) 
    {
        const query = `
            [out:json][timeout:30];
            (
                node["amenity"="restaurant"](around:${radius},${lat},${lon});
                way["amenity"="restaurant"](around:${radius},${lat},${lon});
                relation["amenity"="restaurant"](around:${radius},${lat},${lon});
            );
            out center;
        `;
        const res = await fetch("https://overpass-api.de/api/interpreter", { method: "POST", body: query, timeout: 50000 });
        const data = await res.json();
        return data.elements || [];
    }
}
