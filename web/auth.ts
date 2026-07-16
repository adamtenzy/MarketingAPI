import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";

/**
 * Optional allow-list: restrict sign-in to one Google Workspace domain.
 * Set ALLOWED_EMAIL_DOMAIN=urbandistrict.com to gate the team.
 * If unset, any Google account that completes OAuth is allowed (dev only).
 */
const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

/**
 * Dev-only sign-in. When AUTH_DEV_LOGIN=true the app can be opened and explored
 * without configuring Google OAuth — click "Enter (dev)" on the login page.
 * NEVER enable this in production; guarded so it's ignored there.
 */
export const devLoginEnabled =
  process.env.AUTH_DEV_LOGIN === "true" && process.env.NODE_ENV !== "production";

const devProvider = Credentials({
  id: "dev",
  name: "Dev login",
  credentials: {},
  authorize: () => ({ id: "dev-user", name: "Dev User", email: "dev@urbandistrict.com" }),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: devLoginEnabled ? [Google, devProvider] : [Google],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // Vercel trusts its own host automatically; other hosts (and `next start`)
  // need this so Auth.js accepts the request Host header. Override per-env with
  // AUTH_TRUST_HOST if you prefer.
  trustHost: true,
  callbacks: {
    async signIn({ account, profile }) {
      // Dev login bypasses the domain allow-list (dev only, see devLoginEnabled).
      if (account?.provider === "dev") return devLoginEnabled;
      if (!allowedDomain) return true;
      const email = (profile?.email ?? "").toLowerCase();
      return email.endsWith("@" + allowedDomain);
    },
  },
});
