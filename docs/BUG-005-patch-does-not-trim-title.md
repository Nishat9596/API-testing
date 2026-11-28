# BUG-005: Title is not trimmed on update

| Field | Value |
|---|---|
| Severity | Minor |
| Priority | P3 |
| Status | Open |
| Found by | Automated test API-39 |
| Endpoint | `PATCH /tickets/:id` |

## Steps to reproduce
1. Log in and get a token.
2. Send `PATCH /tickets/1` with body `{"title": "  Updated title  "}`.

## Expected result
The title is saved as `Updated title`, the same way `POST /tickets` trims it.

## Actual result
The title is saved with the spaces: `"  Updated title  "`.

## Root cause
`POST` calls `title.trim()` before saving, but `PATCH` saves the body as sent.

## Suggested fix
Trim the title in `PATCH` too (ideally in one shared function used by both).

## Why it matters
Inconsistent data: searches, sorting and duplicate checks can miss tickets with padded titles.
