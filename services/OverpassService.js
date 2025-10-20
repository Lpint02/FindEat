export default class OverpassService {
  constructor() {
    this.endpoint = 'https://overpass-api.de/api/interpreter';
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

    // Single-endpoint with 1 quick retry
    const ep = this.endpoint;
    try {
      const data = await fetchWithTimeout(ep, query, 12000, signal);
      const elements = data?.elements || [];
      if (elements.length) this._saveCache(key, elements);
      return elements;
    } catch (e1) {
      const msg = String(e1?.message || e1);
      if (msg.includes('Aborted')) throw e1; // propagate user abort
      console.warn(`Overpass failed (${ep}) first attempt:`, e1);
      // small backoff before retry
      await new Promise(r => setTimeout(r, 300));
      try {
        const data2 = await fetchWithTimeout(ep, query, 16000, signal);
        const elements2 = data2?.elements || [];
        if (elements2.length) this._saveCache(key, elements2);
        return elements2;
      } catch (e2) {
        const msg2 = String(e2?.message || e2);
        if (msg2.includes('Aborted')) throw e2;
        console.warn(`Overpass failed (${ep}) second attempt:`, e2);
      }
    }

    // All attempts failed: try cached value
    const cached = this._loadCache(key);
    if (cached) return cached;
    // Ultimately return empty list to caller
    return [];
  }
}
