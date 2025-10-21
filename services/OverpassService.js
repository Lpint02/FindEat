export default class OverpassService {
  constructor() {
    // Multiple public Overpass endpoints to fall back to
    this.endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass.openstreetmap.fr/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];
    this.cacheTtlMs = 10 * 60 * 1000; // 10 minuti
  }

  _buildQuery(lat, lon, radius) {
    return `
    [out:json][timeout:30];
    (
      node["amenity"="restaurant"](around:${radius},${lat},${lon});
      way["amenity"="restaurant"](around:${radius},${lat},${lon});
      relation["amenity"="restaurant"](around:${radius},${lat},${lon});
    );
    out center;`;
  }

  _cacheKey(lat, lon, radius) {
    const r = Math.round(radius);
    const rl = (v) => Number(v).toFixed(3);
    return `overpass:${rl(lat)},${rl(lon)}:r=${r}`;
  }

  _saveCache(key, elements) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), elements })); } catch {}
  }

  _loadCache(key) {
    try {
      const raw = sessionStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.elements)) return null;
      if ((Date.now() - (obj.ts || 0)) > this.cacheTtlMs) return null;
      return obj.elements;
    } catch { return null; }
  }

  async fetchRestaurants(lat, lon, radius = 10000, opts = {}) {
    const { signal } = opts;
    const query = this._buildQuery(lat, lon, radius);
    const key = this._cacheKey(lat, lon, radius);

    // Helper: fetch with timeout and robust JSON handling
    const fetchWithTimeout = async (url, body, timeoutMs, extSignal) => {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), timeoutMs);
      const abortHandler = () => controller.abort();
      if (extSignal) {
        if (extSignal.aborted) { clearTimeout(id); throw new DOMException('Aborted', 'AbortError'); }
        extSignal.addEventListener('abort', abortHandler, { once: true });
      }
      try {
        const res = await fetch(url, { method: 'POST', body, signal: controller.signal });
        if (!res.ok) { throw new Error(`HTTP ${res.status}`); }
        const ct = res.headers.get('content-type') || '';
        if (ct.includes('application/json')) {
          const data = await res.json();
          return data;
        }
        // Try text to detect HTML/XML error bodies
        const text = await res.text();
        try { return JSON.parse(text); } catch {
          throw new Error('Non-JSON response from Overpass');
        }
      } finally {
        clearTimeout(id);
        if (extSignal) extSignal.removeEventListener('abort', abortHandler);
      }
    };

    // Try multiple endpoints with retries (exponential backoff). If user aborts, propagate.
    const maxAttemptsPerEndpoint = 2;
    const baseTimeout = 12000;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (const ep of this.endpoints) {
      for (let attempt = 0; attempt < maxAttemptsPerEndpoint; attempt++) {
        const timeoutMs = baseTimeout + attempt * 4000;
        try {
          const data = await fetchWithTimeout(ep, query, timeoutMs, signal);
          const elements = data?.elements || [];
          if (elements.length) this._saveCache(key, elements);
          // Return immediately even if elements is empty (valid zero-result), but prefer a positive result
          if (elements.length) return elements;
          // If empty, still return empty to caller (we got a valid response)
          return elements;
        } catch (err) {
          const msg = String(err?.message || err);
          if (msg.includes('Aborted')) throw err; // user aborted -> propagate
          console.warn(`Overpass failed (${ep}) attempt ${attempt + 1}:`, err);
          // backoff before retrying the same endpoint
          await sleep(300 * Math.pow(2, attempt));
        }
      }
    }

    // If we reach here, all endpoints/attempts failed. Try cached value as a graceful fallback.
    const cached = this._loadCache(key);
    if (cached) {
      console.warn('Overpass failed on all endpoints; using cached results');
      return cached;
    }

    // No cache available: attempt progressive smaller-radius fallbacks to increase chance of a quick response
    const radiusFallbackFactors = [0.7, 0.5, 0.3, 0.15];
    for (const f of radiusFallbackFactors) {
      const smaller = Math.max(500, Math.round(radius * f));
      const smallKey = this._cacheKey(lat, lon, smaller);
      // try endpoints once for each smaller radius
      for (const ep of this.endpoints) {
        try {
          const data = await fetchWithTimeout(ep, this._buildQuery(lat, lon, smaller), baseTimeout, signal);
          const elems = data?.elements || [];
          if (elems.length) {
            this._saveCache(smallKey, elems);
            console.warn(`Overpass: fallback radius ${smaller}m succeeded on ${ep}`);
            return elems;
          }
        } catch (e) {
          const msg = String(e?.message || e);
          if (msg.includes('Aborted')) throw e;
          console.warn(`Overpass fallback ${smaller}m failed on ${ep}:`, e);
        }
      }
      // try cache for smaller radius before next fallback
      const cachedSmall = this._loadCache(smallKey);
      if (cachedSmall) return cachedSmall;
    }

    // Ultimately nothing available: return empty array (caller should handle UI gracefully)
    return [];
  }
}
