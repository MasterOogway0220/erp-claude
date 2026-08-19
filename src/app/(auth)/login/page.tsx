"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { requestLoginOtp } from "@/lib/auth/otp-client";
import { DB_DOWN_MESSAGE, databaseIsDown } from "@/lib/auth/db-down";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LogIn,
  Loader2,
  Eye,
  EyeOff,
  ArrowRightLeft,
  ShieldCheck,
  BarChart3,
} from "lucide-react";

// 2FA ships dormant. The server is the authority (OTP_ENABLED); this only
// decides whether the browser bothers with the code step, so with it unset the
// page signs in exactly as it always has — one request, no pre-flight, no code
// field. Set this together with OTP_ENABLED when turning 2FA on; on its own it
// does nothing, and without it the server would ask for a code the UI never
// collects.
const TWO_FACTOR_UI = process.env.NEXT_PUBLIC_OTP_ENABLED === "true";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [notice, setNotice] = useState("");

  // Completes sign-in. `code` is passed explicitly rather than read from state
  // so the auto-submit on the sixth digit doesn't race the state update.
  const finishSignIn = async (code: string) => {
    const result = await signIn("credentials", {
      email,
      password,
      otp: code,
      redirect: false,
    });
    if (result?.error) {
      // next-auth collapses authorize() failures to a generic code, so the
      // specific reason (expired / too many attempts) isn't available here —
      // and a database that cannot be reached arrives looking exactly like a
      // wrong password. Ask the health endpoint which of the two it was before
      // blaming the user's credentials: a DB outage here has twice been
      // diagnosed as "everyone's password stopped working" (Hostinger drops
      // Vercel's egress IPs on port 3306 when the Remote MySQL allowlist
      // loses them), and the wrong message is what sent people looking in the
      // wrong place for hours.
      setError(
        (await databaseIsDown())
          ? DB_DOWN_MESSAGE
          : code
            ? "That code was not accepted. Check it, or request a new one."
            : "Invalid email or password"
      );
      setLoading(false);
      return;
    }
    router.push("/");
    router.refresh();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setNotice("");
    setLoading(true);

    if (otpStep) {
      await finishSignIn(otp.trim());
      return;
    }

    // 2FA off: straight to sign-in, same single round trip as before it existed.
    if (!TWO_FACTOR_UI) {
      await finishSignIn("");
      return;
    }

    // Step 1: verify the password and, when 2FA is on, mail a code. A failure
    // here must not fall through to signIn — that would skip the second factor
    // whenever the endpoint is down.
    const step1 = await requestLoginOtp(email, password);
    if (!step1.ok) {
      setError(step1.error);
      setLoading(false);
      return;
    }
    if (!step1.otpRequired) {
      await finishSignIn("");
      return;
    }

    setOtpStep(true);
    setNotice(
      step1.sent
        ? `We sent a 6-digit code to ${email}. It expires in 10 minutes.`
        : `A code was already sent to ${email}. Check your inbox before requesting another.`
    );
    setLoading(false);
  };

  const resendCode = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    const again = await requestLoginOtp(email, password);
    if (!again.ok) setError(again.error);
    else
      setNotice(
        again.sent
          ? "A new code is on its way."
          : "Please wait a minute before requesting another code."
      );
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Branding */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col justify-center items-center p-12 text-white text-center"
        style={{
          background: "linear-gradient(135deg, oklch(0.40 0.18 260) 0%, oklch(0.32 0.16 280) 50%, oklch(0.28 0.14 290) 100%)",
        }}
      >
        {/* Subtle pattern overlay */}
        <div className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Middle section - Main heading & features */}
        <div className="relative z-10 space-y-8 flex flex-col items-center">
          <div className="space-y-3">
            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
              Enterprise Resource
              <br />
              Planning
            </h2>
            <p className="text-lg text-white/70 max-w-md mx-auto">
              Streamline your piping and tubular trading operations with an integrated management platform.
            </p>
          </div>

          <div className="space-y-4 max-w-md mx-auto">
            <FeatureItem
              icon={<ArrowRightLeft className="h-5 w-5" />}
              title="Quotation to Cash"
              description="Complete workflow from quotation, purchase orders through to invoicing and dispatch."
            />
            <FeatureItem
              icon={<ShieldCheck className="h-5 w-5" />}
              title="Quality Management"
              description="Built-in QC inspection workflows, test certificates, and compliance tracking."
            />
            <FeatureItem
              icon={<BarChart3 className="h-5 w-5" />}
              title="Real-time Inventory"
              description="Live stock tracking across warehouses with reservation management and audit trails."
            />
          </div>
        </div>

        {/* Bottom section */}
        <div className="absolute z-10 bottom-12 left-0 right-0 text-center">
          <p className="text-sm text-white/40">
            &copy; {new Date().getFullYear()} NPS Piping Solutions. All rights reserved.
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile branding - shown only on small screens */}
          <div className="lg:hidden text-center space-y-1">
            <h1 className="text-xl font-semibold text-foreground">
              NPS Piping Solutions
            </h1>
            <p className="text-sm text-muted-foreground">
              Enterprise Resource Planning
            </p>
          </div>

          <Card className="border-border/60 shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <CardTitle className="text-2xl font-semibold tracking-tight">
                {otpStep ? "Enter your login code" : "Sign in"}
              </CardTitle>
              <CardDescription>
                {otpStep
                  ? "We emailed a 6-digit code to your registered address"
                  : "Enter your credentials to access the system"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                {otpStep ? (
                  <div className="space-y-2">
                    <Label htmlFor="otp">6-digit code</Label>
                    <Input
                      id="otp"
                      // Not type="number": that strips leading zeros, and a
                      // code like 004821 has to survive being typed.
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      placeholder="000000"
                      value={otp}
                      onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      required
                      autoFocus
                      autoComplete="one-time-code"
                      className="h-10 text-center text-lg tracking-[0.5em] font-mono"
                    />
                    <button
                      type="button"
                      onClick={resendCode}
                      disabled={loading}
                      className="text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors disabled:opacity-50"
                    >
                      Didn&apos;t get it? Send another code
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="you@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Enter your password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          autoComplete="current-password"
                          className="h-10 pr-10"
                        />
                        <button
                          type="button"
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                          aria-label={showPassword ? "Hide password" : "Show password"}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </>
                )}

                {notice && (
                  <div className="rounded-md bg-muted border px-3 py-2">
                    <p className="text-sm text-muted-foreground">{notice}</p>
                  </div>
                )}

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 font-medium"
                  disabled={loading || (otpStep && otp.length !== 6)}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  {otpStep ? "Verify & Sign In" : "Sign In"}
                </Button>

                {otpStep && (
                  <button
                    type="button"
                    onClick={() => {
                      setOtpStep(false);
                      setOtp("");
                      setError("");
                      setNotice("");
                    }}
                    className="w-full text-xs text-muted-foreground hover:text-foreground hover:underline transition-colors"
                  >
                    Use a different account
                  </button>
                )}
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            <a href="/superadmin/login" className="text-muted-foreground/60 hover:text-muted-foreground hover:underline transition-colors">
              Super Admin Portal
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start text-left">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/10 border border-white/10">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-white/60 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
