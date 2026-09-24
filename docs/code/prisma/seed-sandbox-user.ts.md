# prisma/seed-sandbox-user.ts

> Creates or resets the sandbox login, Akash.

## Why this exists

The sandbox login is an ordinary `User` row with `isSandbox = true`. See
[the sandbox module](../src/lib/sandbox/README.md).

## What it does

Upserts `akash.sandbox@demo.local` — name `Akash`, role `ADMIN`,
`isSandbox: true`, active, password `Akash@Sandbox#2026` (bcrypt, 10 rounds,
as `api/admin/users`) — in the company `SANDBOX_COMPANY_ID`, default
`cmmrs9ytr0001panemoxnq3gf` (N-Pipe Solutions Inc. in production). Fails if
the company does not exist.

```sh
DATABASE_URL=... npx tsx prisma/seed-sandbox-user.ts
```

## How it works

One-connection client, `upsert` by email, so re-running resets the password,
role and company.

## Gotchas and constraints

- **Run the first sandbox refresh after this**, so Akash's row is in
  `sbx_User` — rows he creates reference him.
- Needs the `User.isSandbox` column (migration `20260924120000_user_is_sandbox`).
- ADMIN is OTP-exempt, so the login needs no email.

## Related

- `src/lib/sandbox/refresh.ts`, `prisma/migrations/20260924120000_user_is_sandbox`.
