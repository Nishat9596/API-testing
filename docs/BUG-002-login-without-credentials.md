# BUG-002: Login succeeds with no username or password

| Field | Value |
|---|---|
| Severity | Critical |
| Priority | P1 |
| Status | Open |
| Found by | Automated tests API-17, API-17b |
| Endpoint | `POST /auth/login` |

## Steps to reproduce
1. Send `POST /auth/login` with header `Content-Type: application/json` and body `{}`.

## Expected result
`401 Unauthorized` with "Invalid username or password". No token is issued.

## Actual result
`200 OK` with a valid token. The token works on every `/tickets` endpoint, including create, update and delete. The same happens with `{"username": "anyone"}` and no password.

## Root cause
The check `USERS[body.username] !== body.password` compares `undefined` with `undefined` when the user doesn't exist and no password is sent, so it passes.

## Suggested fix
Reject the request unless `username` and `password` are both non-empty strings and the user exists, before comparing passwords.

## Why it matters
Anyone can read, change and delete every ticket without an account (authentication bypass).
