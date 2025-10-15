// Rende la lista dei ristoranti lato sinistro usando dati Overpass
// items: array di elementi Overpass (node/way/relation con tags, lat/lon o center)
// onSelect: funzione(el) -> seleziona un ristorante

export function renderRestaurantList(container, items, onSelect) {
  if (!container) return;
  container.innerHTML = '';

  if (!items || !items.length) {
    container.innerHTML = '<div>Nessun ristorante trovato nell\'area selezionata.</div>';
    return;
  }

  for (const el of items) {
    const name = el.tags?.name || 'Ristorante senza nome';
  // Distanza (se disponibile in futuro: qui placeholder "- km")
  const distance = el.__distanceKm != null ? `${el.__distanceKm.toFixed(1)} km` : '';

    const div = document.createElement('div');
    div.className = 'list-item';
    div.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
        <div>
          <h3 class="li-title" style="margin:0;">${name}</h3>
          <div class="li-meta">${distance}</div>
        </div>
        <div style="display:flex; gap:8px;">
          <button class="like-btn li-like" title="Mi piace" aria-label="Mi piace">♡</button>
          <button class="back-btn li-details" title="Vedi dettagli" aria-label="Vedi dettagli">Dettagli</button>
        </div>
      </div>
    `;
    // Click su Dettagli
    div.querySelector('.li-details').addEventListener('click', (e) => { e.stopPropagation(); onSelect && onSelect(el); });
    // Click su like NON apre i dettagli
    const likeBtn = div.querySelector('.li-like');
    likeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      likeBtn.classList.toggle('liked');
      likeBtn.textContent = likeBtn.classList.contains('liked') ? '♥' : '♡';
    });
    // Click ovunque sul box apre i dettagli
    div.addEventListener('click', () => onSelect && onSelect(el));
    container.appendChild(div);
  }
}
