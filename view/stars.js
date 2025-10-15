export function renderStars(value, containerId = "stars") {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = '';
  if (value == null) return;

  const full = Math.floor(value);
  const half = (value - full) >= 0.5;

  for (let i = 0; i < 5; i++) {
    const span = document.createElement('span');
    span.className = 'star';
    if (i < full) {
      span.innerText = '★';
      span.style.color = '#FFD54A';
    } else if (i === full && half) {
      span.innerText = '★';
      span.style.background = 'linear-gradient(90deg,#FFD54A 50%, #ddd 50%)';
      span.style.WebkitBackgroundClip = 'text';
      span.style.backgroundClip = 'text';
      span.style.color = 'transparent';
    } else {
      span.innerText = '★';
      span.style.color = '#ddd';
    }
    container.appendChild(span);
  }
}
