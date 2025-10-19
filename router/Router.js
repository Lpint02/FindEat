
export default class Router 
{
  //costruttore
  constructor(rootId) {
    this.root = document.getElementById(rootId);
    console.log(this.root);
    if (!this.root) {
      throw new Error(`Elemento con id "${rootId}" non trovato nel DOM.`);
    }
    this.routes = {};        // path -> { html, css: [..], view }
    this.currentCss = [];    
    this.#registerPopState();
  }

  // metodo per registrare una nuova rotta
  addRoute(path, config) {
    // config: { html: "pages/login.html", css: ["css/login.css"], view: LoginView }
    this.routes[path] = config;
    console.log(`Rotta registrata: ${path}`, config);
  }

  // metodo per navigare a una rotta
  async navigate(path) {
    history.pushState({}, "", path);  //Nota :history è un oggetto che gestisce la cronologia delle pagine visitate nel browser
    await this.#loadRoute(path);   // in questo modo dovrebbe cambiare la URL senza ricaricare la pagina
  }

  // metodo privato per caricare una rotta
  async #loadRoute(path) {
    const route = this.routes[path];
    
    if (!route) {
      console.log("ROTA NON TROVATA");
      await this.#manageWrongRoute(path);
      return;
    }
    console.log(`Caricamento rotta: ${path}`, route);
    
    // carica e applica CSS della rotta (rimuove CSS della rotta precedente)
    this.#unloadCurrentCss();
    if (Array.isArray(route.css)) {
      await Promise.all(route.css.map(href => this.#loadCss(href)));
    }
    console.log("CSS caricati:", this.currentCss);
    
    // fetcha la pagina HTML
    const resp = await fetch(route.html, { cache: "no-cache" });
    if (!resp.ok) {
      this.root.innerHTML = "<h2>Errore caricamento pagina</h2>";
      return;
    }
    const html = await resp.text();
    this.root.innerHTML =""; // pulisce il contenuto precedente
    this.root.innerHTML = html;  // è qui che l'HTML viene inserito nel DOM
    console.log(window.location.pathname);
    console.log("view:", route.view);
    // inizializza la view (se fornita)
    if (route.view) {
      // view può accettare il router come dipendenza: new route.view(this, altri service)
      const view = route.view(this);
      console.log("View creata:", view);
      if (view && typeof view.init === "function") {
        // view.init() viene chiamato dopo che l'HTML è stato inserito nel DOM
        view.init();
      }
    }
    else{
      console.warn("NON SI é CREATA LA VIEW!")
    }
  }

    // metodo privato per caricare un file CSS
  #loadCss(href) {
    return new Promise((resolve, reject) => {
      // evita duplicati (se un altro route usa lo stesso file non verrà reinserito)
      if (document.querySelector(`link[data-router-css="${href}"]`)) {
        // se già presente, aggiungilo alla lista corrente (ma non duplicare)
        this.currentCss.push(href);
        return resolve();
      }
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      link.setAttribute("data-router-css", href);
      link.onload = () => {
        this.currentCss.push(href);
        resolve();
      };
      link.onerror = (e) => reject(e);
      document.head.appendChild(link);
    });
  }

  // metodo privato per rimuovere i CSS della rotta corrente
  #unloadCurrentCss() {
    for (const href of this.currentCss) {
      const node = document.querySelector(`link[data-router-css="${href}"]`);
      if (node) node.remove();
    }
    this.currentCss = [];
  }
  
  // metodo privato per gestire il popstate (navigazione avanti/indietro)
  #registerPopState() {
    window.addEventListener("popstate", () => {
      this.#loadRoute(window.location.pathname);
    });
  }

  async #manageWrongRoute(path)
  {
    const route = this.routes[path];
    if (!route) {
    // Redirect a login se la rotta non esiste
    if (this.routes['/login']) 
    {
      history.replaceState({}, "", "/login");
      await this.#loadRoute("/login");
    } 
    else 
    {
      this.root.innerHTML = "<h2>404 - Pagina non trovata</h2>";
    }
    console.warn(`Rotta non trovata: ${path}`);
    return;
  }
}

  // metodo per inizializzare il router (carica la rotta corrente)
  init() 
  {
    console.log("Router init:", window.location.pathname);
    this.#loadRoute(window.location.pathname);
  }
}


