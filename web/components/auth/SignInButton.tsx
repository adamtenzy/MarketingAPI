"use client";

import { signIn } from "next-auth/react";

export function SignInButton() {
  return (
    <button
      className="btn primary"
      onClick={() => signIn("google", { callbackUrl: "/overview" })}
    >
      Continue with Google
    </button>
  );
}
