import Router from "./router/Router.js";
import LoginView from "./view/VLogin.js";
import HomeView from "./view/Vhome.js";
import HomeController from "./controller/HomeController.js";
import VProfilo from "./view/Vprofilo.js";

// Service (accesso ai dati, API, Firebase, ecc.)
//import AuthService from "./service/AuthService.js";



export const router = new Router("app"); // <main id="app"></main> di index.html

// --- Definizione delle rotte ---

//Rotta di login
router.addRoute("/", {
  html: "pages/login.html",
  css: ["CSS/login.css"],
    view: (routerInstance) => {
      const view = new LoginView();
      view.router = routerInstance;
      //const presenter = new LoginPresenter(view, authService, routerInstance);
      //view.presenter = presenter;
      return view;
    }
});

router.addRoute("/home", {
  html: "pages/home.html",
  css: ["CSS/home.css"],
  view: (routerInstance) => {
    const view = new HomeView();
    view.router = routerInstance;
    // collega controller MVC
    const controller = new HomeController(view);
    view.controller = controller;
    return view;
  }
});

router.addRoute("/profilo", {
  html: "pages/profilo.html",
  css: ["CSS/profilo.css"],
  view: (routerInstance) => {
    const view = new VProfilo();
    view.router = routerInstance;
    const controller = new ProfiloController(view);
    view.controller = controller;
    return view;
  }
});

// --- Avvio dell’app ---
router.init();
