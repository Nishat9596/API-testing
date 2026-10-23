// Support Ticket API – a small REST API used as the system under test.
// No dependencies: run with `node api/server.js` (default port 3000).

const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const USERS = { demo: 'demo123' };
const PRIORITIES = ['low', 'medium', 'high'];
const STATUSES = ['open', 'in_progress', 'closed'];

let tickets = [];
let nextId = 1;
const tokens = new Set();

function seed() {
  tickets = [
    { id: 1, title: 'Cannot log in to the app', priority: 'high', status: 'open' },
    { id: 2, title: 'Refund not received', priority: 'medium', status: 'in_progress' },
  ];
  nextId = 3;
}
seed();

function send(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(body === undefined ? '' : JSON.stringify(body));
}

function readJson(req) {
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk) => (data += chunk));
    req.on('end', () => {
      if (!data) return resolve({});
      try {
        const parsed = JSON.parse(data);
        // Only a JSON object is a valid body (not a string, number, array or null).
        resolve(parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : null);
      } catch {
        resolve(null);
      }
    });
  });
}

function isAuthorised(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') && tokens.has(header.slice(7));
}

function validateTicket(body, partial = false) {
  const errors = [];
  if (!partial || 'title' in body) {
    if (typeof body.title !== 'string' || body.title.trim().length < 3) errors.push('title must be at least 3 characters');
    else if (body.title.length > 100) errors.push('title must be at most 100 characters');
  }
  if (!partial || 'priority' in body) {
    if (!PRIORITIES.includes(body.priority)) errors.push(`priority must be one of: ${PRIORITIES.join(', ')}`);
  }
  if ('status' in body && !STATUSES.includes(body.status)) errors.push(`status must be one of: ${STATUSES.join(', ')}`);
  return errors;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  const parts = url.pathname.split('/').filter(Boolean);

  if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok' });

  if (req.method === 'POST' && url.pathname === '/reset') { seed(); return send(res, 204); }

  if (req.method === 'POST' && url.pathname === '/auth/login') {
    const body = await readJson(req);
    if (!body || USERS[body.username] !== body.password) return send(res, 401, { error: 'Invalid username or password' });
    const token = crypto.randomBytes(16).toString('hex');
    tokens.add(token);
    return send(res, 200, { token });
  }

  if (parts[0] !== 'tickets') return send(res, 404, { error: 'Not found' });
  if (!isAuthorised(req)) return send(res, 401, { error: 'Missing or invalid token' });

  const id = parts[1] ? Number(parts[1]) : null;
  const ticket = id ? tickets.find((t) => t.id === id) : null;

  if (!id) {
    if (req.method === 'GET') {
      const status = url.searchParams.get('status');
      return send(res, 200, status ? tickets.filter((t) => t.status === status) : tickets);
    }
    if (req.method === 'POST') {
      const body = await readJson(req);
      if (!body) return send(res, 400, { errors: ['body must be valid JSON'] });
      const errors = validateTicket(body);
      if (errors.length) return send(res, 400, { errors });
      const created = { id: nextId++, title: body.title.trim(), priority: body.priority, status: 'open' };
      tickets.push(created);
      return send(res, 201, created);
    }
    return send(res, 405, { error: 'Method not allowed' });
  }

  if (!ticket) return send(res, 404, { error: `Ticket ${parts[1]} not found` });

  if (req.method === 'GET') return send(res, 200, ticket);
  if (req.method === 'PATCH') {
    const body = await readJson(req);
    if (!body) return send(res, 400, { errors: ['body must be valid JSON'] });
    const errors = validateTicket(body, true);
    if (errors.length) return send(res, 400, { errors });
    Object.assign(ticket, body, { id: ticket.id });
    return send(res, 200, ticket);
  }
  if (req.method === 'DELETE') {
    tickets = tickets.filter((t) => t.id !== ticket.id);
    return send(res, 204);
  }
  return send(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => console.log(`Support Ticket API running on http://localhost:${PORT}`));
