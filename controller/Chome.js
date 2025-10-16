import OverpassService from "../servicies/overpass.js";

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
}
