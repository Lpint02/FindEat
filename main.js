import Router from "./router/Router.js";
import LoginView from "./view/VLogin.js";
import HomeView from "./view/Vhome.js";
import HomeController from "./controller/HomeController.js";

// Service (accesso ai dati, API, Firebase, ecc.)
//import AuthService from "./service/AuthService.js";

// View + Presenter per ogni pagina
//import LoginView from "./view/LoginView.js";
//import LoginPresenter from "./presenter/LoginPresenter.js";
//import HomeView from "./view/HomeView.js";
//import HomePresenter from "./presenter/HomePresenter.js";

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

// --- Avvio dell’app ---
router.init();
