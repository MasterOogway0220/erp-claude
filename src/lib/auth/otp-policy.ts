// Rules for the emailed login code and the session lifetime. Kept free of
// Prisma and nodemailer so they can be exercised without a database or an SMTP
// server — otp.ts holds the parts that actually touch the world.
import { randomInt } from "node:crypto";

// Off unless OTP_ENABLED=true. That default is deliberate: if SMTP is
// misconfigured, turning this on locks every user out of the ERP, so it has to
// be an explicit switch that can be flipped back off without a code change.
export const OTP_ENABLED = process.env.OTP_ENABLED === "true";

export const OTP_TTL_MS = 10 * 60 * 1000; // code is valid for 10 minutes
export const OTP_MAX_ATTEMPTS = 5; // wrong guesses before the code is burned
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // one mail per address per minute

// 24h from sign-in, not from last activity. next-auth's own maxAge is a
// sliding window that re-issues on every session poll, so a user who keeps a
// tab open is never forced to re-authenticate. This is the absolute cap.
export const SESSION_ABSOLUTE_MS = 24 * 60 * 60 * 1000;

export type OtpCheck =
  | { ok: true }
  | { ok: false; reason: "NO_CODE" | "EXPIRED" | "TOO_MANY_ATTEMPTS" | "WRONG_CODE" };

/** The stored code's state, independent of Prisma. */
export interface StoredOtp {
  expiresAt: Date;
  attempts: number;
  consumedAt: Date | null;
}

/** Is this stored code still usable right now? */
export function otpUsable(row: StoredOtp | null, now: Date): OtpCheck {
  if (!row || row.consumedAt) return { ok: false, reason: "NO_CODE" };
  if (row.expiresAt.getTime() <= now.getTime()) return { ok: false, reason: "EXPIRED" };
  if (row.attempts >= OTP_MAX_ATTEMPTS) return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
  return { ok: true };
}

/** True once the session has outlived its absolute 24h window. */
export function sessionExpired(loginAt: number | undefined, now: number): boolean {
  if (!loginAt) return true; // no stamp = pre-2FA token, force a fresh login
  return now - loginAt >= SESSION_ABSOLUTE_MS;
}

/** Cryptographically random 6-digit code, zero-padded. randomInt is unbiased. */
export function generateCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export const OTP_ERRORS: Record<string, string> = {
  NO_CODE: "No login code was requested. Start again.",
  EXPIRED: "That login code has expired. Request a new one.",
  TOO_MANY_ATTEMPTS: "Too many wrong codes. Request a new one.",
  WRONG_CODE: "Incorrect login code",
};
