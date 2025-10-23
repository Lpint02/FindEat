
export default class DetailsView {
    constructor(controller = null) {
        this.controller = controller;
        this._photosArray = [];
        this._currentPhotoIndex = 0;
        this._detailBindingsInitialized = false;
        this._savedReviewsHtml = null;
    }
    setController(ctrl) { this.controller = ctrl; }
    // La view mostra i dettagli
  showDetails(data, fallbackName, el) {
    const detailView = document.getElementById('detailView');
    const listView = document.getElementById('listView');
    const filtersBar = document.getElementById('filtersBar');
    if (!detailView || !listView) return;
    listView.classList.add('hidden');
    detailView.classList.remove('hidden');
    if (filtersBar) filtersBar.classList.add('hidden');
    document.body.classList.add('detail-mode');
    const statusDiv = document.getElementById('status');
    if (statusDiv) statusDiv.style.display = 'none';

  const titleEl = document.getElementById('dpTitle');
  const baseName = data?.name || fallbackName || (el?.name ?? el?.tags?.name ?? 'Dettagli ristorante');
    let openBadge = '';
    const openNow = (data?.open_now !== undefined ? data.open_now : (data?.opening_hours?.open_now));
    if (openNow !== undefined) {
      openBadge = `<span class="open-badge ${openNow ? 'open' : 'closed'}">${openNow ? 'Aperto' : 'Chiuso'}</span>`;
    }
    titleEl.innerHTML = `${baseName} ${openBadge}`;

    const img = document.getElementById('dpCurrentPhoto');
    const noPhotoMsg = document.getElementById('dpNoPhotoMsg');
    this._photosArray = data?.photos || [];
    if (this._photosArray.length) {
      img.style.display = 'block';
      noPhotoMsg.style.display = 'none';
      this._showPhoto(0);
    } else {
      img.style.display = 'none';
      noPhotoMsg.style.display = 'block';
      img.src = '';
    }

    const detailsEl = document.getElementById('dpDetails');
    const tags = el?.tags || {};
    const g = data || {};
    const distanceKm = typeof el?.distanceKm === 'number' ? `${el.distanceKm.toFixed(1)} km` : null;
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
    const dietVegan = tags['diet:vegan'] === 'yes' ? '🌱 Vegan' : null;
    const dietVegetarian = tags['diet:vegetarian'] === 'yes' ? '🥗 Vegetarian' : null;
    const dietGlutenFree = tags['diet:gluten_free'] === 'yes' ? '🚫🌾 Gluten-free' : null;
    const cards = (tags['payment:cards'] === 'yes' || tags['payment:credit_cards'] === 'yes') ? '💳 Carte' : null;
    const cash = tags['payment:cash'] === 'no' ? null : (tags['payment:cash'] === 'yes' ? '💶 Contanti' : null);

    const chipMeta = [
      { label: distanceKm, cat: 'meta' }, { label: price, cat: 'meta' },
      { label: wheelchair, cat: 'access' }, { label: vegetarian, cat: 'diet' },
      { label: breakfast, cat: 'service' }, { label: lunch, cat: 'service' }, { label: dinner, cat: 'service' },
      { label: outdoor, cat: 'service' }, { label: smoking, cat: 'service' }, { label: dineIn, cat: 'service' },
      { label: delivery, cat: 'service' }, { label: takeout, cat: 'service' }, { label: reservable, cat: 'service' },
      { label: dietVegan, cat: 'diet' }, { label: dietVegetarian, cat: 'diet' }, { label: dietGlutenFree, cat: 'diet' },
      { label: cards, cat: 'pay' }, { label: cash, cat: 'pay' }
    ];
    // Likes count chip (show even if zero so position is stable)
    const likesCount = Array.isArray(g?.liked) ? g.liked.length : (Array.isArray(el?.liked) ? el.liked.length : 0);
    chipMeta.unshift({ label: `${likesCount} ❤️`, cat: 'meta', id: 'dpLikeChip' });
    const chips = chipMeta.filter(o => o.label !== null && o.label !== undefined).map(o => {
      const idAttr = o.id ? ` id="${o.id}"` : '';
      return `<span class="chip" data-cat="${o.cat}"${idAttr}>${o.label}</span>`;
    }).join('');
    const contactLines = [
      addr ? `<div class="fact"><span class="icon">📍</span><span class="fact-text">${addr}</span></div>` : '',
      phone ? `<div class="fact"><span class="icon">📞</span><span class="fact-text">${phone}</span></div>` : '',
      website ? `<div class="fact"><span class="icon">🔗</span><a href="${website}" target="_blank" rel="noopener" style="font-size: 18px;">Sito Web</a></div>` : '',
      email ? `<div class="fact"><span class="icon">✉️</span><span class="fact-text">${email.replace('✉️ ','')}</span></div>` : '',
      facebook ? `<div class="fact"><span class="icon">ⓕ</span><span class="fact-text">${facebook.replace('ⓕ ','')}</span></div>` : '',
      instagram ? `<div class="fact"><span class="icon">📸</span><span class="fact-text">${instagram.replace('📸 ','')}</span></div>` : '',
      cuisine ? `<div class="fact"><span class="icon">🍽️</span><span class="fact-text">${cuisine}</span></div>` : ''
    ].filter(Boolean).join('');

    const hoursSource = g.opening_hours_weekday_text || g.opening_hours || tags.opening_hours;
    const hoursHtml = hoursSource ? `<div class="hours-block">${this.renderOpeningHoursHTML(hoursSource)}</div>` : '';
    const editorial = g.editorial_summary?.overview ? `<div class="editorial"><p>${g.editorial_summary.overview}</p></div>` : '';

    detailsEl.innerHTML = `
      <section class="chips-section">${chips}</section>
      <section class="card info-card">
        <h3 class="card-title">Info</h3>
        <div class="facts-grid">${contactLines}</div>
      </section>
      ${hoursHtml ? `<section class=\"card hours-card\">${hoursHtml}</section>` : ''}
      ${editorial ? `<section class=\"card editorial-card\">${editorial}</section>` : ''}
    `;

    this._renderStars(g?.rating, 'dpStars');
    const ratingNumEl = document.getElementById('dpRatingNumber');
    if (ratingNumEl) ratingNumEl.textContent = rating ? rating : '';

    const reviewsListEl = document.getElementById('dpReviewsList');
    const reviewsCount = document.getElementById('dpReviewsCount');
    reviewsListEl.innerHTML = '';
    if (Array.isArray(data?.reviews) && data.reviews.length) {
      data.reviews.forEach(r => {
        const name = r.author_name || 'Anonimo';
        const url = r.author_url || null;
        const avatar = r.profile_photo_url || '';
        const rating = (typeof r.rating === 'number' && isFinite(r.rating)) ? r.rating : null;
        const rounded = rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : null;
        const relTime = r.relative_time_description || '';
        const text = r.text || '';

        const starsHtml = this._buildReviewStars(rating);
        const nameHtml = url ? `<a href="${url}" target="_blank" rel="noopener" class="review-author">${name}</a>`
                             : `<span class="review-author">${name}</span>`;
        const avatarHtml = avatar ? `<img class="review-avatar" src="${avatar}" alt="Foto profilo di ${name}">`
                                  : `<div class="review-avatar fallback" aria-hidden="true">👤</div>`;
        const rightCluster = (rounded != null)
          ? `<div class="review-stars">${starsHtml}<span class="review-rating-number">(${rounded})</span></div>`
          : '';

        const div = document.createElement('div');
        div.className = 'review';
        div.innerHTML = `
          <div class="review-header">
            <div class="review-id">
              ${avatarHtml}
              <div class="review-header-text">
                ${nameHtml}
                ${relTime ? `<div class="review-time">${relTime}</div>` : ''}
              </div>
            </div>
            ${rightCluster}
          </div>
          <div class="review-text">${text}</div>
        `;
        reviewsListEl.appendChild(div);
      });
      reviewsCount.textContent = `(${data.reviews.length})`;
    } else {
      reviewsListEl.innerHTML = '<div class="review">Nessuna recensione disponibile.</div>';
      reviewsCount.textContent = '';
    }

    // Ensure the detail panel UI bindings (like, prev/next, keyboard) are attached once.
    // Prepare current detail context for persistence actions (like)
    try {
      const raw = el?.raw ?? el;
      const docId = raw ? `osm_${raw.type}_${raw.id}` : null;
      const minimalPayload = {
        name: data?.name || fallbackName || raw?.tags?.name || null,
        placeId: data?.placeId || null,
        formatted_address: data?.formatted_address || null,
        international_phone_number: data?.international_phone_number || null,
        cuisine: (el?.tags?.cuisine) || null,
        location: (data?.location || (raw && raw.lat && raw.lon ? { lat: raw.lat, lng: raw.lon } : null)),
        savedAt: data?.savedAt || new Date().toISOString()
      };
      this._currentDetail = { docId, payload: minimalPayload, rawEl: el, data };
    } catch (e) { console.warn('Unable to compute current detail context for like toggling', e); }
    this.bindDetailPanelEventsOnce();
    // Reset like button state synchronously to avoid propagation of previous optimistic toggles
    try {
      const likeBtn = document.getElementById('dpLikeBtn');
      const sp = likeBtn?.querySelector('span');
      if (likeBtn) {
        likeBtn.classList.remove('liked');
        if (sp) sp.textContent = '♡';
      }
      // Async: fetch authoritative like state and update UI
      (async () => {
        try {
          const ctx = this._currentDetail || {};
          const docId = ctx.docId;
          if (!docId || !this.controller || typeof this.controller.isRestaurantLikedByCurrentUser !== 'function') return;
          const liked = await this.controller.isRestaurantLikedByCurrentUser(docId);
          if (likeBtn) {
            if (liked) { likeBtn.classList.add('liked'); if (sp) sp.textContent = '♥'; }
            else { likeBtn.classList.remove('liked'); if (sp) sp.textContent = '♡'; }
          }
          // Update likes chip with server value
          if (this.controller && typeof this.controller.getSavedRestaurant === 'function') {
            const saved = await this.controller.getSavedRestaurant(docId);
            const likeChip = document.getElementById('dpLikeChip');
            const likesCount = Array.isArray(saved?.liked) ? saved.liked.length : 0;
            if (likeChip) { likeChip.textContent = `${likesCount} ❤️`; }
          }
        } catch (e) { console.warn('Error refreshing like state', e); }
      })();
    } catch(e) { /* ignore */ }
  }

    // Bind degli eventi del pannello dettagli (UI only). Chiama il controller per le azioni di navigazione.
  bindDetailPanelEventsOnce() {
    if (this._detailBindingsInitialized) return;
    this._detailBindingsInitialized = true;

    // Like button
    const likeBtn = document.getElementById('dpLikeBtn');
    if (likeBtn && !likeBtn.__bound) {
      if (!likeBtn.querySelector('span')) {
        likeBtn.textContent = '';
        const sp = document.createElement('span');
        sp.textContent = '♡';
        likeBtn.appendChild(sp);
      }
      likeBtn.addEventListener('click', async () => {
        // optimistic UI toggle
        const sp = likeBtn.querySelector('span');
        likeBtn.classList.toggle('liked');
        if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';

        // call controller to persist (controller.toggleLike must exist)
        try {
          const ctx = this._currentDetail || {};
          const docId = ctx.docId;
          const payload = ctx.payload || ctx.data || null;
          if (!docId) {
            console.warn('No docId available for like toggle');
            return;
          }
          if (!this.controller || typeof this.controller.toggleLike !== 'function') {
            console.warn('Controller.toggleLike not found');
            return;
          }
          const res = await this.controller.toggleLike(docId, payload);
          const likeChip = document.getElementById('dpLikeChip');
          if (!res || !res.ok) {
            // revert UI
            likeBtn.classList.toggle('liked');
            if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
            console.warn('toggleLike failed', res?.error);
          } else {
            // ensure final UI matches server and update likes chip
            if (res.liked) {
              likeBtn.classList.add('liked');
              if (sp) sp.textContent = '♥';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${cur + 1} ❤️`;
              }
            } else {
              likeBtn.classList.remove('liked');
              if (sp) sp.textContent = '♡';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${Math.max(0, cur - 1)} ❤️`;
              }
            }
          }
        } catch (e) {
          console.error('Error toggling like', e);
          // revert optimistic UI
          likeBtn.classList.toggle('liked');
          if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
        }
      });
      likeBtn.__bound = true;
    }

    // Prev/Next buttons
    const prevBtn = document.getElementById('dpPrevPhoto');
    if (prevBtn && !prevBtn.__bound) {
      prevBtn.addEventListener('click', () => this.controller?.onPrevPhoto && this.controller.onPrevPhoto());
      prevBtn.__bound = true;
    }
    const nextBtn = document.getElementById('dpNextPhoto');
    if (nextBtn && !nextBtn.__bound) {
      nextBtn.addEventListener('click', () => this.controller?.onNextPhoto && this.controller.onNextPhoto());
      nextBtn.__bound = true;
    }

    // Keyboard shortcuts (global once)
    if (!window.__dp_kb_bound) {
      document.addEventListener('keydown', (e) => {
        const detailView = document.getElementById('detailView');
        if (!detailView || detailView.classList.contains('hidden')) return;

        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          this.controller?.onPrevPhoto && this.controller.onPrevPhoto();
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          this.controller?.onNextPhoto && this.controller.onNextPhoto();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          if (this.controller?.onBack) this.controller.onBack(); else document.getElementById('dpBackToList')?.click();
        } else if (e.key === 'l' || e.key === 'L') {
          // Toggle like
          document.getElementById('dpLikeBtn')?.click();
        }
      });
      window.__dp_kb_bound = true;
    }

    // Add review button -> opens inline form replacing the reviews list
    const addBtn = document.getElementById('dpAddReviewBtn');
    if (addBtn && !addBtn.__bound) {
      addBtn.addEventListener('click', () => this._showAddReviewForm());
      addBtn.__bound = true;
    }
  }

  // Renders an inline form in place of reviews list. Placeholder only: name fixed, cancel works; save not implemented.
  _showAddReviewForm() {
    const listEl = document.getElementById('dpReviewsList');
    if (!listEl) return;

    // Save current HTML to restore on cancel
    if (this._savedReviewsHtml == null) this._savedReviewsHtml = listEl.innerHTML;

    // Build a simple form UI
    listEl.innerHTML = `
      <form id="addReviewForm" class="add-review-form" onsubmit="return false;">
        <div class="arf-row">
          <label>Nome</label>
          <input type="text" id="arfName" value="nome" disabled />
        </div>
        <div class="arf-row">
          <label>Voto</label>
          <div class="arf-stars" id="arfStars" role="radiogroup" aria-label="Seleziona voto in stelle">
            ${[1,2,3,4,5].map(i => `<button type="button" class="arf-star" data-value="${i}" aria-label="${i} stelle">★</button>`).join('')}
          </div>
          <input type="number" id="arfRating" min="1" max="5" step="1" placeholder="1-5" inputmode="numeric" aria-label="Voto numerico" />
        </div>
        <div class="arf-row">
          <label>Commento (facoltativo)</label>
          <textarea id="arfText" rows="3" placeholder="Scrivi qui la tua esperienza (opzionale)"></textarea>
        </div>
        <div class="arf-actions">
          <button type="button" id="arfCancel" class="btn-secondary">Annulla</button>
          <button type="button" id="arfSave" class="btn-primary" disabled>Salva</button>
        </div>
      </form>
    `;

    // State
    let currentRating = null;
    const stars = Array.from(listEl.querySelectorAll('.arf-star'));
    const ratingInput = listEl.querySelector('#arfRating');

    const renderStars = () => {
      stars.forEach((s, idx) => {
        const active = currentRating != null && idx < currentRating;
        s.classList.toggle('active', !!active);
        s.style.color = active ? '#FFD54A' : '#ddd';
      });
      // Enable save only when a rating is selected (name fixed; text optional)
      const saveBtn = listEl.querySelector('#arfSave');
      if (saveBtn) saveBtn.disabled = (currentRating == null);
    };

    // Star click -> set rating
    stars.forEach((btn) => {
      btn.addEventListener('click', () => {
        const v = parseInt(btn.getAttribute('data-value'), 10);
        currentRating = (v >= 1 && v <= 5) ? v : null;
        ratingInput.value = currentRating != null ? String(currentRating) : '';
        renderStars();
      });
    });

    // Numeric input -> update stars
    ratingInput.addEventListener('input', () => {
      const v = parseInt(ratingInput.value, 10);
      if (!isNaN(v) && v >= 1 && v <= 5) currentRating = v; else currentRating = null;
      renderStars();
    });

    // Cancel -> restore previous list content
    const cancelBtn = listEl.querySelector('#arfCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', () => {
      if (this._savedReviewsHtml != null) {
        listEl.innerHTML = this._savedReviewsHtml;
        this._savedReviewsHtml = null;
      } else {
        listEl.innerHTML = '';
      }
    });

    // Save (placeholder: not active yet)
    const saveBtn = listEl.querySelector('#arfSave');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      // Non implementato per ora. Potremo inviare al controller per persistenza.
      // Intenzionalmente vuoto.
    });

    // Initial paint
    renderStars();
  }

  _showPhoto(index) {
    const img = document.getElementById('dpCurrentPhoto');
    const noPhotoMsg = document.getElementById('dpNoPhotoMsg');
    if (!img || !this._photosArray || this._photosArray.length === 0) return;
    this._currentPhotoIndex = (index + this._photosArray.length) % this._photosArray.length;
    // Gestione fallback: se l'URL photo Google ritorna 403/errore, mostra messaggio "Nessuna foto".
    img.onload = () => { img.style.display = 'block'; if (noPhotoMsg) noPhotoMsg.style.display = 'none'; };
    img.onerror = () => { img.style.display = 'none'; if (noPhotoMsg) noPhotoMsg.style.display = 'block'; };
    img.src = this._photosArray[this._currentPhotoIndex];
  }

    // Public API: navigate photos from controller
    prevPhoto() {
    if (!this._photosArray || this._photosArray.length === 0) return;
    this._showPhoto(this._currentPhotoIndex - 1);
    }

    nextPhoto() {
    if (!this._photosArray || this._photosArray.length === 0) return;
    this._showPhoto(this._currentPhotoIndex + 1);
    }
  // Helpers per stelle/orari/foto
  _renderStars(value, containerId = 'stars') {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (value == null) return;
    const full = Math.floor(value);
    const half = (value - full) >= 0.5;
    for (let i = 0; i < 5; i++) {
      const span = document.createElement('span');
      span.className = 'star';
      if (i < full) { span.innerText = '★'; span.style.color = '#FFD54A'; }
      else if (i === full && half) {
        span.innerText = '★';
        span.style.background = 'linear-gradient(90deg,#FFD54A 50%, #ddd 50%)';
        span.style.WebkitBackgroundClip = 'text';
        span.style.backgroundClip = 'text';
        span.style.color = 'transparent';
      } else { span.innerText = '★'; span.style.color = '#ddd'; }
      container.appendChild(span);
    }
  }

  renderOpeningHoursHTML(opening) {
    if (!opening) return '';
    let lines = [];
    if (Array.isArray(opening)) lines = opening.slice();
    else if (typeof opening === 'string') lines = opening.includes('|') ? opening.split('|').map(s => s.trim()).filter(Boolean) : opening.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    const dayMap = {};
    lines.forEach(l => { const idx = l.indexOf(':'); if (idx > -1) dayMap[l.slice(0, idx).trim()] = l.slice(idx + 1).trim(); });
    const daysOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
    const displayNames = { 'Monday':'Lun','Tuesday':'Mar','Wednesday':'Mer','Thursday':'Gio','Friday':'Ven','Saturday':'Sab','Sunday':'Dom' };
    const variants = {
      'Monday': ['Monday','Mon','Luned','Lunedì','Lunedi','Lun'],
      'Tuesday': ['Tuesday','Tue','Mart','Martedì','Martedi','Mar'],
      'Wednesday': ['Wednesday','Wed','Mercoledì','Mercoledi','Mer'],
      'Thursday': ['Thursday','Thu','Giovedì','Giovedi','Gio'],
      'Friday': ['Friday','Fri','Venerdì','Venerdi','Ven'],
      'Saturday': ['Saturday','Sat','Sabato','Sab'],
      'Sunday': ['Sunday','Sun','Domenica','Dom']
    };
    const todayIndex = new Date().getDay();
    const todayKey = todayIndex === 0 ? 'Sunday' : daysOrder[todayIndex - 1];
    const boxes = daysOrder.map(day => {
      let found = null;
      for (const k in dayMap) {
        for (const v of variants[day]) { if (k.toLowerCase().startsWith(v.toLowerCase())) { found = dayMap[k]; break; } }
        if (found) break;
      }
      let display = 'Chiuso';
      if (found) display = /chiuso|closed/i.test(found) ? 'Chiuso' : found.replace(/–/g,'-');
      const todayClass = day === todayKey ? ' today' : '';
      return `<div class="hours-box${todayClass}"><div class="hours-day">${displayNames[day]}</div><div class="hours-interval">${display}</div></div>`;
    }).join('');
    return `<div class="hours-grid">${boxes}</div>`;
  }

  

  // Build 5-star inline HTML for a numeric rating (round to nearest whole star)
  _buildReviewStars(value) {
    const r = (typeof value === 'number' && isFinite(value)) ? Math.max(0, Math.min(5, Math.round(value))) : 0;
    let html = '';
    for (let i = 1; i <= 5; i++) {
      html += `<span class="star ${i <= r ? 'on' : 'off'}">★</span>`;
    }
    return html;
  }

}