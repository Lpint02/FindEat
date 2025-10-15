import Router from "./router/Router.js";

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
    html: "/pages/login.html",
    css: ["/CSS/login.css"],
});
/*
router.addRoute("/home", {
  html: "/pages/home.html",
  css: ["/css/home.css"],
  createView: (routerInstance) => {
    const view = new HomeView();
    const presenter = new HomePresenter(view, authService, routerInstance);
    view.presenter = presenter;
    return view;
  }
});*/

// --- Avvio dell’app ---
router.init();
