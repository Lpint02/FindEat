/**
 * OverpassService — servizio per interrogare i ristoranti via Overpass (OpenStreetMap).
 *
 * Ottimizzazioni:
 * 1. localStorage con TTL 1 ora (persistente tra sessioni)
 * 2. Cache-first: risultati dalla cache mostrati subito, refresh in background
 * 3. Deduplicazione richieste: se la stessa query è già in volo, riusa la stessa Promise
 * 4. Best-endpoint memory: ricorda quale endpoint ha risposto per ultimo e lo prova per primo
 * 5. Cooldown per endpoint: se un endpoint ha dato 429/errore, aspetta prima di riprovarlo
 * 6. Stale cache: se la cache è scaduta ma esistente, la usa subito e aggiorna in background
 */
export default class OverpassService {
  constructor() {
    this.endpoints = [
      'https://overpass-api.de/api/interpreter',
      'https://lz4.overpass.openstreetmap.fr/api/interpreter',
      'https://overpass.kumi.systems/api/interpreter'
    ];

    this.cacheTtlMs = 60 * 60 * 1000;        // 1 ora — cache fresca
    this.staleTtlMs = 24 * 60 * 60 * 1000;   // 24 ore — cache stale (usabile come fallback)
    this._inflightRequests = new Map();        // deduplicazione: cacheKey → Promise
    this._endpointCooldowns = new Map();       // endpoint → timestamp: non riprovare prima di questo momento
    this._cooldownMs = 15_000;                 // 15 secondi di cooldown dopo un errore 429

    // Ripristina l'ultimo endpoint funzionante dalla memoria
    try { this._bestEndpoint = localStorage.getItem('overpass:bestEndpoint') || null; } catch { this._bestEndpoint = null; }
  }

  // ---------------------------------------------------------------------------
  // Query builder
  // ---------------------------------------------------------------------------
  _buildQuery(lat, lon, radius) {
    return `[out:json][timeout:25];(node["amenity"="restaurant"](around:${radius},${lat},${lon});way["amenity"="restaurant"](around:${radius},${lat},${lon});relation["amenity"="restaurant"](around:${radius},${lat},${lon}););out center;`;
  }

  // ---------------------------------------------------------------------------
  // Cache (localStorage)
  // ---------------------------------------------------------------------------
  _cacheKey(lat, lon, radius) {
    const rl = (v) => Number(v).toFixed(3);
    return `overpass:${rl(lat)},${rl(lon)}:r=${Math.round(radius)}`;
  }

  _saveCache(key, elements) {
    try {
      localStorage.setItem(key, JSON.stringify({ ts: Date.now(), elements }));
    } catch {
      // localStorage pieno: pulisci le chiavi overpass più vecchie e riprova
      this._evictOldCache();
      try { localStorage.setItem(key, JSON.stringify({ ts: Date.now(), elements })); } catch { /* ignora */ }
    }
  }

