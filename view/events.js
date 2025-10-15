export function bindGlobalEvents() {
  const modal = document.getElementById("photoModal");
  const closeModal = document.getElementById("closeModal");
  const prevBtn = document.getElementById("prevPhoto");
  const nextBtn = document.getElementById("nextPhoto");

  // chiusura con ESC
  document.addEventListener("keydown", e => {
    if (modal.style.display !== "flex") return;
    if (e.key === "Escape") closeModal.click();
    if (e.key === "ArrowLeft") prevBtn.click();
    if (e.key === "ArrowRight") nextBtn.click();
  });

  // click esterno
  modal.addEventListener("click", e => {
    if (e.target === modal) closeModal.click();
  });
}
