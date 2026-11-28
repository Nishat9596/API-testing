// @ts-check
// Edge-case, boundary and auth tests for the Support Ticket API.
// Tests marked test.fail() cover open bugs (see docs/BUG-002 to BUG-005): they are
// expected to fail until the bug is fixed, so CI stays green but the bug stays visible.
const { test, expect } = require('@playwright/test');

let token;

test.beforeEach(async ({ request }) => {
  await request.post('/reset');
  const login = await request.post('/auth/login', { data: { username: 'demo', password: 'demo123' } });
  token = (await login.json()).token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test.describe('Authentication edge cases', () => {
  test('API-18: login with an unknown username returns 401', async ({ request }) => {
    const res = await request.post('/auth/login', { data: { username: 'ghost', password: 'demo123' } });
    expect(res.status()).toBe(401);
  });

  test('API-19: username is case-sensitive', async ({ request }) => {
    const res = await request.post('/auth/login', { data: { username: 'DEMO', password: 'demo123' } });
    expect(res.status()).toBe(401);
  });

  test('API-20: token without the "Bearer " prefix is rejected', async ({ request }) => {
    const res = await request.get('/tickets', { headers: { Authorization: token } });
    expect(res.status()).toBe(401);
  });

  test('API-21: each login returns a new, unique token', async ({ request }) => {
    const second = await request.post('/auth/login', { data: { username: 'demo', password: 'demo123' } });
    expect((await second.json()).token).not.toBe(token);
  });

  test('API-22: write operations also require a token', async ({ request }) => {
    expect((await request.post('/tickets', { data: { title: 'No auth', priority: 'low' } })).status()).toBe(401);
    expect((await request.patch('/tickets/1', { data: { status: 'closed' } })).status()).toBe(401);
    expect((await request.delete('/tickets/1')).status()).toBe(401);
  });
});

test.describe('Create: boundary and negative cases', () => {
  const invalid = [
    { name: 'whitespace-only title', data: { title: '    ', priority: 'low' } },
    { name: 'title padded to 3+ chars with spaces (" ab ")', data: { title: ' ab ', priority: 'low' } },
    { name: 'numeric title', data: { title: 12345, priority: 'low' } },
    { name: 'null title', data: { title: null, priority: 'low' } },
    { name: 'missing priority', data: { title: 'Valid title' } },
    { name: 'priority in upper case ("HIGH")', data: { title: 'Valid title', priority: 'HIGH' } },
    { name: 'invalid status on create', data: { title: 'Valid title', priority: 'low', status: 'done' } },
  ];

  for (const { name, data } of invalid) {
    test(`API-23: rejects ticket with ${name}`, async ({ request }) => {
      const res = await request.post('/tickets', { headers: auth(), data });
      expect(res.status()).toBe(400);
      expect(Array.isArray((await res.json()).errors)).toBe(true);
    });
  }

  test('API-24: reports every validation error at once', async ({ request }) => {
    const res = await request.post('/tickets', { headers: auth(), data: { title: 'x', priority: 'urgent' } });
    const { errors } = await res.json();
    expect(errors).toHaveLength(2);
  });

  test('API-25: title is trimmed on create', async ({ request }) => {
    const res = await request.post('/tickets', { headers: auth(), data: { title: '  Padded title  ', priority: 'low' } });
    expect((await res.json()).title).toBe('Padded title');
  });

  test('API-26: new tickets always start as "open", even if another status is sent', async ({ request }) => {
    const res = await request.post('/tickets', { headers: auth(), data: { title: 'Start closed?', priority: 'low', status: 'closed' } });
    expect(res.status()).toBe(201);
    expect((await res.json()).status).toBe('open');
  });

  test('API-27: ids are unique and increase', async ({ request }) => {
    const a = await (await request.post('/tickets', { headers: auth(), data: { title: 'First', priority: 'low' } })).json();
    const b = await (await request.post('/tickets', { headers: auth(), data: { title: 'Second', priority: 'low' } })).json();
    expect(b.id).toBeGreaterThan(a.id);
  });

  test('API-28: special characters and emoji in the title are stored as sent', async ({ request }) => {
    const title = `O'Brien <script> "quotes" & émoji 🚀`;
    const res = await request.post('/tickets', { headers: auth(), data: { title, priority: 'medium' } });
    expect(res.status()).toBe(201);
    expect((await res.json()).title).toBe(title);
  });
});

test.describe('Read, update and delete edge cases', () => {
  test('API-29: filtering by an unknown status returns an empty list', async ({ request }) => {
    const res = await request.get('/tickets?status=archived', { headers: auth() });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual([]);
  });

  test('API-30: deleting the same ticket twice returns 404 the second time', async ({ request }) => {
    expect((await request.delete('/tickets/2', { headers: auth() })).status()).toBe(204);
    expect((await request.delete('/tickets/2', { headers: auth() })).status()).toBe(404);
  });

  test('API-31: PATCH on an unknown ticket returns 404', async ({ request }) => {
    const res = await request.patch('/tickets/9999', { headers: auth(), data: { status: 'closed' } });
    expect(res.status()).toBe(404);
  });

  test('API-32: PUT is not supported (405)', async ({ request }) => {
    const res = await request.put('/tickets/1', { headers: auth(), data: { title: 'Replace', priority: 'low' } });
    expect(res.status()).toBe(405);
  });

  test('API-33: PATCH with an empty body leaves the ticket unchanged', async ({ request }) => {
    const before = await (await request.get('/tickets/1', { headers: auth() })).json();
    const res = await request.patch('/tickets/1', { headers: auth(), data: {} });
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual(before);
  });

  test('API-34: PATCH validates the title like create does', async ({ request }) => {
    const res = await request.patch('/tickets/1', { headers: auth(), data: { title: 'ab' } });
    expect(res.status()).toBe(400);
  });

  test('API-35: unknown route returns 404', async ({ request }) => {
    const res = await request.get('/does-not-exist', { headers: auth() });
    expect(res.status()).toBe(404);
  });
});

test.describe('Known bugs (expected to fail until fixed)', () => {
  test('API-17: login with an empty body returns 401 (BUG-002)', async ({ request }) => {
    test.fail(true, 'BUG-002: login with {} returns 200 and a valid token');
    const res = await request.post('/auth/login', { data: {} });
    expect(res.status()).toBe(401);
  });

  test('API-17b: login with only a username returns 401 (BUG-002)', async ({ request }) => {
    test.fail(true, 'BUG-002: login with an unknown user and no password returns a token');
    const res = await request.post('/auth/login', { data: { username: 'ghost' } });
    expect(res.status()).toBe(401);
  });

  test('API-36: non-numeric ticket id returns 404 (BUG-003)', async ({ request }) => {
    test.fail(true, 'BUG-003: /tickets/abc returns the full ticket list with 200');
    const res = await request.get('/tickets/abc', { headers: auth() });
    expect(res.status()).toBe(404);
  });

  test('API-37: ticket id 0 returns 404 (BUG-003)', async ({ request }) => {
    test.fail(true, 'BUG-003: /tickets/0 returns the full ticket list with 200');
    const res = await request.get('/tickets/0', { headers: auth() });
    expect(res.status()).toBe(404);
  });

  test('API-38: PATCH ignores unknown fields (BUG-004)', async ({ request }) => {
    test.fail(true, 'BUG-004: PATCH saves any extra field, e.g. isAdmin');
    const res = await request.patch('/tickets/1', { headers: auth(), data: { status: 'closed', isAdmin: true } });
    expect(await res.json()).not.toHaveProperty('isAdmin');
  });

  test('API-39: title is trimmed on PATCH, like on create (BUG-005)', async ({ request }) => {
    test.fail(true, 'BUG-005: PATCH stores the title with leading/trailing spaces');
    const res = await request.patch('/tickets/1', { headers: auth(), data: { title: '  Updated title  ' } });
    expect((await res.json()).title).toBe('Updated title');
  });
});
