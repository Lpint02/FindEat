import OverpassService from "../servicies/overpass.js";
import Mmap from "../model/Mmap.js";
export default class HomeController 
{
  constructor() 
  {      
  }

  async findrestaurants(radius, lat, lon)
  {
    const service = new OverpassService();
    const result = await service.findRestaurants(radius, lat, lon);
    return result;
  }

  haversineKm(aLat, aLon, bLat, bLon) 
  {
    const mmap = new Mmap();
    return mmap.haversineKm(aLat, aLon, bLat, bLon);
  }
}
