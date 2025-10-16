import { OverpassService } from "../servicies/overpass.js";

export default class HomeController 
{
  constructor() 
  {      
  }

  async findrestaurants(radius, lat, lon)
  {
    const service = new OverpassService();
    result = service.findRestaurants(radius, lat, lon);
    return result;
  }
}
