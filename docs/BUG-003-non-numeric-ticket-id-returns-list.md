# BUG-003: Invalid ticket id returns the full ticket list

| Field | Value |
|---|---|
| Severity | Major |
| Priority | P2 |
| Status | Open |
| Found by | Automated tests API-36, API-37 |
| Endpoint | `GET /tickets/:id` (also PATCH and DELETE) |

## Steps to reproduce
1. Log in and get a token.
2. Send `GET /tickets/abc` (or `GET /tickets/0`).

## Expected result
`404 Not Found` (or `400 Bad Request` for a non-numeric id).

## Actual result
`200 OK` with the list of **all** tickets, as if `GET /tickets` was called. `PATCH /tickets/abc` and `DELETE /tickets/abc` return `405`.

## Root cause
`Number('abc')` is `NaN` and `Number('0')` is `0`. Both are falsy, so the code treats the request as having no id.

## Suggested fix
Check whether an id segment exists (`parts[1] !== undefined`), then require it to be a positive integer; otherwise return `404`.

## Why it matters
Clients that build URLs from bad data get a list instead of an error, which can show the wrong data in the UI.
