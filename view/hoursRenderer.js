export function renderOpeningHoursHTML(opening) {
  if (!opening) return '';
  let lines = [];
  if (Array.isArray(opening)) {
    lines = opening.slice();
  } else if (typeof opening === 'string') {
    lines = opening.includes('|') ? opening.split('|').map(s => s.trim()).filter(Boolean)
                                  : opening.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  }

  const dayMap = {};
  lines.forEach(l => {
    const idx = l.indexOf(':');
    if (idx > -1) dayMap[l.slice(0, idx).trim()] = l.slice(idx + 1).trim();
  });

  const daysOrder = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
  const displayNames = { 'Monday':'Lun', 'Tuesday':'Mar', 'Wednesday':'Mer', 'Thursday':'Gio', 'Friday':'Ven', 'Saturday':'Sab', 'Sunday':'Dom' };
  const variants = {
    'Monday': ['Monday','Mon','Luned','Lunedì','Lunedi','Lun'],
    'Tuesday': ['Tuesday','Tue','Mart','Martedì','Martedi','Mar'],
    'Wednesday': ['Wednesday','Wed','Mercoledì','Mercoledi','Mer'],
    'Thursday': ['Thursday','Thu','Giovedì','Giovedi','Gio'],
    'Friday': ['Friday','Fri','Venerdì','Venerdi','Ven'],
    'Saturday': ['Saturday','Sat','Sabato','Sab'],
    'Sunday': ['Sunday','Sun','Domenica','Dom']
  };

  const boxes = daysOrder.map(day => {
    let found = null;
    for (const k in dayMap) {
      for (const v of variants[day]) {
        if (k.toLowerCase().startsWith(v.toLowerCase())) { found = dayMap[k]; break; }
      }
      if (found) break;
    }
    let display = 'Chiuso';
    if (found) display = /chiuso|closed/i.test(found) ? 'Chiuso' : found.replace(/–/g,'-');
    return `<div class="hours-box"><div class="hours-day">${displayNames[day]}</div><div class="hours-interval">${display}</div></div>`;
  }).join('');

  return `<div class="hours-grid">${boxes}</div>`;
}
