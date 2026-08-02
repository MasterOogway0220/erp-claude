import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { mailFrom, mailer } from "@/lib/mailer";
import {
  OTP_RESEND_COOLDOWN_MS,
  OTP_TTL_MS,
  type OtpCheck,
  generateCode,
  otpUsable,
} from "./otp-policy";

// Two-factor login: after the password checks out, a 6-digit code goes to the
// user's registered address and must be entered before a session is issued.
// The rules live in otp-policy.ts; this file is the DB and SMTP side.
export * from "./otp-policy";

/**
 * Issue a code for this address and mail it. Returns false when the address is
 * still inside its cooldown, so the caller can say "already sent" instead of
 * spamming the inbox on every click.
 */
export async function issueOtp(email: string, name: string): Promise<boolean> {
  const now = new Date();
  const recent = await prisma.emailOtp.findFirst({
    where: { email, createdAt: { gt: new Date(now.getTime() - OTP_RESEND_COOLDOWN_MS) } },
    orderBy: { createdAt: "desc" },
  });
  if (recent && !recent.consumedAt) return false;

  const code = generateCode();
  // Supersede any live code for this address: two valid codes at once means a
  // stale mail still works, which is what single-use is meant to stop.
  await prisma.emailOtp.updateMany({
    where: { email, consumedAt: null },
    data: { consumedAt: now },
  });
  const row = await prisma.emailOtp.create({
    data: {
      email,
      codeHash: await bcrypt.hash(code, 10),
      expiresAt: new Date(now.getTime() + OTP_TTL_MS),
    },
  });

  try {
    await mailer().sendMail({
      from: mailFrom("NPS Piping Solutions"),
      to: email,
      subject: `${code} is your NPS ERP login code`,
      text: `Your login code is ${code}. It expires in 10 minutes.\n\nIf you did not try to sign in, change your password.`,
      html: `
      <div style="font-family:Arial,sans-serif;max-width:480px">
        <p>Hello ${name},</p>
        <p>Your NPS ERP login code is:</p>
        <p style="font-size:32px;font-weight:bold;letter-spacing:6px;margin:24px 0">${code}</p>
        <p style="color:#666">It expires in 10 minutes and can be used once.</p>
        <p style="color:#666">If you did not try to sign in, change your password.</p>
      </div>`,
    });
  } catch (err) {
    // Drop the code we just stored. Leaving it would start the resend cooldown
    // on a mail that never went out, so the next attempt would be refused with
    // "a code was already sent" for a code nobody can possibly have.
    await prisma.emailOtp.delete({ where: { id: row.id } }).catch(() => {});
    throw err;
  }
  return true;
}

/**
 * Check a submitted code. Consumes it on success; counts the attempt on
 * failure so a live code can't be brute-forced.
 */
export async function verifyOtp(email: string, code: string): Promise<OtpCheck> {
  const now = new Date();
  const row = await prisma.emailOtp.findFirst({
    where: { email, consumedAt: null },
    orderBy: { createdAt: "desc" },
  });

  const usable = otpUsable(row, now);
  if (!usable.ok) return usable;

  if (!(await bcrypt.compare(code, row!.codeHash))) {
    await prisma.emailOtp.update({
      where: { id: row!.id },
      data: { attempts: { increment: 1 } },
    });
    return { ok: false, reason: "WRONG_CODE" };
  }

  await prisma.emailOtp.update({ where: { id: row!.id }, data: { consumedAt: now } });
  return { ok: true };
}
