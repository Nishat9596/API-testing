// @ts-check
// API tests for the Support Ticket API using Playwright's request fixture.
const { test, expect } = require('@playwright/test');

let token;

test.beforeEach(async ({ request }) => {
  await request.post('/reset');
  const login = await request.post('/auth/login', { data: { username: 'demo', password: 'demo123' } });
  token = (await login.json()).token;
});

const auth = () => ({ Authorization: `Bearer ${token}` });

test.describe('Health and authentication', () => {
  test('API-01: health check returns 200', async ({ request }) => {
    const res = await request.get('/health');
    expect(res.status()).toBe(200);
    expect(await res.json()).toEqual({ status: 'ok' });
  });

  test('API-02: login with valid credentials returns a token', async ({ request }) => {
    const res = await request.post('/auth/login', { data: { username: 'demo', password: 'demo123' } });
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toMatch(/^[a-f0-9]{32}$/);
  });

  test('API-03: login with a wrong password returns 401', async ({ request }) => {
    const res = await request.post('/auth/login', { data: { username: 'demo', password: 'wrong' } });
    expect(res.status()).toBe(401);
  });

  test('API-04: tickets cannot be read without a token', async ({ request }) => {
    const res = await request.get('/tickets');
    expect(res.status()).toBe(401);
  });

  test('API-05: tickets cannot be read with an invalid token', async ({ request }) => {
    const res = await request.get('/tickets', { headers: { Authorization: 'Bearer not-a-real-token' } });
    expect(res.status()).toBe(401);
  });
});

test.describe('Read tickets', () => {
  test('API-06: list tickets returns an array with the right fields', async ({ request }) => {
    const res = await request.get('/tickets', { headers: auth() });
    expect(res.status()).toBe(200);
    expect(res.headers()['content-type']).toContain('application/json');
    const tickets = await res.json();
    expect(tickets.length).toBeGreaterThan(0);
    for (const t of tickets) {
      expect(t).toEqual(expect.objectContaining({
        id: expect.any(Number),
        title: expect.any(String),
        priority: expect.stringMatching(/^(low|medium|high)$/),
        status: expect.stringMatching(/^(open|in_progress|closed)$/),
      }));
    }
  });

  test('API-07: filter tickets by status', async ({ request }) => {
    const res = await request.get('/tickets?status=open', { headers: auth() });
    const tickets = await res.json();
    expect(tickets.length).toBeGreaterThan(0);
    expect(tickets.every((t) => t.status === 'open')).toBe(true);
  });

  test('API-08: get one ticket by id', async ({ request }) => {
    const res = await request.get('/tickets/1', { headers: auth() });
    expect(res.status()).toBe(200);
    expect((await res.json()).id).toBe(1);
  });

  test('API-09: unknown ticket id returns 404', async ({ request }) => {
    const res = await request.get('/tickets/9999', { headers: auth() });
    expect(res.status()).toBe(404);
  });
});

test.describe('Create, update and delete', () => {
  test('API-10: full ticket lifecycle (create → update → close → delete)', async ({ request }) => {
    const created = await request.post('/tickets', {
      headers: auth(),
      data: { title: 'Chatbot gives wrong refund policy', priority: 'high' },
    });
    expect(created.status()).toBe(201);
    const ticket = await created.json();
    expect(ticket).toMatchObject({ title: 'Chatbot gives wrong refund policy', priority: 'high', status: 'open' });

    const updated = await request.patch(`/tickets/${ticket.id}`, { headers: auth(), data: { status: 'in_progress' } });
    expect(updated.status()).toBe(200);
    expect((await updated.json()).status).toBe('in_progress');

    const closed = await request.patch(`/tickets/${ticket.id}`, { headers: auth(), data: { status: 'closed' } });
    expect((await closed.json()).status).toBe('closed');

    const deleted = await request.delete(`/tickets/${ticket.id}`, { headers: auth() });
    expect(deleted.status()).toBe(204);

    const after = await request.get(`/tickets/${ticket.id}`, { headers: auth() });
    expect(after.status()).toBe(404);
  });

  test('API-11: id cannot be changed with PATCH', async ({ request }) => {
    const res = await request.patch('/tickets/1', { headers: auth(), data: { id: 500, status: 'closed' } });
    expect((await res.json()).id).toBe(1);
  });
});

test.describe('Validation (negative tests)', () => {
  const invalidTickets = [
    { name: 'missing title', data: { priority: 'low' }, error: 'title' },
    { name: 'title too short (2 chars)', data: { title: 'ab', priority: 'low' }, error: 'title' },
    { name: 'title too long (101 chars)', data: { title: 'a'.repeat(101), priority: 'low' }, error: 'title' },
    { name: 'invalid priority', data: { title: 'Valid title', priority: 'urgent' }, error: 'priority' },
  ];

  for (const { name, data, error } of invalidTickets) {
    test(`API-12: rejects ticket with ${name}`, async ({ request }) => {
      const res = await request.post('/tickets', { headers: auth(), data });
      expect(res.status()).toBe(400);
      const body = await res.json();
      expect(body.errors.join(' ')).toContain(error);
    });
  }

  test('API-13: accepts boundary title lengths (3 and 100 chars)', async ({ request }) => {
    for (const title of ['abc', 'a'.repeat(100)]) {
      const res = await request.post('/tickets', { headers: auth(), data: { title, priority: 'low' } });
      expect(res.status()).toBe(201);
    }
  });

  test('API-14: rejects an invalid status update', async ({ request }) => {
    const res = await request.patch('/tickets/1', { headers: auth(), data: { status: 'done' } });
    expect(res.status()).toBe(400);
  });

  test('API-15: rejects a body that is not valid JSON', async ({ request }) => {
    const res = await request.post('/tickets', {
      headers: { ...auth(), 'Content-Type': 'application/json' },
      data: Buffer.from('{"title": "broken"'),
    });
    expect(res.status()).toBe(400);
  });

  // Regression test for BUG-001: a JSON string or array as the body crashed the server.
  for (const [name, body] of [['a JSON string', '"just text"'], ['a JSON array', '[1, 2]'], ['null', 'null']]) {
    test(`API-15b: rejects ${name} as the body without crashing`, async ({ request }) => {
      const res = await request.post('/tickets', {
        headers: { ...auth(), 'Content-Type': 'application/json' },
        data: Buffer.from(body),
      });
      expect(res.status()).toBe(400);
      expect((await request.get('/health')).status()).toBe(200);
    });
  }
});

test('API-16: responds within 500 ms', async ({ request }) => {
  const start = Date.now();
  await request.get('/tickets', { headers: auth() });
  expect(Date.now() - start).toBeLessThan(500);
});
