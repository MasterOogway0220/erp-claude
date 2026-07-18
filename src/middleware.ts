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
  matcher: [
    "/",
    "/(dashboard)(.*)",
    "/masters/:path*",
    "/quotations/:path*",
    "/sales/:path*",
    "/purchase/:path*",
    "/inventory/:path*",
    "/quality/:path*",
    "/dispatch/:path*",
    "/reports/:path*",
    "/admin/:path*",
    "/superadmin/:path*",
  ],
};
