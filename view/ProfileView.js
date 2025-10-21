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

    }

    // Metodo chiamato dal controller per disegnare le recensioni
    displayReviews(reviews) {
        const container = document.getElementById('reviews-container');
        container.innerHTML = '';

        reviews.forEach((review, index) => {
            const card = document.createElement('div');
            card.className = 'col-md-6';
            card.innerHTML = `
                <div class="card p-3">
                    <h5>${review.restaurantName}</h5>
                    <div class="mb-2">
                        <label>Rating:</label>
                        <input type="number" min="0" max="5" value="${review.rating}" id="rating-${index}" class="form-control w-25 d-inline-block">
                    </div>
                    <div class="mb-2">
                        <label>Testo:</label>
                        <textarea class="form-control" id="text-${index}">${review.text}</textarea>
                    </div>
                    <div class="d-flex justify-content-between align-items-center mt-2">
                        <small class="text-muted">Ultimo aggiornamento: ${new Date(review.time).toLocaleString()}</small>
                        <button class="btn btn-primary btn-sm" id="save-${index}">Salva</button>
                    </div>
                </div>
            `;
            container.appendChild(card);

            document.getElementById(`save-${index}`).addEventListener('click', async () => {
                const newText = document.getElementById(`text-${index}`).value;
                const newRating = parseInt(document.getElementById(`rating-${index}`).value);
                review.update({ text: newText, rating: newRating });
                await this.controller.updateReview(review);
            });
        });
    }

}
