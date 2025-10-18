export default class Mmap 
{
    // Utility geospaziali (Haversine)
    haversineKm(aLat, aLon, bLat, bLon) 
    {
        const toRad = (d) => d * Math.PI / 180;
        const R = 6371; // raggio della Terra in km
        const dLat = toRad(bLat - aLat);
        const dLon = toRad(bLon - aLon);
        const lat1 = toRad(aLat);
        const lat2 = toRad(bLat);
        const h = Math.sin(dLat/2)**2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon/2)**2;
        return 2 * R * Math.asin(Math.sqrt(h));
    }
}