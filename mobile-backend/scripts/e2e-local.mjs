/**
 * End-to-end check over real HTTP against `npm run dev:local` (never production):
 *   PORT=8799 npm run dev:local &   node scripts/e2e-local.mjs http://localhost:8799/api/v1
 * Two users register, one records + uploads (batch protocol, with a retried batch and a duplicate
 * complete), the other follows, sees it in the feed, gives/removes kudos, comments, edits, deletes.
 */
const BASE = process.argv[2] || 'http://localhost:8799/api/v1';
if (/workers\.dev|open-strava-backend/.test(BASE)) throw new Error('Refusing to run against production');
let failures = 0;
const check = (name, ok, extra = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${extra ? `  (${extra})` : ''}`);
  if (!ok) failures++;
};
const call = async (method, path, token, body) => {
  const res = await fetch(BASE + path, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  return { status: res.status, body: text ? JSON.parse(text) : null, headers: res.headers };
};

const stamp = Date.now();
const reg = async (name) =>
  (await call('POST', '/auth/register', null, { email: `${name}.${stamp}@example.com`, password: 'Passw0rd!x', displayName: name })).body;
const ana = await reg('Ana');
const ben = await reg('Ben');
check('register two users', Boolean(ana?.token && ben?.token));

// --- record + batch upload (Ana) ---
const cid = crypto.randomUUID();
const t0 = Date.now() - 20 * 60_000;
const pts = Array.from({ length: 700 }, (_, i) => [t0 + i * 1000, 23.78, 90.42 + (i * 3) / (111_320 * Math.cos((23.78 * Math.PI) / 180)), 5, 10, 3, 3, 0]);
const s = await call('POST', '/activities/uploads', ana.token, { clientActivityId: cid, sportType: 'Run', startTime: new Date(t0).toISOString() });
check('start upload', s.status === 201);
for (let seq = 0; seq < 3; seq++) {
  const r = await call('PUT', `/activities/uploads/${cid}/batches/${seq}`, ana.token, { points: pts.slice(seq * 300, seq * 300 + 300) });
  check(`batch ${seq}`, r.status === 200);
}
const retry = await call('PUT', `/activities/uploads/${cid}/batches/1`, ana.token, { points: pts.slice(300, 600) });
check('retried batch is acknowledged as duplicate', retry.body?.duplicate === true);
const details = { title: 'E2E run', sportType: 'Run', visibility: 'FOLLOWERS_ONLY', startTime: new Date(t0).toISOString(), finishedAt: new Date(t0 + 700_000).toISOString(), pauses: [], batchCount: 3 };
const [c1, c2] = await Promise.all([
  call('POST', `/activities/uploads/${cid}/complete`, ana.token, details),
  call('POST', `/activities/uploads/${cid}/complete`, ana.token, details),
]);
const id = c1.body?.activity?.id;
check('concurrent duplicate completes → one activity', [c1.status, c2.status].sort().join() === '200,201' && c1.body.activity.id === c2.body.activity.id);
const dist = Number(c1.body.activity.distanceMeters);
check('server-computed distance ≈ 2.1 km', dist > 2050 && dist < 2150, `${dist} m`);

// --- privacy before following ---
check('stranger cannot open followers-only activity', (await call('GET', `/activities/${id}`, ben.token)).status === 404);

// --- follow → feed ---
await call('PUT', `/athletes/${ana.athlete.id}/follow`, ben.token);
const feed = await call('GET', '/feed?tab=following', ben.token);
check('follower sees it in the feed', feed.body.feed.some((f) => f.id === id));
check('feed is not cacheable', feed.headers.get('cache-control') === 'no-store');

// --- kudos ---
const k1 = await call('PUT', `/activities/${id}/kudos`, ben.token);
const feed2 = await call('GET', '/feed?tab=following', ben.token);
check('kudos given and reflected in feed', k1.body.kudosCount === 1 && feed2.body.feed.find((f) => f.id === id).hasKudos === true);
const who = await call('GET', `/activities/${id}/kudos`, ana.token);
check('owner sees who gave kudos', who.body.athletes[0]?.id === ben.athlete.id);
const k2 = await call('DELETE', `/activities/${id}/kudos`, ben.token);
check('kudos removed', k2.body.hasKudos === false && k2.body.kudosCount === 0);

// --- comments ---
const cm = await call('POST', `/activities/${id}/comments`, ben.token, { content: 'Great run!' });
const ed = await call('PATCH', `/activities/${id}/comments/${cm.body.comment.id}`, ben.token, { content: 'Great run!!' });
check('comment added and edited', ed.body.comment?.content === 'Great run!!');
const del = await call('DELETE', `/activities/${id}/comments/${cm.body.comment.id}`, ana.token);
check('activity owner can delete a comment', del.body.commentsCount === 0);

// --- notifications ---
const notes = await call('GET', '/notifications', ana.token);
const types = new Set(notes.body.notifications.map((n) => n.actionType));
check('owner notified of follow, kudos, comment', ['FOLLOW', 'KUDOS', 'COMMENT'].every((t) => types.has(t)));

// --- unfollow → private again ---
await call('DELETE', `/athletes/${ana.athlete.id}/follow`, ben.token);
check('unfollow hides followers-only activity again', (await call('GET', `/activities/${id}`, ben.token)).status === 404);

// --- edit/delete ---
const patch = await call('PATCH', `/activities/${id}`, ana.token, { visibility: 'PUBLIC', title: 'E2E run (public)' });
check('owner edits visibility', patch.body.activity?.visibility === 'PUBLIC');
check('now visible to anyone', (await call('GET', `/activities/${id}`)).status === 200);
check('non-owner cannot delete', (await call('DELETE', `/activities/${id}`, ben.token)).status === 404);
check('owner deletes', (await call('DELETE', `/activities/${id}`, ana.token)).status === 204);
const resurrect = await call('POST', `/activities/uploads/${cid}/complete`, ana.token, details);
check('late upload retry does not resurrect a deleted activity', resurrect.body.deleted === true);

console.log(failures ? `\n${failures} FAILED` : '\nALL PASSED');
process.exit(failures ? 1 : 0);
