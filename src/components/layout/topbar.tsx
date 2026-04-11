"use client";

import { useState, useEffect } from "react";
import { signOut } from "next-auth/react";
import { useCurrentUser } from "@/hooks/use-current-user";
import { useSidebarStore } from "@/stores/sidebar-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Bell, LogOut, Menu, KeyRound, ChevronDown, Building2 } from "lucide-react";

interface Company {
  id: string;
  companyName: string;
  regCity?: string;
}

export function TopBar() {
  const { user } = useCurrentUser();
  const { setMobileOpen } = useSidebarStore();
  const [pwDialogOpen, setPwDialogOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState("");
  const [pwSuccess, setPwSuccess] = useState(false);

  // Company switcher state (SUPER_ADMIN only)
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompanyId, setActiveCompanyId] = useState<string>("");
  const [activeCompanyName, setActiveCompanyName] = useState<string>("");

  const isSuperAdmin = user?.role === "SUPER_ADMIN";

  const [alerts, setAlerts] = useState<any[]>([]);
  const [alertCount, setAlertCount] = useState(0);

  const fetchAlerts = async () => {
    try {
      const res = await fetch("/api/alerts?status=UNREAD&limit=10");
      if (res.ok) {
        const data = await res.json();
        const alertList = data.alerts || data || [];
        setAlerts(Array.isArray(alertList) ? alertList.slice(0, 10) : []);
        setAlertCount(Array.isArray(alertList) ? alertList.length : 0);
      }
    } catch (error) {
      console.error("Failed to fetch alerts:", error);
    }
  };

  useEffect(() => {
    fetchAlerts();
    const interval = setInterval(fetchAlerts, 60000);
    return () => clearInterval(interval);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const markAlertRead = async (alertId: string) => {
    try {
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", ids: [alertId] }),
      });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to mark alert read:", error);
    }
  };

  const markAllRead = async () => {
    try {
      const ids = alerts.map((a: any) => a.id).filter(Boolean);
      if (ids.length === 0) return;
      await fetch("/api/alerts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markRead", ids }),
      });
      fetchAlerts();
    } catch (error) {
      console.error("Failed to mark all read:", error);
    }
  };

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetch("/api/company/switch")
      .then((r) => r.json())
      .then((d) => {
        setCompanies(d.companies || []);
        // Set initial active company from user's companyId
        if (user?.companyId) {
          setActiveCompanyId(user.companyId);
          const found = (d.companies || []).find((c: Company) => c.id === user.companyId);
          if (found) setActiveCompanyName(found.companyName);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const switchCompany = async (companyId: string) => {
    try {
      await fetch("/api/company/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ companyId }),
      });
      setActiveCompanyId(companyId);
      const found = companies.find((c) => c.id === companyId);
      if (found) setActiveCompanyName(found.companyName);
      // Reload to reflect company-scoped data
      window.location.reload();
    } catch {
      // silently fail
    }
  };

  const initials = user?.name
    ? user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "U";

  const formatRole = (role?: string) => {
    if (!role) return "";
    return role
      .replace(/_/g, " ")
      .toLowerCase()
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const handlePasswordChange = async () => {
    setPwError("");
    if (newPassword !== confirmPassword) {
      setPwError("New passwords do not match");
      return;
    }
    if (newPassword.length < 6) {
      setPwError("New password must be at least 6 characters");
      return;
    }
    setPwLoading(true);
    try {
      const res = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || "Failed to change password");
        return;
      }
      setPwSuccess(true);
      setTimeout(() => {
        setPwDialogOpen(false);
        setPwSuccess(false);
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      }, 1500);
    } catch {
      setPwError("Failed to change password");
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 px-3 md:px-6 border-b border-border/40">
        {/* Left: Hamburger (mobile only) */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>

        {/* Right: Company Switcher + Notifications + User */}
        <div className="flex items-center gap-1.5">
          {/* Company Switcher (SUPER_ADMIN only) */}
          {isSuperAdmin && companies.length > 0 && (
            <>
              <div className="flex items-center gap-2 mr-2 rounded-md border border-border/50 bg-muted/30 px-2 py-0.5">
                <Building2 className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                <Select
                  value={activeCompanyId || "__none__"}
                  onValueChange={(v) => {
                    if (v !== "__none__") switchCompany(v);
                  }}
                >
                  <SelectTrigger className="h-7 w-[180px] text-xs border-0 bg-transparent shadow-none focus:ring-0 px-1">
                    <SelectValue placeholder="Select Company" />
                  </SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.companyName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Separator orientation="vertical" className="mx-1 h-6" />
            </>
          )}

          {/* Non-admin: show company name */}
          {!isSuperAdmin && activeCompanyName && (
            <>
              <div className="flex items-center gap-1.5 mr-2 text-xs text-muted-foreground">
                <Building2 className="h-3.5 w-3.5" />
                <span className="font-medium">{activeCompanyName}</span>
              </div>
              <Separator orientation="vertical" className="mx-1 h-6" />
            </>
          )}

          {/* Notification bell */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="relative h-8 w-8 text-muted-foreground hover:text-foreground transition-colors"
                title="Notifications"
              >
                <Bell className="h-4 w-4" />
                {alertCount > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center">
                    {alertCount > 9 ? "9+" : alertCount}
                  </span>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80 mt-1">
              <div className="flex items-center justify-between px-3 py-2">
                <span className="font-semibold text-sm">Notifications</span>
                {alertCount > 0 && (
                  <button onClick={markAllRead} className="text-xs text-blue-600 hover:underline">
                    Mark all read
                  </button>
                )}
              </div>
              <DropdownMenuSeparator />
              {alerts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
                  <Bell className="h-8 w-8 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-muted-foreground">No new notifications</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">You&apos;re all caught up</p>
                </div>
              ) : (
                <div className="max-h-[300px] overflow-y-auto">
                  {alerts.map((alert: any) => (
                    <DropdownMenuItem
                      key={alert.id}
                      className="flex flex-col items-start gap-1 p-3 cursor-pointer"
                      onClick={() => {
                        markAlertRead(alert.id);
                        if (alert.relatedModule && alert.relatedId) {
                          const routes: Record<string, string> = {
                            WarehouseIntimation: "/warehouse/intimation",
                            PurchaseRequisition: "/purchase/requisitions",
                            SalesOrder: "/sales",
                          };
                          const base = routes[alert.relatedModule] || "";
                          if (base) window.location.href = `${base}/${alert.relatedId}`;
                        }
                      }}
                    >
                      <div className="flex items-center gap-2 w-full">
                        <span className={`h-2 w-2 rounded-full flex-shrink-0 ${
                          alert.severity === "CRITICAL" ? "bg-red-500" :
                          alert.severity === "HIGH" ? "bg-orange-500" :
                          alert.severity === "MEDIUM" ? "bg-yellow-500" : "bg-blue-500"
                        }`} />
                        <span className="text-sm font-medium truncate flex-1">{alert.title}</span>
                      </div>
                      <p className="text-xs text-muted-foreground line-clamp-2 pl-4">{alert.message}</p>
                      <span className="text-[10px] text-muted-foreground/60 pl-4">
                        {alert.createdAt ? new Date(alert.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }) : ""}
                      </span>
                    </DropdownMenuItem>
                  ))}
                </div>
              )}
            </DropdownMenuContent>
          </DropdownMenu>

          <Separator orientation="vertical" className="mx-1 h-5" />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="flex items-center gap-2.5 px-2 py-1.5 h-auto rounded-lg hover:bg-accent/60 transition-colors"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="text-xs font-semibold bg-primary/10 text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden flex-col items-start md:flex">
                  <span className="text-sm font-medium leading-tight">
                    {user?.name}
                  </span>
                  <span className="text-[11px] text-muted-foreground leading-tight">
                    {formatRole(user?.role)}
                  </span>
                </div>
                <ChevronDown className="hidden md:block h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 mt-1">
              <div className="px-3 py-3">
                <p className="text-sm font-medium leading-none">{user?.name}</p>
                <p className="mt-1 text-xs text-muted-foreground">{user?.email}</p>
                <Badge
                  variant="secondary"
                  className="mt-2 text-[10px] font-medium px-1.5 py-0"
                >
                  {formatRole(user?.role)}
                </Badge>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setPwDialogOpen(true)}
                className="cursor-pointer"
              >
                <KeyRound className="mr-2 h-4 w-4" />
                Change Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* Change Password Dialog */}
      <Dialog
        open={pwDialogOpen}
        onOpenChange={(open) => {
          setPwDialogOpen(open);
          if (!open) {
            setPwError("");
            setPwSuccess(false);
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change Password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="current-password">Current Password</Label>
              <Input
                id="current-password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm-password">Confirm New Password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={pwLoading}
              />
            </div>
            {pwError && (
              <p className="text-sm text-destructive">{pwError}</p>
            )}
            {pwSuccess && (
              <p className="text-sm text-green-600">
                Password changed successfully!
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPwDialogOpen(false)}
              disabled={pwLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handlePasswordChange}
              disabled={pwLoading || pwSuccess}
            >
              {pwLoading ? "Changing..." : "Change Password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
