# BUG-004: PATCH saves any extra field sent in the body

| Field | Value |
|---|---|
| Severity | Major |
| Priority | P2 |
| Status | Open |
| Found by | Automated test API-38 |
| Endpoint | `PATCH /tickets/:id` |

## Steps to reproduce
1. Log in and get a token.
2. Send `PATCH /tickets/1` with body `{"status": "closed", "isAdmin": true}`.

## Expected result
`200 OK`. The ticket's status changes and `isAdmin` is ignored (or the request is rejected with `400`).

## Actual result
`isAdmin: true` is saved on the ticket and returned by every later `GET`.

## Root cause
The handler uses `Object.assign(ticket, body)`, which copies every field from the request, not only `title`, `priority` and `status`.

## Suggested fix
Copy only the allowed fields (`title`, `priority`, `status`) onto the ticket.

## Why it matters
This is a mass-assignment issue: clients can store any data on a ticket, and in a real system could overwrite fields like owner or permissions.
