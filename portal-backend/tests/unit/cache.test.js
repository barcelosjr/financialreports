const { createCache } = require('../../src/cache');

describe('cache.withCache', () => {
  test('miss chama fetchFn e armazena; hit subsequente nao chama fetchFn de novo', async () => {
    const cache = createCache({ ttlSeconds: 60 });
    const fetchFn = jest.fn().mockResolvedValue('valor');

    const r1 = await cache.withCache('k', fetchFn);
    const r2 = await cache.withCache('k', fetchFn);

    expect(r1).toEqual({ data: 'valor', stale: false });
    expect(r2).toEqual({ data: 'valor', stale: false });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  test('apos o TTL expirar, um novo miss ocorre e fetchFn e chamada de novo', async () => {
    const cache = createCache({ ttlSeconds: 1 });
    const fetchFn = jest.fn().mockResolvedValueOnce('v1').mockResolvedValue('v2');

    await cache.withCache('k', fetchFn);
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const r2 = await cache.withCache('k', fetchFn);

    expect(r2.data).toBe('v2');
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  test('stale-while-revalidate: fetchFn falhando apos o valor fresco expirar retorna o valor stale', async () => {
    const cache = createCache({ ttlSeconds: 1, staleTTLSeconds: 60 });
    await cache.withCache('k', jest.fn().mockResolvedValue('fresco'));
    await new Promise((resolve) => setTimeout(resolve, 1100));

    const err = new Error('falhou');
    const result = await cache.withCache('k', jest.fn().mockRejectedValue(err));

    expect(result).toEqual({ data: 'fresco', stale: true, error: err });
  });

  test('sem valor stale disponivel, o erro do fetchFn propaga', async () => {
    const cache = createCache({ ttlSeconds: 60 });
    await expect(
      cache.withCache('k2', jest.fn().mockRejectedValue(new Error('boom')))
    ).rejects.toThrow('boom');
  });
});
