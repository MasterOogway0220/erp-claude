import nodemailer from "nodemailer";

// One transport for every outbound mail — quotations, PO acceptances,
// invoices, dispatch dossiers, client status reports and login codes. These
// six lines used to be copy-pasted into each route, which is how two of them
// ended up with a different (and unsendable) From address.

const REQUIRED = ["SMTP_USER", "SMTP_PASS"] as const;

/** Which SMTP settings are missing. Empty array means mail can be sent. */
export function missingMailerConfig(): string[] {
  return REQUIRED.filter((k) => !process.env[k]);
}

export function mailerConfigured(): boolean {
  return missingMailerConfig().length === 0;
}

export function smtpPort(): number {
  return parseInt(process.env.SMTP_PORT || "587", 10);
}

/**
 * Build the shared transport. Throws a message that names the missing
 * variables — a nodemailer auth failure on its own reads as a generic
 * "Invalid login" and sends people hunting in the wrong place.
 */
export function mailer() {
  const missing = missingMailerConfig();
  if (missing.length) {
    throw new Error(
      `Email is not configured on this deployment: set ${missing.join(", ")} in the environment.`
    );
  }
  const port = smtpPort();
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port,
    // 465 is implicit TLS; 587 and 25 start plain and upgrade via STARTTLS.
    // Sending secure:false to a 465 listener hangs until the serverless
    // function times out instead of failing, so derive it from the port.
    secure: port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

/**
 * The From header. Falls back to the authenticated SMTP user, never to an
 * invented address: mail providers reject or spam-file a sender the account
 * isn't authorised to send as, which is silent from the app's point of view.
 */
export function mailFrom(displayName?: string): string {
  if (process.env.SMTP_FROM) return process.env.SMTP_FROM;
  const user = process.env.SMTP_USER ?? "";
  return displayName ? `"${displayName}" <${user}>` : user;
}
