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

}
