import { auth } from "@/auth";

/**
 * Next.js 16 "proxy" (formerly middleware). Gates every route behind Google
 * login, except the login page, the NextAuth API routes, and static assets.
 * NextAuth's `auth` wrapper returns a proxy-compatible function.
 */
export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isPublic = pathname === "/login" || pathname.startsWith("/api/auth");
  if (!req.auth && !isPublic) {
    return Response.redirect(new URL("/login", req.nextUrl.origin));
  }
});

export const config = {
  // Run on everything except Next internals and static image files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
