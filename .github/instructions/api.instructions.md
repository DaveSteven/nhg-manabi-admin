---
applyTo: "src/api/**/*.ts,src/utils/http.ts"
description: "Use when editing API clients, schemas, HTTP behavior, response types, or endpoints. Keywords: api, http, schema, zod, endpoint, auth, users."
---

# API Instructions

## Purpose

Maintain strict API contracts between the admin client and backend.

## Do

- Keep request/response shapes schema-driven and type-safe.
- Reuse endpoint constants and shared response helpers.
- Keep naming stable for endpoint keys and mutation/query keys.

## Do Not

- Do not return ad-hoc response shapes for one-off convenience.
- Do not bypass schema parsing in new client mutations/queries.
- Do not mix unrelated domain endpoints in the same module.

## Validation

- Verify TypeScript and schema parsing paths compile cleanly.
- Run: `vp check --no-fmt`
