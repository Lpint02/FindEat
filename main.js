import Router from "./router/Router.js";
import LoginView from "./view/LoginView.js";
import LoginController from "./controller/LoginController.js";
import HomeView from "./view/HomeView.js";
import GenericHomeView from "./view/GenericHomeView.js";
import HomeController from "./controller/HomeController.js";
import ProfileView from "./view/ProfileView.js";
import ProfiloController from "./controller/ProfileController.js";
import RegistrationView from "./view/RegistrationView.js";
import RegistrationController from "./controller/RegistrationController.js";
import { auth, onAuthStateChanged } from "./services/firebase-config.js";

export const router = new Router("app"); // <main id="app"></main> di index.html

// --- Definizione delle rotte ---
//Rotta di home
router.addRoute("/home", {
  html: "pages/home.html",
  css: ["CSS/home.css"],
  view: (routerInstance) => {
    const view = new HomeView();
    view.router = routerInstance;
    // collega controller MVC
    const controller = new HomeController(view);
    controller.router = routerInstance;
    view.controller = controller;
    return view;
  }
});

//Rotta di home generica (utente non loggato)
router.addRoute("/", {
  html: "pages/home.html",
  css: ["CSS/home.css"],
    view: (routerInstance) => {
      const view = new GenericHomeView();
      view.router = routerInstance;
      const controller = new HomeController();
      controller.router = routerInstance;
      view.controller = controller;
      return view;
    }
});

//Rotta di login
router.addRoute("/login", {
  html: "pages/login.html",
  css: ["CSS/login.css"],
    view: (routerInstance) => {
      const view = new LoginView();
      view.router = routerInstance;
      const controller = new LoginController();
      controller.router = routerInstance;
      view.controller = controller;
      return view;
    }
});

//Rotta di profilo
router.addRoute("/profilo", {
  html: "pages/profilo.html",
  css: ["CSS/profilo.css"],
  view: (routerInstance) => {
    const view = new ProfileView();
    view.router = routerInstance;
    const controller = new ProfiloController();
    controller.router = routerInstance;
    controller.view = view;
    view.controller = controller;
    return view;
  }
});

//Rotta di registrazione
router.addRoute("/registrazione", {
  html: "pages/registrazione.html",
  css: ["CSS/registrazione.css"],
  view: (routerInstance) => {
    const view = new RegistrationView();
    view.router = routerInstance;
    const controller = new RegistrationController();
    controller.router = routerInstance;
    view.controller = controller;
    return view;
  }
});

// --- Gestione autenticazione e routing iniziale ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    console.log("Utente autenticato:", user.email);
    // Se l’utente è loggato, vai direttamente a /home
    if (window.location.pathname === "/" || window.location.pathname === "/login") {
      router.navigate("/home");
    } else {
      router.init(); // nel caso l’utente ricarichi su /profilo o /home
    }
  } else {
    console.log("Nessun utente loggato.");
    router.navigate("/"); //Torna alla login se non autenticato
  }
});
router.init();
