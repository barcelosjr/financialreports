jest.mock('axios');
let axios;

beforeEach(() => {
  jest.resetModules();
  axios = require('axios');
  process.env.MOCK_MODE = 'false';
  process.env.TENANT_ID = 'tenant-1';
  process.env.CLIENT_ID = 'client-1';
  process.env.CLIENT_SECRET = 'super-secret-value';
  process.env.GROUP_ID = 'group-1';
  process.env.DATASET_ID = 'dataset-1';
});

afterEach(() => {
  process.env.MOCK_MODE = 'true';
});

test('token cacheado e reaproveitado entre chamadas (axios.post so 1x)', async () => {
  axios.post.mockResolvedValue({ data: { access_token: 'abc', expires_in: 3600 } });
  const { getAccessToken } = require('../../src/auth');

  const t1 = await getAccessToken();
  const t2 = await getAccessToken();

  expect(t1).toBe('abc');
  expect(t2).toBe('abc');
  expect(axios.post).toHaveBeenCalledTimes(1);
});

test('forceRefresh ignora o cache e busca um novo token', async () => {
  axios.post
    .mockResolvedValueOnce({ data: { access_token: 'abc', expires_in: 3600 } })
    .mockResolvedValueOnce({ data: { access_token: 'xyz', expires_in: 3600 } });
  const { getAccessToken } = require('../../src/auth');

  await getAccessToken();
  const t2 = await getAccessToken({ forceRefresh: true });

  expect(t2).toBe('xyz');
  expect(axios.post).toHaveBeenCalledTimes(2);
});

test('erro do Azure AD lanca mensagem generica sem vazar o client secret', async () => {
  axios.post.mockRejectedValue({ response: { status: 401, data: { error: 'invalid_client' } } });
  const { getAccessToken } = require('../../src/auth');

  await expect(getAccessToken()).rejects.toThrow('Falha ao autenticar no Azure AD.');

  const rejection = await getAccessToken().catch((err) => err);
  expect(rejection.message).not.toContain('super-secret-value');
});
