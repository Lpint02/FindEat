import { renderOpeningHoursHTML } from './hoursRenderer.js';
import { renderStars } from './stars.js';
import { bindDetailPanelEvents } from './events.js';

let photosArray = [];
let currentPhotoIndex = 0;

function showPhoto(index) {
  const img = document.getElementById('dpCurrentPhoto');
  if (!img || photosArray.length === 0) return;
  currentPhotoIndex = (index + photosArray.length) % photosArray.length;
  img.src = photosArray[currentPhotoIndex];
}

export function renderDetailPanel(data, fallbackName, el) {
  const detailView = document.getElementById('detailView');
  const listView = document.getElementById('listView');
  if (!detailView || !listView) return;

  // Switch visibilità
  listView.classList.add('hidden');
  detailView.classList.remove('hidden');
  // Applica layout 60/40 in modalità dettaglio
  document.body.classList.add('detail-mode');
  // Nascondi banner status sopra la mappa quando si entra nei dettagli
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.style.display = 'none';

  // Header (nome + distanza + stato apertura)
  const titleEl = document.getElementById('dpTitle');
  const baseName = data?.name || fallbackName || (el?.tags?.name ?? 'Dettagli ristorante');
  // Badge aperto/chiuso: usa data.open_now salvato oppure opening_hours.open_now
  let openBadge = '';
  const openNow = (data?.open_now !== undefined ? data.open_now : (data?.opening_hours?.open_now));
  if (openNow !== undefined) {
    openBadge = `<span class="open-badge ${openNow ? 'open' : 'closed'}">${openNow ? 'Aperto' : 'Chiuso'}</span>`;
  }
  titleEl.innerHTML = `${baseName} ${openBadge}`;

  // Foto
  const img = document.getElementById('dpCurrentPhoto');
  const noPhotoMsg = document.getElementById('dpNoPhotoMsg');
  photosArray = data?.photos || [];
  if (photosArray.length) {
    img.style.display = 'block';
    noPhotoMsg.style.display = 'none';
    showPhoto(0);
  } else {
    img.style.display = 'none';
    noPhotoMsg.style.display = 'block';
    img.src = '';
  }

  // Costruisci struttura arricchita
  const detailsEl = document.getElementById('dpDetails');
  const tags = el?.tags || {};
  const g = data || {};

  const distanceKm = typeof el.__distanceKm === 'number' ? `${el.__distanceKm.toFixed(1)} km` : null;
  const price = g.price_level != null ? '€'.repeat(g.price_level || 1) : null;
  const rating = g.rating != null ? g.rating.toFixed(1) : null;
  const totalRatings = g.user_ratings_total != null ? g.user_ratings_total : null;
  const addr = g.formatted_address || null;
  const phone = g.international_phone_number || tags.phone || null;
  const website = g.website || tags.website || null;
  const cuisine = tags.cuisine || null;
  const wheelchair = (g.wheelchair_accessible_entrance || tags.wheelchair === 'yes') ? '♿ Accessibile' : null;
  const outdoor = tags.outdoor_seating === 'yes' ? '🌤️ Esterno' : null;
    const smoking = tags.smoking === 'yes' ? '🚬 Fumatori' : (tags.smoking === 'no' ? '🚭 Non fumatori' : null);
  const vegetarian = g.serves_vegetarian_food ? '🥦 Veg options' : null;
  const breakfast = g.serves_breakfast ? '🍳 Colazione' : null;
  const lunch = g.serves_lunch ? '🍝 Pranzo' : null;
  const dinner = g.serves_dinner ? '🍽️ Cena' : null;
  const dineIn = g.dine_in === false ? null : '🪑 Sala';
  const delivery = g.delivery ? '🚚 Delivery' : null;
  const takeout = g.takeout ? '🥡 Asporto' : null;
  const reservable = g.reservable ? '📅 Prenotabile' : null;
  const email = tags.email ? `✉️ ${tags.email}` : null;
  const facebook = tags['contact:facebook'] ? `ⓕ Facebook` : null;
  const instagram = tags['contact:instagram'] ? `📸 Instagram` : null;
  // Diete (es: vegan/vegetarian/gluten_free) -> chip
  const dietVegan = tags['diet:vegan'] === 'yes' ? '🌱 Vegan' : null;
  const dietVegetarian = tags['diet:vegetarian'] === 'yes' ? '🥗 Vegetarian' : null;
  const dietGlutenFree = tags['diet:gluten_free'] === 'yes' ? '🚫🌾 Gluten-free' : null;
  // Pagamenti (solo se noti)
  const cards = (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') ? '💳 Carte' : null;
  const cash = tags['payment:cash'] === 'no' ? null : (tags['payment:cash'] === 'yes' ? '💶 Contanti' : null);

  const chipMeta = [
    { label: distanceKm, cat: 'meta' },
    { label: price, cat: 'meta' },
    { label: wheelchair, cat: 'access' },
    { label: vegetarian, cat: 'diet' },
    { label: breakfast, cat: 'service' },
    { label: lunch, cat: 'service' },
    { label: dinner, cat: 'service' },
    { label: outdoor, cat: 'service' },
    { label: smoking, cat: 'service' },
    { label: dineIn, cat: 'service' },
    { label: delivery, cat: 'service' },
    { label: takeout, cat: 'service' },
    { label: reservable, cat: 'service' },
    { label: dietVegan, cat: 'diet' },
    { label: dietVegetarian, cat: 'diet' },
    { label: dietGlutenFree, cat: 'diet' },
    { label: cards, cat: 'pay' },
    { label: cash, cat: 'pay' }
  ];
  const chips = chipMeta.filter(o => o.label).map(o => `<span class="chip" data-cat="${o.cat}">${o.label}</span>`).join('');

  // ratingNumber sarà mostrato nella header delle recensioni, qui conserviamo eventuale price come chip
  const ratingBlock = ''; // rimosso blocco principale per evitare duplicato / undefined

  const contactLines = [
    addr ? `<div class="fact"><span class="icon">📍</span><span>${addr}</span></div>` : '',
    phone ? `<div class="fact"><span class="icon">📞</span><span>${phone}</span></div>` : '',
    website ? `<div class="fact"><span class="icon">🔗</span><a href="${website}" target="_blank" rel="noopener">Sito</a></div>` : '',
    email ? `<div class="fact"><span class="icon">✉️</span><span>${email.replace('✉️ ','')}</span></div>` : '',
    facebook ? `<div class="fact"><span class="icon">ⓕ</span><span>${facebook.replace('ⓕ ','')}</span></div>` : '',
    instagram ? `<div class="fact"><span class="icon">📸</span><span>${instagram.replace('📸 ','')}</span></div>` : '',
    cuisine ? `<div class="fact"><span class="icon">🍽️</span><span>${cuisine}</span></div>` : ''
  ].filter(Boolean).join('');

  const hoursSource = g.opening_hours_weekday_text || g.opening_hours || tags.opening_hours;
  const hoursHtml = hoursSource ? `<div class="hours-block">${renderOpeningHoursHTML(hoursSource)}</div>` : '';

  const editorial = g.editorial_summary?.overview ? `<div class="editorial"><p>${g.editorial_summary.overview}</p></div>` : '';

  detailsEl.innerHTML = `
    <section class="chips-section">${chips}</section>
    <section class="card info-card">
      <h3 class="card-title">Info</h3>
      <div class="facts-grid">${contactLines}</div>
    </section>
    ${hoursHtml ? `<section class="card hours-card">${hoursHtml}</section>` : ''}
    ${editorial ? `<section class="card editorial-card">${editorial}</section>` : ''}
  `;

  // Stelle (riusa blocco esistente - mantiene compatibilità se usato altrove)
  renderStars(g?.rating, 'dpStars');
  const ratingNumEl = document.getElementById('dpRatingNumber');
  if (ratingNumEl) {
    ratingNumEl.textContent = rating ? rating : '';
  }

  // Recensioni
  const reviewsListEl = document.getElementById('dpReviewsList');
  const reviewsCount = document.getElementById('dpReviewsCount');
  reviewsListEl.innerHTML = '';
  if (data?.reviews?.length) {
    data.reviews.forEach(r => {
      const div = document.createElement('div');
      div.className = 'review';
      div.innerHTML = `<strong>${r.author_name || 'Anonimo'}</strong> ${r.rating ? ` - ⭐ ${r.rating}` : ''}<div>${r.text || ''}</div>`;
      reviewsListEl.appendChild(div);
    });
    reviewsCount.textContent = `(${data.reviews.length})`;
  } else {
    reviewsListEl.innerHTML = '<div class="review">Nessuna recensione disponibile.</div>';
    reviewsCount.textContent = '';
  }

  // Bind azioni tramite binder esterno (evita duplicazioni)
  bindDetailPanelEvents({
    onPrev: () => showPhoto(currentPhotoIndex - 1),
    onNext: () => showPhoto(currentPhotoIndex + 1),
    onBack: () => showListPanel()
  });
}

export function showListPanel() {
  const detailView = document.getElementById('detailView');
  const listView = document.getElementById('listView');
  if (!detailView || !listView) return;
  detailView.classList.add('hidden');
  listView.classList.remove('hidden');
  // Ripristina layout 50/50 quando si torna alla lista
  document.body.classList.remove('detail-mode');
  // Ripristina banner status quando si torna alla lista
  const statusDiv = document.getElementById('status');
  if (statusDiv) statusDiv.style.display = '';
}
