import NextAuth from "next-auth";
import Google from "next-auth/providers/google";

/**
 * Optional allow-list: restrict sign-in to one Google Workspace domain.
 * Set ALLOWED_EMAIL_DOMAIN=urbandistrict.com to gate the team.
 * If unset, any Google account that completes OAuth is allowed (dev only).
 */
const allowedDomain = process.env.ALLOWED_EMAIL_DOMAIN?.trim().toLowerCase();

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [Google],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  // Vercel trusts its own host automatically; other hosts (and `next start`)
  // need this so Auth.js accepts the request Host header. Override per-env with
  // AUTH_TRUST_HOST if you prefer.
  trustHost: true,
  callbacks: {
    async signIn({ profile }) {
      if (!allowedDomain) return true;
      const email = (profile?.email ?? "").toLowerCase();
      return email.endsWith("@" + allowedDomain);
    },
  },
});
