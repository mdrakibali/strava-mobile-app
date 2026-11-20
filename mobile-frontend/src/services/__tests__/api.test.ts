import { ApiError, api } from '../api';

const respond = (status: number, body: unknown) =>
  jest.fn().mockResolvedValue(new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } }));

afterEach(() => jest.restoreAllMocks());

describe('API client error handling', () => {
  it('reports an endpoint that the deployed server does not have yet — never a fake success', async () => {
    global.fetch = respond(404, { error: 'Endpoint Not Found', path: '/api/v1/routing/plan' }) as any;
    await expect(api.routing.plan('Run', { lat: 1, lng: 1 }, { lat: 1.01, lng: 1 })).rejects.toMatchObject({
      status: 404,
      code: 'endpoint_missing',
      message: expect.stringMatching(/latest server version/),
    });
  });

  it('keeps real "not found" resources distinct from missing endpoints', async () => {
    global.fetch = respond(404, { error: 'Activity not found', code: 'not_found' }) as any;
    await expect(api.activities.get('x')).rejects.toMatchObject({ status: 404, code: 'not_found', message: 'Activity not found' });
  });

  it('classifies network failures as retryable', async () => {
    global.fetch = jest.fn().mockRejectedValue(new TypeError('Network request failed')) as any;
    const err = await api.feed.getFeed('following').catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 0, retryable: true });
  });

  it('never sends requests from cache', async () => {
    const f = respond(200, { feed: [], count: 0, tab: 'following', hasNextPage: false, nextCursor: null });
    global.fetch = f as any;
    await api.feed.getFeed('following');
    expect(f.mock.calls[0][1]).toMatchObject({ cache: 'no-store' });
  });
});
