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
    pages: {
      signIn: "/login",
    },
  }
);

export const config = {
  matcher: [
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
