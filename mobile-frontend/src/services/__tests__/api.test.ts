import { ApiError, api, setAuthToken, setUnauthorizedHandler } from '../api';

const respond = (status: number, body: unknown) =>
  jest
    .fn()
    .mockResolvedValue(
      new Response(JSON.stringify(body), {
        status,
        headers: { 'Content-Type': 'application/json' },
      })
    );

afterEach(() => jest.restoreAllMocks());

describe('API client error handling', () => {
  it('reports an endpoint that the deployed server does not have yet — never a fake success', async () => {
    global.fetch = respond(404, {
      error: 'Endpoint Not Found',
      path: '/api/v1/routing/plan',
    }) as any;
    await expect(
      api.routing.plan('Run', { lat: 1, lng: 1 }, { lat: 1.01, lng: 1 })
    ).rejects.toMatchObject({
      status: 404,
      code: 'endpoint_missing',
      message: expect.stringMatching(/latest server version/),
    });
  });

  it('keeps real "not found" resources distinct from missing endpoints', async () => {
    global.fetch = respond(404, { error: 'Activity not found', code: 'not_found' }) as any;
    await expect(api.activities.get('x')).rejects.toMatchObject({
      status: 404,
      code: 'not_found',
      message: 'Activity not found',
    });
  });

  it('classifies network failures as retryable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as any;
    const err = await api.feed.getFeed('following').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, retryable: true });
  });

  it('never sends requests from cache', async () => {
    const f = respond(200, { feed: [], count: 0, tab: 'following' });
    global.fetch = f as any;
    await api.feed.getFeed('following');
    expect(f.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });

  describe('expired session', () => {
    afterEach(() => {
      setAuthToken(null);
      setUnauthorizedHandler(null);
    });

    it('signs out when the current token is rejected', async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      setAuthToken('tok');
      global.fetch = respond(401, {
        error: 'Unauthorized: Token expired or invalid',
        code: 'unauthorized',
      }) as any;
      await expect(api.notifications.list()).rejects.toMatchObject({ status: 401 });
      expect(handler).toHaveBeenCalledTimes(1);
    });

    it('does not sign out on a failed login (no token attached)', async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      global.fetch = respond(401, { error: 'Invalid credentials' }) as any;
      await expect(api.auth.login('a@b.c', 'bad')).rejects.toMatchObject({ status: 401 });
      expect(handler).not.toHaveBeenCalled();
    });

    it("ignores a late 401 that belongs to a previous account's token", async () => {
      const handler = jest.fn();
      setUnauthorizedHandler(handler);
      setAuthToken('old');
      global.fetch = jest.fn().mockImplementation(async () => {
        setAuthToken('new'); // user switched account while the request was in flight
        return new Response(JSON.stringify({ error: 'expired' }), { status: 401 });
      }) as any;
      await expect(api.notifications.list()).rejects.toMatchObject({ status: 401 });
      expect(handler).not.toHaveBeenCalled();
    });
  });
});
