import ProfileController from "../controller/ProfileController.js";

export default class ProfileView {

    constructor() {
        this.router = null; // Router instance
        this.controller = null; // Controller instance
    }

    init() 
    {
        console.log("ProfileView initialized");

        //Controllo se l'utente ha la foto profilo
        let risultato_check = this.controller.checkUserProfilePhoto().esito;
        if(risultato_check){
            console.log("Utente ha la foto profilo, la carico");
            this.controller.setUserProfilePhoto();
        }
        else{
            console.log("Utente non ha la foto profilo, carico immagine di default");
        }

        //Setto se l'utente ha nome e email 
        const userName = localStorage.getItem('userName');
        const userEmail = localStorage.getItem('userEmail');
        if (userName && userEmail) {
            document.getElementById('user-name').textContent = userName;
            document.getElementById('user-email').textContent = userEmail;
        }

        // Carico le recensioni tramite il controller
        this.controller.loadUserReviews();

        //Carico il carosello dei ristoranti preferiti
        this.controller.loadLikedRestaurant();

        // Evento click sul link "Home" nella navbar
        const homeLink = [...document.querySelectorAll('.navbar-nav .nav-link')].find(el => el.textContent.trim() === 'Home');
        if (homeLink) {
            console.log("Home link trovato, aggiungo event listener");
            homeLink.addEventListener('click', (e) => {
                console.log("Home link cliccato");
                e.preventDefault();
                if (this.router) {
                    this.router.navigate("/home");
                } else {
                    console.error("Router non definito in ProfileView");
                }
            });
        }

        // Evento modifica foto profilo
        // Gestione bottone "Modifica foto"
        const btnEditPhoto = document.getElementById('btn-edit-photo');
        const inputPhoto = document.getElementById('input-photo');

        // Quando clicchi sul bottone, apri il selettore file
        btnEditPhoto.addEventListener('click', (e) => {
        e.preventDefault();
        inputPhoto.click(); // apre la finestra di selezione immagine
        });

        // Quando selezioni un file, passalo al controller
        inputPhoto.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file && this.controller) {
            this.controller.editUserProfilePhoto(file);
        }
       });

       // Evento "Elimina foto profilo"
       const btnRemovePhoto = document.getElementById('btn-remove-photo');

       if (btnRemovePhoto) {
        btnRemovePhoto.addEventListener('click', async (e) => {
        e.preventDefault();

               const conferma = confirm("Vuoi davvero eliminare la tua foto profilo?");
               if (conferma && this.controller) {
                   await this.controller.deleteUserProfilePhoto();
               }
           });
        }

        // Evento elimina proprio account
        const btnDeleteAccount = document.getElementById('btn-delete-profile');

        if (btnDeleteAccount) {
            btnDeleteAccount.addEventListener('click', async (e) => {
                e.preventDefault();

                const conferma = confirm("Vuoi davvero eliminare il tuo account?");
                if (conferma && this.controller) {
                    await this.controller.deleteUser();
                }
            });
        }

    }

    // Metodo chiamato dal controller per disegnare le recensioni
    displayReviews(reviews) {
        const container = document.getElementById('reviews-container');
        container.innerHTML = '';

        reviews.forEach((review, index) => {
            const dateStr = this._formatReviewDate(review.time);

            const card = document.createElement('div');
            card.className = 'd-flex justify-content-center mb-4';
            card.innerHTML = `
                <div class="card shadow-sm border-0" style="width: 420px; max-width: 95vw; background: #e3f2fd;">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center mb-2">
                            <h5 class="mb-0">${review.restaurantName}</h5>
                            <button id="delete-${index}" title="Elimina recensione" style="width:32px;height:32px;border:none;border-radius:50%;background:#e53935;display:flex;align-items:center;justify-content:center;">
                                <span style="color:#fff;font-size:1.3rem;line-height:1;">&times;</span>
                            </button>
                        </div>
                        <div class="mb-2">
                            <label class="form-label">Rating:</label>
                            <input type="number" min="0" max="5" value="${review.rating}" id="rating-${index}" class="form-control w-50 d-inline-block ms-2">
                        </div>
                        <div class="mb-2">
                            <label class="form-label">Testo:</label>
                            <textarea class="form-control" id="text-${index}" rows="2">${review.text}</textarea>
                        </div>
                        <div class="d-flex justify-content-between align-items-center mt-2">
                            <small class="text-muted">Ultimo aggiornamento: ${dateStr}</small>
                            <button class="btn btn-primary btn-sm" id="save-${index}">Salva</button>
                        </div>
                    </div>
                </div>
            `;
            container.appendChild(card);

            // Evento click su un bottone "Salva"
            document.getElementById(`save-${index}`).addEventListener('click', async () => {
                const newText = document.getElementById(`text-${index}`).value;
                const newRating = parseInt(document.getElementById(`rating-${index}`).value);
                review.update({ text: newText, rating: newRating });
                await this.controller.updateReview(review);
            });

            //Evento cancella Rewiew
            document.getElementById(`delete-${index}`).addEventListener('click', async () => {
                if (confirm('Vuoi davvero eliminare questa recensione?')) {
                    await this.controller.deleteReview(review);
                }
            });
        });
    }

    // Metodo privato per formattare la data delle recensioni
    _formatReviewDate(t) {
        if (t && typeof t === 'object' && 'seconds' in t && 'nanoseconds' in t) {
            // Firestore Timestamp
            const date = new Date(t.seconds * 1000 + t.nanoseconds / 1e6);
            return date.toLocaleString();
        } else if (typeof t === 'string') {
            return t;
        } else {
            return 'Data non disponibile';
        }
    }

    //metodo chiamato dal controller per gestire la mancanza di ristoranti a cui si è fatto like
    noLikedRestaurant(){
                const Contenitore_Carosello = document.getElementById("Conteiner_del_carosello");
                const section = document.createElement('section');
                section.classList.add('empty-section');
                const div = document.createElement('div');
                div.classList.add('empty-icon');
                const icon = document.createElement('i');
                icon.className = 'fa-solid fa-utensils';
                const p = document.createElement('p');
                p.textContent = 'Nessun ristorante piaciuto';
                div.appendChild(icon);
                div.appendChild(p);
                section.appendChild(div);
                Contenitore_Carosello.appendChild(section);
    }

    //metodo chiamato dal controller per disegnare il carosello dei ristoranti preferiti
    displayLikedRestaurant(restaurants) {
    
        const container = document.getElementById("Conteiner_del_carosello");
        if (!container) return;

        // Svuota il contenitore (in caso di refresh)
        container.innerHTML = "";

        // Se non ci sono ristoranti, mostra messaggio
        if (!restaurants || restaurants.length === 0) {
            this.noLikedRestaurant();
            return;
        }

        // Crea struttura base del carosello
            const carouselId = "carouselLikedRestaurants";
            const carousel = document.createElement("div");
            carousel.id = carouselId;
            carousel.className = "carousel slide carousel-fade";
            carousel.setAttribute("data-bs-ride", "carousel");

        // Crea il contenitore interno
        const inner = document.createElement("div");
        inner.className = "carousel-inner";

       // Genera ogni item (card del ristorante)
       restaurants.forEach((rest, index) => {
            const item = document.createElement("div");
            item.className = `carousel-item ${index === 0 ? "active" : ""}`;

            // Card Bootstrap
            const defaultImg = "images/images.png";
            const card = `
                <div class="card mx-auto shadow" style="width: 20rem; border-radius: 1rem; overflow: hidden;">
                    <img src="${rest.photo_url || defaultImg}" class="card-img-top" alt="${rest.RestaurantName}">
                    <div class="card-body text-center">
                        <h5 class="card-title">${rest.RestaurantName}</h5>
                        <p class="card-text mb-2">${rest.address}</p>
                        <p class="text-warning mb-2">
                            ⭐ ${rest.rating ? rest.rating.toFixed(1) : "N/A"}
                        </p>
                        <p class="text-muted small mb-3">
                            Prezzo: ${rest.price_level ?? "-"} | Tel: ${rest.phone_number ?? "N/D"}
                        </p>
                        <button class="btn btn-outline-danger unlike-btn" data-id="${rest.RestaurantID}">
                            <i class="bi bi-hand-thumbs-down"></i> Rimuovi
                        </button>
                    </div>
                </div>
        `;
        item.innerHTML = card;
        inner.appendChild(item);
       });

       // Aggiungi controlli (next/prev)
       const prevBtn = `
            <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev">
                <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Precedente</span>
            </button>
        `;
        const nextBtn = `
            <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next">
                <span class="carousel-control-next-icon" aria-hidden="true"></span>
                <span class="visually-hidden">Successivo</span>
            </button>
        `;

        // Monta il carosello
        carousel.appendChild(inner);
        carousel.insertAdjacentHTML("beforeend", prevBtn + nextBtn);
         container.appendChild(carousel);

        // Eventuali listener per rimuovere dai like
        container.querySelectorAll(".unlike-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const restaurantId = e.currentTarget.getAttribute("data-id");
                console.log("Ristorante da rimuovere:", restaurantId);
                // puoi chiamare un metodo del controller tipo:
                // this.controller.unlikeRestaurant(restaurantId);
            });
        });
}
}
