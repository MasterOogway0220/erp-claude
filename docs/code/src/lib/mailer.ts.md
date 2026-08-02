# src/lib/mailer.ts

> The single SMTP transport and From-address builder for every outbound email
> in the ERP.

## Why this exists

These six lines were copy-pasted into five separate routes:

```ts
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
});
```

Copies drift, and these had. Two of the five had ended up with a From address
of `noreply@npspipe.com` — an address on a domain the company does not own
(theirs is `n-pipe.com`) and which the SMTP account has no authority to send
as. Providers reject or spam-file mail like that, and the application sees a
success either way, so invoices and client status reports were being sent from
an address that could not receive a bounce.

Centralising also gave one place to answer "is email even configured?", which
turned out to matter: **production had no SMTP variables set at all.**

## What it does

| Export | Purpose |
|---|---|
| `mailer()` | The configured `nodemailer` transport. Throws if unconfigured. |
| `mailFrom(displayName?)` | The From header, falling back safely. |
| `mailerConfigured()` | Boolean — can mail be sent right now? |
| `missingMailerConfig()` | Which variables are missing, for the message. |
| `smtpPort()` | The resolved port. |

Environment: `SMTP_USER` and `SMTP_PASS` are required. `SMTP_HOST` defaults to
`smtp.gmail.com`, `SMTP_PORT` to `587`, `SMTP_FROM` is optional.

## How it works

### The port/TLS relationship

```ts
secure: port === 465
```

This is the one line most likely to be "simplified" by someone who does not
know the protocol, so: SMTP has two distinct encryption models. Port **465**
is implicit TLS — the connection is encrypted from the first byte. Ports
**587** and **25** start in plaintext and upgrade via a `STARTTLS` command.

All five original copies hardcoded `secure: false`. Point that at a 465
listener and the client waits for a plaintext greeting that the server will
never send, because the server is waiting for a TLS handshake. Neither side
errors. The connection **hangs until the serverless function times out** —
which reads as "email is slow and sometimes fails", one of the harder faults to
diagnose. Deriving `secure` from the port removes the trap.

### The From fallback chain

`SMTP_FROM` if set, otherwise `SMTP_USER`, optionally wrapped with a display
name. Crucially it never falls back to an invented address. The envelope sender
has to be something the authenticated account is permitted to send as; anything
else is at best spam-filed.

### Failing loudly

`mailer()` throws naming the missing variables. Without it, an unconfigured
deployment produces a generic `nodemailer` authentication failure, which sends
people looking at credentials rather than at the fact that no credentials
exist. All five calling routes surface `error.message` to the UI, so the
actionable text reaches the user rather than the log.

## Domain notes

None — infrastructure.

## Gotchas and constraints

- **Configuration is per-deployment, not in the repo.** As of the last audit
  production had exactly four environment variables (`DATABASE_URL`,
  `NEXT_PUBLIC_PRODUCTION_MODE`, `NEXTAUTH_URL`, `NEXTAUTH_SECRET`) — no SMTP
  at all, which is why no client email had ever sent. Check with
  `vercel env ls production` before debugging a mail problem in code.
- **The company's mail is on Zoho**, India region — the domain's MX records
  point at `mx.zoho.com` and the verification token is `.zoho.in`. So the
  intended host is `smtp.zoho.in` on port 465, authenticating as an
  `@n-pipe.com` mailbox with a Zoho *app-specific* password, not the account
  password.
- **SPF already authorises Zoho** (`v=spf1 include:zohomail.com ~all`), so mail
  sent through it passes. There is no DKIM record on Zoho's default selector
  and no DMARC record; neither blocks sending, both would improve inbox
  placement.
- **A new transport is built per call.** No pooling. Fine for the current
  volume and correct for serverless, where a pooled connection would be torn
  down with the function anyway.
- **`mailerConfigured()` checks presence, not validity.** Wrong credentials
  still return `true` and fail at send time.

## Related

- `src/lib/mailer.test.ts` — pins the From fallback and the missing-config list.
- `src/lib/auth/otp.ts` — login codes.
- `src/app/api/quotations/[id]/email/route.tsx`,
  `src/app/api/po-acceptance/[id]/email/route.tsx`,
  `src/app/api/dispatch/invoices/[id]/email/route.tsx`,
  `src/app/api/dispatch/dispatch-notes/[id]/dossier/email/route.tsx`,
  `src/app/api/reports/client-status/[salesOrderId]/email/route.tsx` — the five
  client-facing senders.
- `src/app/api/cron/rfq-reminders/route.ts` — degrades rather than failing when
  mail is unconfigured.