  /**
   * Carica dalla cache.
   * @param {string} key
   * @param {boolean} allowStale - se true, accetta anche dati scaduti (fino a staleTtlMs)
   * @returns {{ elements: Array, fresh: boolean } | null}
   */
  _loadCache(key, allowStale = false) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const obj = JSON.parse(raw);
      if (!obj || !Array.isArray(obj.elements) || !obj.elements.length) return null;
      const age = Date.now() - (obj.ts || 0);
      if (age <= this.cacheTtlMs) return { elements: obj.elements, fresh: true };
      if (allowStale && age <= this.staleTtlMs) return { elements: obj.elements, fresh: false };
      return null;
    } catch { return null; }
  }

  /** Rimuove le chiavi overpass più vecchie per liberare spazio */
  _evictOldCache() {
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('overpass:') && k.includes(':r=')) keys.push(k);
      }
      // Ordina per timestamp e rimuovi la metà più vecchia
      const parsed = keys.map(k => {
        try { const o = JSON.parse(localStorage.getItem(k)); return { key: k, ts: o?.ts || 0 }; }
        catch { return { key: k, ts: 0 }; }
      }).sort((a, b) => a.ts - b.ts);
      const toRemove = Math.max(1, Math.ceil(parsed.length / 2));
      for (let i = 0; i < toRemove && i < parsed.length; i++) localStorage.removeItem(parsed[i].key);
    } catch { /* ignora */ }
  }

  // ---------------------------------------------------------------------------
  // Endpoint management
  // ---------------------------------------------------------------------------

  /** Ritorna gli endpoint ordinati: best-endpoint per primo, esclude quelli in cooldown */
  _getOrderedEndpoints() {
    const now = Date.now();
    const available = this.endpoints.filter(ep => {
      const cooldownUntil = this._endpointCooldowns.get(ep) || 0;
      return now >= cooldownUntil;
    });

    // Se tutti in cooldown, usa tutti (meglio provare che non fare nulla)
    const pool = available.length > 0 ? available : [...this.endpoints];

    // Best endpoint per primo
    if (this._bestEndpoint && pool.includes(this._bestEndpoint)) {
      return [this._bestEndpoint, ...pool.filter(ep => ep !== this._bestEndpoint)];
    }
    return pool;
  }

  _markEndpointSuccess(ep) {
    this._bestEndpoint = ep;
    this._endpointCooldowns.delete(ep);
    try { localStorage.setItem('overpass:bestEndpoint', ep); } catch { /* ignora */ }
  }

  _markEndpointFailed(ep, isRateLimit = false) {
    const cooldown = isRateLimit ? this._cooldownMs * 2 : this._cooldownMs;
    this._endpointCooldowns.set(ep, Date.now() + cooldown);
  }

  // ---------------------------------------------------------------------------
  // Fetch con timeout
  // ---------------------------------------------------------------------------
  _fetchWithTimeout(url, body, timeoutMs, extSignal) {
    return new Promise(async (resolve, reject) => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const abortHandler = () => controller.abort();

      if (extSignal) {
        if (extSignal.aborted) { clearTimeout(timer); reject(new DOMException('Aborted', 'AbortError')); return; }
        extSignal.addEventListener('abort', abortHandler, { once: true });
      }

      try {
        const res = await fetch(url, { method: 'POST', body, signal: controller.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const ct = res.headers.get('content-type') || '';
        let data;
        if (ct.includes('application/json')) {
          data = await res.json();
        } else {
          const text = await res.text();
          try { data = JSON.parse(text); } catch { throw new Error('Non-JSON response'); }
        }
        resolve(data);
      } catch (err) {
        reject(err);
      } finally {
        clearTimeout(timer);
        if (extSignal) extSignal.removeEventListener('abort', abortHandler);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // fetchRestaurants — metodo principale
  // ---------------------------------------------------------------------------
  async fetchRestaurants(lat, lon, radius = 10000, opts = {}) {
    const { signal } = opts;
    const key = this._cacheKey(lat, lon, radius);

    // ① Cache fresca → ritorna subito
    const freshCache = this._loadCache(key, false);
    if (freshCache) {
      console.log(`Overpass: cache hit (fresca, ${freshCache.elements.length} elementi)`);
      return freshCache.elements;
    }

    // ② Deduplicazione: se c'è già una richiesta in volo per questa stessa chiave, aspetta quella
    if (this._inflightRequests.has(key)) {
      console.log('Overpass: richiesta deduplicata, attendo risultato in volo');
      return this._inflightRequests.get(key);
    }

    // ③ Cache stale disponibile? Restituiscila subito e aggiorna in background
    const staleCache = this._loadCache(key, true);
    if (staleCache) {
      console.log(`Overpass: cache stale (${staleCache.elements.length} elementi), aggiornamento in background`);
      // Lancia il refresh in background (non blocca)
      this._backgroundRefresh(lat, lon, radius, key);
      return staleCache.elements;
    }

    // ④ Nessuna cache: fetch vero (bloccante)
    const promise = this._doFetch(lat, lon, radius, key, signal);
    this._inflightRequests.set(key, promise);
    try {
      return await promise;
    } finally {
      this._inflightRequests.delete(key);
    }
  }

  // ---------------------------------------------------------------------------
  // Refresh in background (non bloccante, aggiorna solo la cache)
  // ---------------------------------------------------------------------------
  _backgroundRefresh(lat, lon, radius, key) {
    // Non duplicare refresh in background
    const bgKey = `bg:${key}`;
    if (this._inflightRequests.has(bgKey)) return;

    const p = this._doFetch(lat, lon, radius, key, null).catch(err => {
      console.warn('Overpass: background refresh failed', err);
      return [];
    }).finally(() => {
      this._inflightRequests.delete(bgKey);
    });

    this._inflightRequests.set(bgKey, p);
  }

  // ---------------------------------------------------------------------------
  // Logica di fetch effettiva con retry multi-endpoint
  // ---------------------------------------------------------------------------
  async _doFetch(lat, lon, radius, key, signal) {
    const query = this._buildQuery(lat, lon, radius);
    const endpoints = this._getOrderedEndpoints();
    const maxAttempts = 2;
    const baseTimeout = 10_000;
    const sleep = (ms) => new Promise(r => setTimeout(r, ms));

    for (const ep of endpoints) {
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const timeoutMs = baseTimeout + attempt * 5_000;
        try {
          const data = await this._fetchWithTimeout(ep, query, timeoutMs, signal);
          const elements = data?.elements || [];
          if (elements.length) {
            this._saveCache(key, elements);
            this._markEndpointSuccess(ep);
          }
          return elements;
        } catch (err) {
          const msg = String(err?.message || err);
          if (msg.includes('Aborted') || msg.includes('AbortError')) throw err;

          const isRateLimit = msg.includes('429');
          this._markEndpointFailed(ep, isRateLimit);
          console.warn(`Overpass (${ep}) tentativo ${attempt + 1} fallito:`, msg);

          // Backoff prima di riprovare lo stesso endpoint
          if (attempt < maxAttempts - 1) {
            await sleep(isRateLimit ? 2000 : 500);
          }
        }
      }
    }

    // Tutti gli endpoint falliti → prova con raggio più piccolo (query più leggera)
    const fallbackFactors = [0.5, 0.25];
    for (const f of fallbackFactors) {
      const smaller = Math.max(500, Math.round(radius * f));
      const smallKey = this._cacheKey(lat, lon, smaller);

      // Controlla prima la cache per il raggio ridotto
      const smallCache = this._loadCache(smallKey, true);
      if (smallCache) {
        console.warn(`Overpass: uso cache raggio ridotto ${smaller}m`);
        return smallCache.elements;
      }

      const smallQuery = this._buildQuery(lat, lon, smaller);
      for (const ep of this._getOrderedEndpoints().slice(0, 2)) {
        try {
          const data = await this._fetchWithTimeout(ep, smallQuery, baseTimeout, signal);
          const elems = data?.elements || [];
          if (elems.length) {
            this._saveCache(smallKey, elems);
            this._markEndpointSuccess(ep);
            console.warn(`Overpass: fallback raggio ${smaller}m riuscito su ${ep}`);
            return elems;
          }
        } catch (e) {
          const msg = String(e?.message || e);
          if (msg.includes('Aborted') || msg.includes('AbortError')) throw e;
        }
      }
    }

    // Ultima spiaggia: cache stale per qualsiasi raggio vicino
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('overpass:') && k.includes(':r=')) {
          const cached = this._loadCache(k, true);
          if (cached) {
            console.warn('Overpass: usando cache stale di posizione vicina');
            return cached.elements;
          }
        }
      }
    } catch { /* ignora */ }

    return [];
  }
}
