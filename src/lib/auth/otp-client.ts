/**
 * Step 1 of login, shared by the staff and super-admin portals: hand the
 * password to the server, which answers whether a one-time code is needed and
 * mails it if so. Kept in one place because getting the failure path wrong is
 * a security bug — a caller that falls through to signIn() on an error would
 * skip the second factor entirely.
 */
export type OtpRequest =
  | { ok: true; otpRequired: boolean; sent: boolean }
  | { ok: false; error: string };

export async function requestLoginOtp(email: string, password: string): Promise<OtpRequest> {
  let res: Response;
  try {
    res = await fetch("/api/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    return { ok: false, error: "Could not reach the server. Check your connection." };
  }

  if (res.status === 401) return { ok: false, error: "Invalid email or password" };

  const body = await res.json().catch(() => null);
  if (!res.ok) {
    return { ok: false, error: body?.error || "Could not start sign-in. Try again." };
  }
  return { ok: true, otpRequired: !!body?.otpRequired, sent: !!body?.sent };
}
