"use client";

import { SessionProvider } from "next-auth/react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";
export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider
      // Keep the JWT cookie rolling during long form fills: only /api/auth/session
      // hits re-issue the cookie (24h sliding), so without polling it expires 24h
      // after the last page load / tab refocus and the next save silently 401s.
      refetchInterval={4 * 60}
      refetchOnWindowFocus
      refetchWhenOffline={false}
    >
      <TooltipProvider delayDuration={0}>
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex flex-1 flex-col min-w-0">
            <TopBar />
            <main className="flex-1 p-4 md:p-6">
              {children}
            </main>
          </div>
        </div>
      </TooltipProvider>
    </SessionProvider>
  );
}
