# API Testing – Postman, Newman and Playwright

![API Tests](https://github.com/Nishat9596/API-testing/actions/workflows/api-tests.yml/badge.svg)
![Postman](https://img.shields.io/badge/Postman-FF6C37?logo=postman&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

REST API testing of a **Support Ticket API** in two ways:

- **Postman collection** run from the command line with **Newman**: 18 requests and 48 assertions
- **Playwright API tests** in JavaScript: 52 tests (22 core + 30 edge-case, boundary and auth tests)

Both run automatically on GitHub Actions on every push.

## What's tested

| Area | Examples |
|---|---|
| Authentication | Valid login returns a token; wrong password → 401; missing or invalid token → 401 |
| Read | List tickets, check the response against a JSON schema, filter by status, unknown id → 404 |
| Full lifecycle | Create → read → update → close → delete → confirm 404 |
| Validation (negative tests) | Missing title, title too short or too long, invalid priority or status, broken JSON |
| Boundary values | Title lengths 2/3 (min) and 100/101 (max) |
| Data integrity | `id` can't be changed with PATCH |
| Auth edge cases | Empty login body, unknown or upper-case username, token without `Bearer`, unique tokens, auth on every write |
| More negative and boundary cases | Whitespace-only or padded titles, wrong data types, upper-case priority, all errors reported at once, special characters and emoji |
| Edge cases | Unknown status filter, double delete, PATCH/PUT on unknown or unsupported routes, empty PATCH body |
| Performance | Every response under 500 ms |

## Bugs found by the tests

| Bug | Severity | Status |
|---|---|---|
| [BUG-001](docs/BUG-001-server-crash-on-non-object-body.md): a JSON string as the body crashed the whole server | Critical | Fixed, regression tests added |
| [BUG-002](docs/BUG-002-login-without-credentials.md): login with an empty body returns a valid token | Critical | Open |
| [BUG-003](docs/BUG-003-non-numeric-ticket-id-returns-list.md): `/tickets/abc` and `/tickets/0` return the full list instead of 404 | Major | Open |
| [BUG-004](docs/BUG-004-patch-saves-unknown-fields.md): PATCH saves any extra field (mass assignment) | Major | Open |
| [BUG-005](docs/BUG-005-patch-does-not-trim-title.md): title is trimmed on create but not on update | Minor | Open |

Tests for open bugs are marked with `test.fail()`: they're expected to fail until the bug is fixed, so CI stays green while the bug stays visible. Once a fix lands, the test starts passing, Playwright flags it, and the marker is removed.

## Project structure

```
api/server.js                 Support Ticket API (Node.js, no dependencies) – the system under test
postman/                      Postman collection + local environment
tests/tickets.api.spec.js     Playwright API tests (core)
tests/tickets.edge-cases.spec.js  Edge-case, boundary and auth tests
docs/                         Bug reports
.github/workflows/            CI pipeline (Playwright job + Newman job)
```

## API endpoints

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| GET | `/health` | No | Health check |
| POST | `/auth/login` | No | Returns a token (demo user: `demo` / `demo123`) |
| GET | `/tickets?status=open` | Yes | List tickets, optional status filter |
| GET | `/tickets/:id` | Yes | Get one ticket |
| POST | `/tickets` | Yes | Create a ticket (`title`, `priority`) |
| PATCH | `/tickets/:id` | Yes | Update `title`, `priority` or `status` |
| DELETE | `/tickets/:id` | Yes | Delete a ticket |

## Run it

```bash
npm install

# Playwright API tests (starts the API automatically)
npx playwright test

# Postman collection with Newman
npm start                # in one terminal
npm run test:postman     # in another
```

You can also import `postman/support-ticket-api.postman_collection.json` and `postman/local.postman_environment.json` into Postman and run the collection there.

---
**Nishat Shareef** · QA Tester · Dubai, UAE · [LinkedIn](https://www.linkedin.com/in/nishat-shareef-qa)
