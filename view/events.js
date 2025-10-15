// Event binder dedicato al pannello dei dettagli
// Centralizza il wiring per like, frecce foto, toggle recensioni

export function bindDetailPanelEvents({ onPrev, onNext, onBack } = {}) {
  // Aggiorna i callback correnti per l'handler globale
  window.__dp_handlers = { onPrev, onNext, onBack };

  // Like
  const likeBtn = document.getElementById('dpLikeBtn');
  if (likeBtn && !likeBtn.__bound) {
    // Inserisce span per cuore se non presente; prima svuota per evitare doppio cuore
    if (!likeBtn.querySelector('span')) {
      likeBtn.textContent = '';
      const sp = document.createElement('span');
      sp.textContent = '♡';
      likeBtn.appendChild(sp);
    }
    likeBtn.addEventListener('click', () => {
      likeBtn.classList.toggle('liked');
      const sp = likeBtn.querySelector('span');
      if (sp) sp.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
    });
    likeBtn.__bound = true;
  }

  // Carousel prev/next
  const prevBtn = document.getElementById('dpPrevPhoto');
  if (prevBtn && !prevBtn.__bound) {
    prevBtn.addEventListener('click', () => onPrev && onPrev());
    prevBtn.__bound = true;
  }
  const nextBtn = document.getElementById('dpNextPhoto');
  if (nextBtn && !nextBtn.__bound) {
    nextBtn.addEventListener('click', () => onNext && onNext());
    nextBtn.__bound = true;
  }


  // Scorciatoie da tastiera: una sola volta globale
  if (!window.__dp_kb_bound) {
    document.addEventListener('keydown', (e) => {
      const detailView = document.getElementById('detailView');
      if (!detailView || detailView.classList.contains('hidden')) return;

      const h = window.__dp_handlers || {};
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        h.onPrev && h.onPrev();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        h.onNext && h.onNext();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        if (h.onBack) h.onBack(); else document.getElementById('dpBackToList')?.click();
      } else if (e.key === 'l' || e.key === 'L') {
        // Toggle like
        document.getElementById('dpLikeBtn')?.click();
      }
    });
    window.__dp_kb_bound = true;
  }
}
