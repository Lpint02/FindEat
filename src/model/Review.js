export default class Review {
    constructor({
        authorID = '',
        restaurantID = '',
        restaurantName = '',
        author_name = '',
        language = 'it',
        original_language = 'it',
        rating = 0,
        text = '',
        time = new Date().toISOString(),
        translated = false
    } = {}) {
        this.authorID = authorID;
        this.restaurantID = restaurantID;
        this.restaurantName = restaurantName;
        this.author_name = author_name;
        this.language = language;
        this.original_language = original_language;
        this.rating = rating;
        this.text = text;
        this.time = time;
        this.translated = translated;
    }  // se non fornito, usa valori di default {}

    // Aggiorna testo e rating
    update({ text, rating }) {
        this.text = text;
        this.rating = rating;
        this.time = new Date().toISOString(); // aggiorna timestamp
    }

    // Converte il model nel payload Firestore richiesto dalla collection "Reviews"
    toFirestorePayload() {
        return {
            AuthorID: this.authorID,
            RestaurantID: this.restaurantID,
            RestaurantName: this.restaurantName,
            author_name: this.author_name,
            language: this.language,
            original_language: this.original_language,
            rating: this.rating,
            text: this.text,
            time: this.time,
            translated: !!this.translated
        };
    }
}