"use client";

import { SessionProvider, getSession } from "next-auth/react";
import { useEffect } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Sidebar } from "@/components/layout/sidebar";
import { TopBar } from "@/components/layout/topbar";

function SessionKeepAlive() {
  // SessionProvider's refetchInterval permanently stops once a single poll
  // fails (its interval is gated on a truthy client session — one network
  // blip on laptop wake kills it for the life of the tab). getSession()
  // bypasses that gate, so the 24h sliding cookie keeps rolling as long as
  // the tab is open.
  useEffect(() => {
    const id = setInterval(() => {
      getSession({ broadcast: false }).catch(() => {});
    }, 4 * 60 * 1000);
    return () => clearInterval(id);
  }, []);
  return null;
}

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
      <SessionKeepAlive />
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
