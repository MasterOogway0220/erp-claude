import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { OTP_ENABLED } from "@/lib/auth/otp-policy";
import { issueOtp } from "@/lib/auth/otp";

// Vercel serverless: SMTP handshakes are slow, same allowance as the other
// mail routes.
export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Step 1 of login: the password is checked here and, if it holds, a one-time
// code goes to the account's registered address. The session itself is still
// issued by NextAuth in step 2 — this route never logs anybody in.
export async function POST(request: NextRequest) {
  try {
    if (!OTP_ENABLED) {
      return NextResponse.json({ otpRequired: false });
    }

    const { email, password } = await request.json();
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { email: true, name: true, isActive: true, passwordHash: true },
    });

    // Same response whether the address is unknown, inactive, or the password
    // is wrong — otherwise this endpoint becomes a way to enumerate accounts
    // and test passwords without ever attempting a login.
    const passwordOk =
      !!user && user.isActive && (await bcrypt.compare(password, user.passwordHash));
    if (!passwordOk) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
    }

    // A failure to send must not read as "code sent" — the user would sit
    // waiting for a mail that is never coming.
    const sent = await issueOtp(user!.email, user!.name);
    return NextResponse.json({ otpRequired: true, sent });
  } catch (error) {
    console.error("Error issuing login OTP:", error);
    return NextResponse.json(
      { error: "Could not send the login code. Contact your administrator." },
      { status: 500 }
    );
  }
}
