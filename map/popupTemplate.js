export function createPopupContent(tags) {
  const name = tags.name || "Ristorante senza nome";
  const cuisine = tags.cuisine || "Tipo sconosciuto";
  const phone = tags.phone || "N/D";
  const website = tags.website ? `<a href="${tags.website}" target="_blank">Sito web</a>` : "N/D";
  return `<b>${name}</b><br>🍽️ Cucina: ${cuisine}<br>📞 Telefono: ${phone}<br>🌐 ${website}`;
}
