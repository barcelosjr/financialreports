const NodeCache = require('node-cache');

/**
 * Fabrica de caches com interface simples (get/set/getStale/withCache).
 * Hoje usa node-cache em memoria; no futuro pode ser reimplementada por
 * cima do Redis mantendo exatamente a mesma interface, sem tocar nas rotas.
 *
 * Mantem dois armazenamentos por instancia:
 *  - `store`: valores "frescos", respeitam o TTL normal.
 *  - `staleStore`: copia de longa duracao dos mesmos valores, usada como
 *    fallback quando a fonte de dados falha (ex: 429 do Power BI) e o valor
 *    fresco ja expirou (stale-while-revalidate).
 */
function createCache({ ttlSeconds, staleTTLSeconds } = {}) {
  const defaultTTL = ttlSeconds ?? 600;
  const staleTTL = staleTTLSeconds ?? defaultTTL * 10;

  const store = new NodeCache({
    stdTTL: defaultTTL,
    checkperiod: Math.max(30, Math.floor(defaultTTL / 2)),
  });
  const staleStore = new NodeCache({
    stdTTL: staleTTL,
    checkperiod: Math.max(60, Math.floor(staleTTL / 2)),
  });

  function get(key) {
    return store.get(key);
  }

  function set(key, value, ttl) {
    store.set(key, value, ttl ?? defaultTTL);
    staleStore.set(key, value);
  }

  function getStale(key) {
    return staleStore.get(key);
  }

  /**
   * Busca no cache; em caso de miss, executa fetchFn() e armazena o resultado.
   * Se fetchFn() falhar e houver um valor stale disponivel, retorna o valor
   * stale em vez de propagar o erro (stale-while-revalidate).
   */
  async function withCache(key, fetchFn, { ttlSeconds: ttl } = {}) {
    const cached = get(key);
    if (cached !== undefined) {
      return { data: cached, stale: false };
    }

    try {
      const fresh = await fetchFn();
      set(key, fresh, ttl);
      return { data: fresh, stale: false };
    } catch (err) {
      const staleValue = getStale(key);
      if (staleValue !== undefined) {
        return { data: staleValue, stale: true, error: err };
      }
      throw err;
    }
  }

  return { get, set, getStale, withCache };
}

module.exports = { createCache };
