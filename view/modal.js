import { renderStars } from "./stars.js";
import { renderOpeningHoursHTML } from "./hoursRenderer.js";

const modal = document.getElementById("photoModal");
let closeModal = document.getElementById("closeModal");
if (!closeModal) setTimeout(() => { closeModal = document.getElementById("closeModal"); bindClose(); }, 0);

const photoTitle = document.getElementById("photoTitle");
const photoDetails = document.getElementById("photoDetails");
const currentPhoto = document.getElementById("currentPhoto");
const noPhotoMsg = document.getElementById("noPhotoMsg");
const prevBtn = document.getElementById("prevPhoto");
const nextBtn = document.getElementById("nextPhoto");
const reviewsContainer = document.getElementById("reviewsContainer");
const reviewsHeader = document.getElementById("reviewsHeader");
const reviewsListEl = document.getElementById("reviewsList");
const reviewsCount = document.getElementById("reviewsCount");
const likeBtn = document.getElementById("likeBtn");

let photosArray = [];
let currentPhotoIndex = 0;

export function showPhoto(index) {
  if (photosArray.length === 0) return;
  currentPhotoIndex = (index + photosArray.length) % photosArray.length;
  currentPhoto.src = photosArray[currentPhotoIndex];
}

function bindClose() {
  if (!closeModal) return;
  closeModal.onclick = () => {
    modal.style.display = "none";
    photosArray = [];
    currentPhoto.src = "";
    noPhotoMsg.style.display = "none";
  };
}
bindClose();

if (prevBtn) prevBtn.onclick = () => showPhoto(currentPhotoIndex - 1);
if (nextBtn) nextBtn.onclick = () => showPhoto(currentPhotoIndex + 1);

function bindReviewToggle() {
  if (!reviewsHeader) return;
  reviewsHeader.addEventListener("click", () => {
    const reviewsArrowEl = document.getElementById("reviewsArrow");
    const detailsEl = document.getElementById("photoDetails");
    if (reviewsContainer.classList.contains("collapsed")) {
      reviewsContainer.classList.replace("collapsed", "expanded");
      reviewsListEl.setAttribute("aria-hidden", "false");
      detailsEl?.classList.add("details-hidden");
      reviewsArrowEl && (reviewsArrowEl.textContent = "▾");
    } else {
      reviewsContainer.classList.replace("expanded", "collapsed");
      reviewsListEl.setAttribute("aria-hidden", "true");
      detailsEl?.classList.remove("details-hidden");
      reviewsArrowEl && (reviewsArrowEl.textContent = "▸");
    }
  });
}
bindReviewToggle();

function bindLikeButton() {
  if (!likeBtn) return;
  likeBtn.addEventListener("click", () => {
    likeBtn.classList.toggle("liked");
    likeBtn.innerText = likeBtn.classList.contains("liked") ? "♥" : "♡";
  });
}
bindLikeButton();

export function showModalWithData(data, fallbackName, el) {
  modal.style.display = "flex";
  photoTitle.innerText = data.name || fallbackName;

  photoDetails.innerHTML = `
    ${data.formatted_address ? `<div>📍 ${data.formatted_address}</div>` : ""}
    ${data.international_phone_number ? `<div>📞 ${data.international_phone_number}</div>` : ""}
    ${data.website ? `<div>🔗 <a href="${data.website}" target="_blank">Sito</a></div>` : ""}
    ${el.tags?.cuisine ? `<div>🍽️ Cucina: ${el.tags.cuisine}</div>` : ""}
    ${data.opening_hours || el.tags?.opening_hours ? `<div>⏰ Orari:</div>` + 
      renderOpeningHoursHTML(data.opening_hours || el.tags.opening_hours) : ""}
  `;

  renderStars(data.rating);

  photosArray = data.photos || [];
  if (photosArray.length) {
    currentPhoto.style.display = "block";
    noPhotoMsg.style.display = "none";
    showPhoto(0);
  } else {
    currentPhoto.style.display = "none";
    noPhotoMsg.style.display = "block";
  }

  // Aggiorna recensioni
  reviewsListEl.innerHTML = '';
  if (data.reviews && data.reviews.length) {
    data.reviews.forEach(r => {
      const div = document.createElement('div');
      div.className = 'review';
      div.innerHTML = `<strong>${r.author_name || 'Anonimo'}</strong> ${r.rating ? ` - ⭐ ${r.rating}` : ''}<div>${r.text || ''}</div>`;
      reviewsListEl.appendChild(div);
    });
    reviewsCount.innerText = `(${data.reviews.length})`;
  } else {
    reviewsListEl.innerHTML = '<div class="review">Nessuna recensione disponibile.</div>';
    reviewsCount.innerText = '';
  }
}
