# API Testing – Postman, Newman and Playwright

![API Tests](https://github.com/Nishat9596/API-testing/actions/workflows/api-tests.yml/badge.svg)
![Postman](https://img.shields.io/badge/Postman-FF6C37?logo=postman&logoColor=white)
![Playwright](https://img.shields.io/badge/Playwright-2EAD33?logo=playwright&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?logo=javascript&logoColor=black)

REST API testing of a **Support Ticket API** in two ways:

- **Postman collection** run from the command line with **Newman**: 18 requests and 48 assertions
- **Playwright API tests** in JavaScript: 22 tests

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
| Performance | Every response under 500 ms |

## Bug found by the tests
Automated test API-15 found that sending a JSON **string** instead of an object **crashed the whole server**. See the full bug report: [`docs/BUG-001`](docs/BUG-001-server-crash-on-non-object-body.md). The bug is fixed, and regression tests now make sure it can't come back.

## Project structure

```
api/server.js                 Support Ticket API (Node.js, no dependencies) – the system under test
postman/                      Postman collection + local environment
tests/tickets.api.spec.js     Playwright API tests
docs/                         Bug report
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
