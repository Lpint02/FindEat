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

        const carouselId = "carouselLikedRestaurants";
        const carouselWrapper = document.createElement("div");
        carouselWrapper.className = "carousel-container";

        // Carosello principale
        const carousel = document.createElement("div");
        carousel.id = carouselId;
        carousel.className = "carousel slide";
        carousel.setAttribute("data-bs-ride", "carousel");

        // Indicatori
        if (restaurants.length > 1) {
            const indicators = document.createElement("div");
            indicators.className = "carousel-indicators";
            restaurants.forEach((_, idx) => {
                const btn = document.createElement("button");
                btn.type = "button";
                btn.setAttribute("data-bs-target", `#${carouselId}`);  // richiesto
                btn.setAttribute("data-bs-slide-to", String(idx));     // richiesto
                if (idx === 0) {
                    btn.classList.add("active");
                    btn.setAttribute("aria-current", "true");
                }
                btn.setAttribute("aria-label", `Slide ${idx + 1}`);
                indicators.appendChild(btn);
            });
            carousel.appendChild(indicators);
        }

        // Contenitore items
        const inner = document.createElement("div");
        inner.className = "carousel-inner";

        // Genera items
        const defaultImg = "images/images.png";
        let renderedCount = 0;
        restaurants.forEach((rest, index) => {
            const item = document.createElement("div");
            item.className = "carousel-item";
            if (index === 0) item.classList.add("active");

        // Card come nodo DOM (meglio evitare innerHTML su elementi esterni per sicurezza)
            const card = document.createElement("div");
            card.className = "card mx-auto shadow";
            card.style.width = "20rem";
            card.style.borderRadius = "1rem";
            card.style.overflow = "hidden";

            const img = document.createElement("img");
            img.className = "card-img-top";
            img.alt = rest.RestaurantName || "Ristorante";
            img.src = rest.photo_url || defaultImg;

            const cardBody = document.createElement("div");
            cardBody.className = "card-body text-center";

            const h5 = document.createElement("h5");
            h5.className = "card-title";
            h5.textContent = rest.RestaurantName || "Senza nome";

            const pAddr = document.createElement("p");
            pAddr.className = "card-text mb-2";
            pAddr.textContent = rest.address || "";

            const pRating = document.createElement("p");
            pRating.className = "text-warning mb-2";
            pRating.textContent = `⭐ ${(typeof rest.rating === 'number') ? rest.rating.toFixed(1) : "N/A"}`;

            const pMeta = document.createElement("p");
            pMeta.className = "text-muted small mb-3";
            pMeta.textContent = `Prezzo: ${rest.price_level ?? "-"} | Tel: ${rest.phone_number ?? "N/D"}`;

            const btn = document.createElement("button");
            btn.className = "btn btn-outline-danger unlike-btn";
            btn.setAttribute("data-id", rest.RestaurantID);
            btn.innerHTML = `<i class="bi bi-hand-thumbs-down"></i> Rimuovi`;

            // monta la card
            cardBody.appendChild(h5);
            cardBody.appendChild(pAddr);
            cardBody.appendChild(pRating);
            cardBody.appendChild(pMeta);
            cardBody.appendChild(btn);

            card.appendChild(img);
            card.appendChild(cardBody);

            item.appendChild(card);
            inner.appendChild(item);
            renderedCount++;
        });

        carousel.appendChild(inner);

        // Controlli Prev/Next (solo se >1)
        if (restaurants.length > 1) {
            const prevBtn = document.createElement("button");
            prevBtn.className = "carousel-control-prev";
            prevBtn.type = "button";
            prevBtn.setAttribute("data-bs-target", `#${carouselId}`);
            prevBtn.setAttribute("data-bs-slide", "prev");
            prevBtn.innerHTML = `<span class="carousel-control-prev-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Precedente</span>`;

            const nextBtn = document.createElement("button");
            nextBtn.className = "carousel-control-next";
            nextBtn.type = "button";
            nextBtn.setAttribute("data-bs-target", `#${carouselId}`);
            nextBtn.setAttribute("data-bs-slide", "next");
            nextBtn.innerHTML = `<span class="carousel-control-next-icon" aria-hidden="true"></span>
                                <span class="visually-hidden">Successivo</span>`;

            carousel.appendChild(prevBtn);
            carousel.appendChild(nextBtn);
        }

        carouselWrapper.appendChild(carousel);
        container.appendChild(carouselWrapper);

        // Funzione per inizializzare (safe)
    
        this.initCarousel();

        // Listener sui bottoni unlike
        container.querySelectorAll(".unlike-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const restaurantId = e.currentTarget.getAttribute("data-id");
                console.log("Ristorante da rimuovere:", restaurantId);
                // this.controller.unlikeRestaurant(restaurantId) oppure dispatch evento
            });
        });
    }

    //metodo per inizializzare il carosello
    initCarousel() {
        const carouselElem = document.getElementById(carouselId);
        if (!carouselElem) {
            console.warn('[CAROUSEL DEBUG] carouselElem non trovato al momento dell\'init.');
            return false;
        }
        if (typeof bootstrap !== 'undefined' && bootstrap.Carousel) {
            try {
                // distruggi eventuale istanza precedente
                if (carouselElem._bootstrapInstance) {
                    try { carouselElem._bootstrapInstance.dispose(); } catch(e) {}
                }
                const inst = new bootstrap.Carousel(carouselElem, { interval: false, ride: false });
                carouselElem._bootstrapInstance = inst; // riferimento per eventuale dispose futuro
                console.log('[CAROUSEL DEBUG] Bootstrap.Carousel inizializzato (autoplay disattivato).');
                return true;
            } catch (e) {
                console.warn('[CAROUSEL DEBUG] Errore inizializzazione Bootstrap.Carousel:', e);
                return false;
            }
        }
        return false;
    }
}
