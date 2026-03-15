"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
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
import { LogIn, Loader2, Eye, EyeOff, Shield, Building2, Users, Database } from "lucide-react";

export default function SuperAdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid email or password");
      setLoading(false);
    } else {
      // Verify the user is a SUPER_ADMIN
      try {
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        if (session?.user?.role !== "SUPER_ADMIN") {
          // Sign out non-super-admin users
          await signIn("credentials", { redirect: false }); // This will fail and clear
          setError("Access denied. This portal is for Super Admins only.");
          setLoading(false);
          // Force sign out
          await fetch("/api/auth/signout", { method: "POST" });
          return;
        }
      } catch {
        // proceed anyway
      }
      router.push("/superadmin");
      router.refresh();
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Dark Theme */}
      <div
        className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden flex-col justify-between p-12 text-white"
        style={{
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
        }}
      >
        {/* Grid pattern overlay */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='40' height='40' viewBox='0 0 40 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M0 0h1v1H0V0zm20 0h1v1h-1V0zM0 20h1v1H0v-1zm20 20h1v1h-1v-1z'/%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Top */}
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/20 border border-red-500/30">
              <Shield className="h-5 w-5 text-red-400" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Master Control Panel
              </h1>
              <p className="text-xs text-white/50">Super Administrator Access</p>
            </div>
          </div>
        </div>

        {/* Middle */}
        <div className="relative z-10 space-y-8">
          <div className="space-y-3">
            <h2 className="text-4xl xl:text-5xl font-bold tracking-tight leading-tight">
              System
              <br />
              Administration
            </h2>
            <p className="text-lg text-white/50 max-w-md">
              Manage companies, users, and system-wide settings across all organizations.
            </p>
          </div>

          <div className="space-y-4 max-w-md">
            <FeatureItem
              icon={<Building2 className="h-5 w-5" />}
              title="Company Management"
              description="Create and manage multiple companies with independent data isolation."
            />
            <FeatureItem
              icon={<Users className="h-5 w-5" />}
              title="User & Role Control"
              description="Assign company admins, manage roles, and control access across organizations."
            />
            <FeatureItem
              icon={<Database className="h-5 w-5" />}
              title="Master Data Oversight"
              description="View and manage master data across all companies from a single dashboard."
            />
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-sm text-white/30">
            ERP System Administration &middot; Authorized Personnel Only
          </p>
        </div>
      </div>

      {/* Right Panel - Login Form */}
      <div className="flex w-full lg:w-1/2 xl:w-[45%] items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-[420px] space-y-8">
          {/* Mobile branding */}
          <div className="lg:hidden text-center space-y-1">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
                <Shield className="h-5 w-5" />
              </div>
            </div>
            <h1 className="text-xl font-semibold text-foreground">
              Master Control Panel
            </h1>
            <p className="text-sm text-muted-foreground">
              Super Administrator Access
            </p>
          </div>

          <Card className="border-red-500/20 shadow-sm">
            <CardHeader className="space-y-1 pb-4">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-red-500" />
                <CardTitle className="text-2xl font-semibold tracking-tight">
                  Super Admin Sign In
                </CardTitle>
              </div>
              <CardDescription>
                Enter your super administrator credentials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@erp.com"
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
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>

                {error && (
                  <div className="rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full h-10 font-medium bg-red-600 hover:bg-red-700"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="mr-2 h-4 w-4" />
                  )}
                  Sign In as Super Admin
                </Button>
              </form>
            </CardContent>
          </Card>

          <p className="text-center text-xs text-muted-foreground">
            <a href="/login" className="text-primary hover:underline">
              Company Login
            </a>
            {" "}&middot; Regular user? Use the company login portal.
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
    <div className="flex gap-4 items-start">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white/5 border border-white/10">
        {icon}
      </div>
      <div className="space-y-0.5">
        <h3 className="text-sm font-semibold">{title}</h3>
        <p className="text-sm text-white/40 leading-relaxed">{description}</p>
      </div>
    </div>
  );
}
