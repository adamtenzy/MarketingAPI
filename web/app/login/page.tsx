import { redirect } from "next/navigation";
import { auth, devLoginEnabled } from "@/auth";
import { SignInButton } from "@/components/auth/SignInButton";
import { DevSignIn } from "@/components/auth/DevSignIn";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth();
  if (session) redirect("/overview");
  const { error } = await searchParams;

  return (
    <div className="login-wrap">
      <div className="login-card">
        <div className="brand">
          <span className="brand-mark">UD</span> Urban District <small>Marketing</small>
        </div>
        <h1>Sign in</h1>
        <p>Use your Urban District Google account to access the marketing dashboard.</p>
        <SignInButton />
        {devLoginEnabled ? <DevSignIn /> : null}
        {error ? (
          <div className="err">
            {error === "AccessDenied"
              ? "That account isn't allowed. Use your company Google account."
              : "Sign-in failed. Please try again."}
          </div>
        ) : null}
      </div>
    </div>
  );
}
