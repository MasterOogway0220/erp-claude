import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const { pathname } = req.nextUrl;

    // Super admin with no active company → force company selection first
    if (
      (token?.role as string) === "SUPER_ADMIN" &&
      !pathname.startsWith("/superadmin") &&
      !req.cookies.get("activeCompanyId")?.value
    ) {
      return NextResponse.redirect(new URL("/superadmin", req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      // A blanked token ({} re-encoded after the user was deleted/deactivated)
      // still decodes truthy — require an id so those users get sent to /login.
      authorized: ({ token }) => !!token?.id,
    },
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  // Every top-level folder under src/app/(dashboard) must be listed here.
  //
  // There used to be a `"/(dashboard)(.*)"` entry, which protected nothing:
  // `(dashboard)` is a Next.js *route group*, so it never appears in a URL and
  // that pattern could not match a real request. It read as "all dashboard
  // routes are covered", and six of them were not — alerts,
  // client-purchase-orders, po-acceptance, po-tracking, tenders and warehouse
  // all returned 200 to a signed-out visitor instead of redirecting to /login.
  //
  // Nothing leaked, because those pages are client components whose data comes
  // from API routes that return 401 on their own. The danger was the next
  // server component added under one of those paths, which would have read the
  // database with no session check and nothing to flag it.
  matcher: [
    "/",
    "/admin/:path*",
    "/alerts/:path*",
    "/client-purchase-orders/:path*",
    "/dispatch/:path*",
    "/inventory/:path*",
    "/masters/:path*",
    "/po-acceptance/:path*",
    "/po-tracking/:path*",
    "/purchase/:path*",
    "/quality/:path*",
    "/quotations/:path*",
    "/reports/:path*",
    "/sales/:path*",
    "/superadmin/:path*",
    "/tenders/:path*",
    "/warehouse/:path*",
  ],
};
