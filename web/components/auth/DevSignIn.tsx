"use client";

import { signIn } from "next-auth/react";

export function DevSignIn() {
  return (
    <button
      className="btn"
      style={{ width: "100%", justifyContent: "center", padding: 11, marginTop: 10 }}
      onClick={() => signIn("dev", { callbackUrl: "/overview" })}
    >
      Enter (dev login)
    </button>
  );
}
