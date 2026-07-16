import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Topbar } from "@/components/shell/Topbar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");

  return (
    <div className="shell">
      <Topbar userEmail={session.user?.email} />
      {children}
    </div>
  );
}
