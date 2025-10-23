export default class DetailsView {
    constructor(controller = null) {
        this.controller = controller;
        this._photosArray = [];
        this._currentPhotoIndex = 0;
        this._detailBindingsInitialized = false;
        this._savedReviewsHtml = null;
        this._userReviews = [];
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

    // Reset any previous detail content to avoid stacking between restaurants
    this._savedReviewsHtml = null;
    this._userReviews = [];
    const detailsEl = document.getElementById('dpDetails');
    if (detailsEl) {
      while (detailsEl.firstChild) detailsEl.removeChild(detailsEl.firstChild);
    }

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

  // detailsEl already cleared above
    
    // compact data extraction
    const tags = el?.tags || {};
    const g = data || {};
    const distanceKm = (typeof el?.distanceKm === 'number') ? `${el.distanceKm.toFixed(1)} km` : null;
    const price = (g.price_level != null) ? '€'.repeat(g.price_level || 1) : null;
    const rating = (g.rating != null) ? g.rating.toFixed(1) : null;
    const addr = g.formatted_address || null;
    const phone = g.international_phone_number || tags.phone || null;
    const website = g.website || tags.website || null;
    const cuisine = tags.cuisine || null;

    // chips
    const chipMeta = [
      { label: distanceKm, cat: 'meta' }, { label: price, cat: 'meta' }, { label: cuisine, cat: 'meta' }
    ];
    const likesCount = Array.isArray(g?.liked) ? g.liked.length : (Array.isArray(el?.liked) ? el.liked.length : 0);
    chipMeta.unshift({ label: `${likesCount} ❤️`, cat: 'meta', id: 'dpLikeChip' });
    // use chips template
    const chipsTpl = document.getElementById('dp-chips-template');
    if (chipsTpl) {
      const chipsNode = document.importNode(chipsTpl.content, true);
      const chipsSection = chipsNode.querySelector('.chips-section');
      chipMeta.forEach(c => { if (c.label != null) {
        const span = document.createElement('span'); span.className = 'chip'; span.dataset.cat = c.cat; if (c.id) span.id = c.id; span.textContent = c.label;
        chipsSection.appendChild(span);
      }});
      detailsEl.appendChild(chipsSection);
    }

    // info card
    const infoTpl = document.getElementById('dp-info-card-template');
    if (infoTpl) {
      const infoNode = document.importNode(infoTpl.content, true);
      const factsGrid = infoNode.querySelector('.facts-grid');
      const appendFact = (icon, text, isLink=false) => {
        if (!text) return;
        const div = document.createElement('div'); div.className = 'fact';
        const ic = document.createElement('span'); ic.className = 'icon'; ic.textContent = icon;
        const ft = document.createElement('span'); ft.className = 'fact-text';
        if (isLink) { const a = document.createElement('a'); a.href = text; a.target = '_blank'; a.rel='noopener'; a.textContent='Sito Web'; a.style.fontSize='18px'; ft.appendChild(a); }
        else ft.textContent = text;
        div.appendChild(ic); div.appendChild(ft); factsGrid.appendChild(div);
      };
      appendFact('📍', addr);
      appendFact('📞', phone);
      appendFact('🔗', website, !!website);
      if (tags.email) appendFact('✉️', tags.email);
      if (tags['contact:facebook']) appendFact('ⓕ', tags['contact:facebook']);
      if (tags['contact:instagram']) appendFact('📸', tags['contact:instagram']);
      if (cuisine) appendFact('🍽️', cuisine);
      detailsEl.appendChild(infoNode);
    }

    // hours (use template, renderOpeningHoursHTML returns HTML grid)
    const hoursSource = g.opening_hours_weekday_text || g.opening_hours || tags.opening_hours;
    if (hoursSource) {
      const hoursTpl = document.getElementById('dp-hours-card-template');
      if (hoursTpl) {
        const hoursNode = document.importNode(hoursTpl.content, true);
        const block = hoursNode.querySelector('.hours-block');
        block.innerHTML = this.renderOpeningHoursHTML(hoursSource);
        detailsEl.appendChild(hoursNode);
      }
    }

    // editorial
    if (g.editorial_summary?.overview) {
      const edTpl = document.getElementById('dp-editorial-template');
      if (edTpl) {
        const edNode = document.importNode(edTpl.content, true);
        edNode.querySelector('.editorial-text').textContent = g.editorial_summary.overview;
        detailsEl.appendChild(edNode);
      }
    }

    this._renderStars(g?.rating, 'dpStars');
    const ratingNumEl = document.getElementById('dpRatingNumber');
    if (ratingNumEl) ratingNumEl.textContent = rating ? rating : '';

  // Reviews: populate Google reviews using template
    const reviewsListEl = document.getElementById('dpReviewsList');
    const reviewsCount = document.getElementById('dpReviewsCount');
    while (reviewsListEl.firstChild) reviewsListEl.removeChild(reviewsListEl.firstChild);
    const reviewTpl = document.getElementById('dp-review-item-template');
    const noReviewTpl = document.getElementById('dp-no-reviews-template');
    if (Array.isArray(data?.reviews) && data.reviews.length) {
      data.reviews.forEach(r => {
        let node = reviewTpl ? document.importNode(reviewTpl.content, true).querySelector('.review') : document.createElement('div');
        if (!reviewTpl) node.className = 'review';
        // fill fields
        const name = r.author_name || 'Anonimo';
        const url = r.author_url || null;
        const avatar = r.profile_photo_url || '';
        const rating = (typeof r.rating === 'number' && isFinite(r.rating)) ? r.rating : null;
        const rounded = rating != null ? Math.max(0, Math.min(5, Math.round(rating))) : null;
        const relTime = r.relative_time_description || '';
        const text = r.text || '';

        const avatarWrap = node.querySelector('.review-avatar-wrapper');
        if (avatarWrap) {
          if (avatar) {
            const img = document.createElement('img');
            img.className = 'review-avatar';
            img.src = avatar;
            img.alt = `Foto profilo di ${name}`;
            // Se l'immagine non carica, sostituisci con l'omino fallback
            img.onerror = () => {
              try { img.remove(); } catch {}
              const fb = document.createElement('div');
              fb.className = 'review-avatar fallback';
              fb.setAttribute('aria-hidden','true');
              fb.textContent = '👤';
              avatarWrap.appendChild(fb);
            };
            avatarWrap.appendChild(img);
          } else {
            const fb = document.createElement('div');
            fb.className='review-avatar fallback';
            fb.setAttribute('aria-hidden','true');
            fb.textContent='👤';
            avatarWrap.appendChild(fb);
          }
        }
        const authorWrap = node.querySelector('.review-author-wrap');
        if (authorWrap) {
          if (url) { const a = document.createElement('a'); a.href = url; a.target='_blank'; a.rel='noopener'; a.className='review-author'; a.textContent = name; authorWrap.appendChild(a); }
          else { const s = document.createElement('span'); s.className='review-author'; s.textContent = name; authorWrap.appendChild(s); }
        }
        const timeEl = node.querySelector('.review-time'); if (timeEl) timeEl.textContent = relTime;
        const starsWrap = node.querySelector('.review-stars-wrap'); if (starsWrap) starsWrap.innerHTML = this._buildReviewStars(rating);
        const textEl = node.querySelector('.review-text'); if (textEl) textEl.textContent = text;
        reviewsListEl.appendChild(node);
      });
      if (reviewsCount) reviewsCount.textContent = `(${data.reviews.length})`;
    } else {
      if (noReviewTpl) reviewsListEl.appendChild(document.importNode(noReviewTpl.content, true));
      else { const none = document.createElement('div'); none.className='review'; none.textContent='Nessuna recensione disponibile.'; reviewsListEl.appendChild(none); }
      if (reviewsCount) reviewsCount.textContent = '';
    }

    // (fetch delle recensioni utente verrà avviato dopo che _currentDetail è stato impostato)

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
    
    // Carica e mostra le recensioni UTENTE dopo quelle di Google (ora che _currentDetail è pronto)
    (async () => {
      try {
        const ctx = this._currentDetail || {};
        const rid = ctx.docId;
        if (rid && this.controller && typeof this.controller.fetchUserReviews === 'function') {
          const userReviews = await this.controller.fetchUserReviews(rid);
          this._userReviews = Array.isArray(userReviews) ? userReviews : [];
          if (this._userReviews.length) {
            this._renderUserReviewsAppend(this._userReviews);
            const googleCount = Array.isArray(data?.reviews) ? data.reviews.length : 0;
            const reviewsCount = document.getElementById('dpReviewsCount');
            if (reviewsCount) reviewsCount.textContent = `(${googleCount + this._userReviews.length})`;
            // If current user has a review, update button label to "Modifica recensione"
            try {
              const uid = (this.controller && typeof this.controller.getCurrentUserId === 'function') ? this.controller.getCurrentUserId() : null;
              if (uid) {
                const mine = this._userReviews.find(r => (r.AuthorID || r.authorId || r.authorID) === uid);
                const addBtn2 = document.getElementById('dpAddReviewBtn');
                if (mine && addBtn2) addBtn2.textContent = 'Modifica recensione';
              }
            } catch {}
          }
        }
      } catch (e) {
        console.warn('Impossibile caricare recensioni utente', e);
      }
    })();

    // Abilita/Disabilita il bottone Aggiungi recensione in base al login (anche al primo showDetails)
    const addBtn = document.getElementById('dpAddReviewBtn');
    if (addBtn) {
      const isLogged = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
      addBtn.classList.toggle('is-disabled', !isLogged);
      addBtn.setAttribute('aria-disabled', String(!isLogged));
      if (!isLogged) addBtn.title = 'Accedi per aggiungere una recensione'; else addBtn.title = '';
      // Set initial label based on list annotation: if already reviewed, show Modifica
      try {
        if (el && el.isReviewed) addBtn.textContent = 'Modifica recensione';
        else addBtn.textContent = 'Aggiungi recensione';
      } catch {}
    }
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
        // richiede login
        const isLogged = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
        if (!isLogged) { this._showToast('Devi essere loggato per fare questo', 'error'); return; }
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
            this._showToast('Operazione non riuscita', 'error');
          } else {
            // ensure final UI matches server and update likes chip
            if (res.liked) {
              likeBtn.classList.add('liked');
              if (sp) sp.textContent = '♥';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${cur + 1} ❤️`;
              }
              this._showToast('Aggiunto ai preferiti', 'success');
            } else {
              likeBtn.classList.remove('liked');
              if (sp) sp.textContent = '♡';
              if (likeChip) {
                const cur = parseInt(likeChip.textContent, 10) || 0;
                likeChip.textContent = `${Math.max(0, cur - 1)} ❤️`;
              }
              this._showToast('Rimosso dai preferiti', 'info');
            }
          }
        } catch (e) {
          console.error('Error toggling like', e);
          // revert optimistic UI
          likeBtn.classList.toggle('liked');
          if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
          this._showToast('Errore durante il like', 'error');
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
    if (addBtn) {
      const isLogged = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
      addBtn.classList.toggle('is-disabled', !isLogged);
      addBtn.setAttribute('aria-disabled', String(!isLogged));
      if (!isLogged) addBtn.title = 'Accedi per aggiungere una recensione'; else addBtn.title = '';
      if (!addBtn.__bound) {
        addBtn.addEventListener('click', () => {
          const ok = !!(this.controller && typeof this.controller.isLoggedIn === 'function' && this.controller.isLoggedIn());
          if (!ok) { this._showToast('Devi essere loggato per fare questo', 'error'); return; }
          this._showAddReviewForm();
        });
        addBtn.__bound = true;
      }
    }
  }

  // Toast helper (namespaced CSS: fe-toast)
  _showToast(message, variant = 'success') {
    try {
      let container = document.querySelector('.fe-toast-container');
      if (!container) {
        container = document.createElement('div');
        container.className = 'fe-toast-container';
        document.body.appendChild(container);
      }
      const toast = document.createElement('div');
      toast.className = `fe-toast fe-toast--${variant}`;
      toast.setAttribute('role', variant === 'error' ? 'alert' : 'status');
      toast.textContent = message;
      container.appendChild(toast);
      setTimeout(() => {
        toast.classList.add('fe-toast--hide');
        setTimeout(() => { try { toast.remove(); } catch {} }, 250);
      }, 2500);
    } catch {}
  }

  // Renders an inline form in place of reviews list. Nome da localStorage, rating obbligatorio; salva via controller
    _showAddReviewForm() {
        const listEl = document.getElementById('dpReviewsList');
        if (!listEl) return;
        if (this._savedReviewsHtml == null) this._savedReviewsHtml = listEl.innerHTML;
        while (listEl.firstChild) listEl.removeChild(listEl.firstChild);
        const addTpl = document.getElementById('dp-add-review-template');
        const node = addTpl ? document.importNode(addTpl.content, true) : null;
        if (node) listEl.appendChild(node);
        // wiring
        const formRoot = listEl.querySelector('#addReviewForm') || listEl;
        // set default name from localStorage
        const nameInput = formRoot.querySelector('#arfName');
        if (nameInput) {
          try { nameInput.value = localStorage.getItem('userName') || 'Anonimo'; } catch { nameInput.value = 'Anonimo'; }
        }
        // Prefill existing review if present for current user
  const uid = (this.controller && typeof this.controller.getCurrentUserId === 'function') ? this.controller.getCurrentUserId() : null;
  const existing = uid ? (this._userReviews || []).find(r => (r.AuthorID || r.authorId || r.authorID) === uid) : null;
        let currentRating = existing && typeof existing.rating === 'number' ? existing.rating : null;
        const stars = Array.from(formRoot.querySelectorAll('.arf-star'));
        const ratingInput = formRoot.querySelector('#arfRating');
        const saveBtn = formRoot.querySelector('#arfSave');
        const cancelBtn = formRoot.querySelector('#arfCancel');
        const ta = formRoot.querySelector('#arfText');
        if (ta && existing && typeof existing.text === 'string') ta.value = existing.text;
        if (saveBtn && existing) saveBtn.textContent = 'Aggiorna';
        const renderStars = (val = currentRating) => {
        stars.forEach((s, idx) => { const active = val != null && idx < val; s.classList.toggle('active', !!active); s.style.color = active ? '#FFD54A' : '#ddd'; });
        if (saveBtn) saveBtn.disabled = (val == null);
        };
        stars.forEach(b => b.addEventListener('click', () => { const v = parseInt(b.dataset.value, 10); currentRating = (v>=1 && v<=5)? v : null; if (ratingInput) ratingInput.value = currentRating != null ? String(currentRating) : ''; renderStars(); }));
        if (ratingInput) ratingInput.addEventListener('input', () => { const v = parseInt(ratingInput.value, 10); currentRating = (!isNaN(v) && v>=1 && v<=5) ? v : null; renderStars(); });
        if (cancelBtn) cancelBtn.addEventListener('click', () => { if (this._savedReviewsHtml != null) { listEl.innerHTML = this._savedReviewsHtml; this._savedReviewsHtml = null; } else while (listEl.firstChild) listEl.removeChild(listEl.firstChild); });
        if (saveBtn) saveBtn.addEventListener('click', async () => {
          try {
            const nameVal = (formRoot.querySelector('#arfName')?.value || 'Anonimo');
            const textVal = (formRoot.querySelector('#arfText')?.value || '').trim();
            const rating = currentRating;
            if (!(rating >= 1 && rating <= 5)) return;
            const ctx = this._currentDetail || {}; const restaurantId = ctx?.docId; const restaurantName = ctx?.payload?.name || '';
            if (!restaurantId || !this.controller || typeof this.controller.addUserReview !== 'function') return;
            const res = await this.controller.addUserReview({ restaurantId, restaurantName, author_name: nameVal, rating, text: textVal });
            if (!res || !res.ok) { this._showToast('Impossibile aggiungere la recensione. Riprova.', 'error'); return; }
            // Toast di successo
            this._showToast('Recensione aggiunta con successo', 'success');
            // Ripristina lista precedente
            if (this._savedReviewsHtml != null) { listEl.innerHTML = this._savedReviewsHtml; this._savedReviewsHtml = null; } else { while (listEl.firstChild) listEl.removeChild(listEl.firstChild); }
            // Ricarica recensioni utente e rinfresca solo le user-review nodes
            try {
              const ctx2 = this._currentDetail || {}; const rid2 = ctx2?.docId;
              if (rid2 && this.controller && typeof this.controller.fetchUserReviews === 'function') {
                const fresh = await this.controller.fetchUserReviews(rid2);
                this._userReviews = Array.isArray(fresh) ? fresh : [];
                const list2 = document.getElementById('dpReviewsList');
                if (list2) list2.querySelectorAll('.review.user-review').forEach(n => n.remove());
                this._renderUserReviewsAppend(this._userReviews);
              }
            } catch {}
            // Aggiorna contatore totale
            const googleCount = Array.isArray(this._currentDetail?.data?.reviews) ? this._currentDetail.data.reviews.length : 0;
            const reviewsCountEl = document.getElementById('dpReviewsCount');
            if (reviewsCountEl) reviewsCountEl.textContent = `(${googleCount + this._userReviews.length})`;
            // Update CTA to Modifica recensione
            const addBtn3 = document.getElementById('dpAddReviewBtn');
            if (addBtn3) addBtn3.textContent = 'Modifica recensione';
          } catch (e) {
            console.warn('Errore salvataggio recensione', e);
            this._showToast('Errore durante il salvataggio della recensione.', 'error');
          }
        });
        renderStars();
    }

    // Appende recensioni utente al fondo della lista, con avatar standard mediante template
    _renderUserReviewsAppend(reviews) {
      const reviewsListEl = document.getElementById('dpReviewsList');
      const reviewTpl = document.getElementById('dp-review-item-template');
      if (!reviewsListEl || !Array.isArray(reviews) || !reviews.length) return;
      for (const r of reviews) {
        let node = reviewTpl ? document.importNode(reviewTpl.content, true).querySelector('.review') : document.createElement('div');
        if (!reviewTpl) node.className = 'review';
        node.classList.add('user-review');
        const name = r.author_name || 'Anonimo';
        const rating = (typeof r.rating === 'number' && isFinite(r.rating)) ? r.rating : null;
        const text = r.text || '';
        // avatar fallback
        const avatarWrap = node.querySelector('.review-avatar-wrapper');
        if (avatarWrap) {
          let rendered = false;
          try {
            const uid = (this.controller && typeof this.controller.getCurrentUserId === 'function') ? this.controller.getCurrentUserId() : null;
            const authorId = r.AuthorID || r.authorId || r.authorID || null;
            if (uid && authorId && uid === authorId) {
              // Try to use current user's profile photo from localStorage
              let photoRaw = null; try { photoRaw = localStorage.getItem('userPhoto'); } catch {}
              const photoUrl = photoRaw ? (() => { try { return JSON.parse(photoRaw); } catch { return null; } })() : null;
              if (photoUrl) {
                const img = document.createElement('img');
                img.className = 'review-avatar';
                img.src = photoUrl;
                img.alt = 'La tua foto profilo';
                img.onerror = () => {
                  try { img.remove(); } catch {}
                  const fb = document.createElement('div'); fb.className='review-avatar fallback'; fb.setAttribute('aria-hidden','true'); fb.textContent='👤'; avatarWrap.appendChild(fb);
                };
                avatarWrap.appendChild(img);
                rendered = true;
              }
            }
          } catch {}
          if (!rendered) {
            const fb = document.createElement('div'); fb.className='review-avatar fallback'; fb.setAttribute('aria-hidden','true'); fb.textContent='👤'; avatarWrap.appendChild(fb);
          }
        }
        const authorWrap = node.querySelector('.review-author-wrap'); if (authorWrap) { const s = document.createElement('span'); s.className='review-author'; s.textContent = name; authorWrap.appendChild(s); }
        const timeEl = node.querySelector('.review-time'); if (timeEl && r.time) { try { timeEl.textContent = new Date(r.time).toLocaleDateString('it-IT'); } catch { timeEl.textContent = ''; } }
        const starsWrap = node.querySelector('.review-stars-wrap'); if (starsWrap) starsWrap.innerHTML = this._buildReviewStars(rating);
        const textEl = node.querySelector('.review-text'); if (textEl) textEl.textContent = text;
        reviewsListEl.appendChild(node);
      }
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