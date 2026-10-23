# BUG-001: API server crashes when the request body is a JSON string

| Field | Value |
|---|---|
| Severity | Critical |
| Priority | P1 |
| Status | Fixed (regression tests added) |
| Found by | Automated test API-15 |
| Endpoint | `POST /tickets`, `PATCH /tickets/:id` |

## Steps to reproduce
1. Log in and get a token.
2. Send `POST /tickets` with header `Content-Type: application/json` and this body (a valid JSON **string**, not an object):
   ```
   "just text"
   ```

## Expected result
`400 Bad Request` with a validation error. The API keeps running.

## Actual result
The server process crashes (`TypeError: Cannot use 'in' operator to search for 'status' in just text`). The request fails with `ECONNRESET`, and **every later request fails** until the server is restarted.

## Root cause
The body parser accepted any valid JSON. The validation code assumed the body was an object and used the `in` operator, which throws on strings.

## Fix
The body parser now accepts only JSON objects. Strings, numbers, arrays and `null` are rejected with `400`.

## Regression tests
`API-15b` sends a JSON string, an array and `null`, checks for `400`, and then calls `/health` to confirm the server is still running.

## Why it matters
One bad request from any client could take the whole service down (a denial-of-service risk).
