import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

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
  ],
};
