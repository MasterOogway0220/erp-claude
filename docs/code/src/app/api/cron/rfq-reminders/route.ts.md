# src/app/api/cron/rfq-reminders/route.ts

> `/api/cron/rfq-reminders` — GET

See [../README.md](../README.md) for this module's shared behaviour, and
[the API pattern](../../README.md) for the conventions every route follows.

## What it does

Operates on `rFQVendor`.

- **GET** — Read

## How it works

- **Not company-scoped.** Either catalogue data (deliberately global) or scoped via a parent record — verify which before changing.
- Sends mail through `mailer()`. **SMTP is not configured in production**, so this currently fails with a message naming the missing variables.

## Gotchas

- Confirm the company-scoping story before reusing this as a template.
- Errors return `error.message`, so thrown text reaches the user's toast.

## Related

- `src/lib/rbac.ts`, `src/lib/prisma.ts`
- `src/lib/mailer.ts`
- [Module overview](../README.md)
