"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { NAV } from "@/lib/nav";

export function Topbar({ userEmail }: { userEmail?: string | null }) {
  const pathname = usePathname();
  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">UD</span> Urban District <small>Marketing</small>
      </div>
      <nav className="nav">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={pathname === item.href ? "active" : ""}
          >
            {item.label}
          </Link>
        ))}
      </nav>
      <div className="topbar-right">
        <span className="status-pill" title="No live sources connected yet">
          <span className="dot" /> Awaiting sync
        </span>
        {userEmail ? (
          <span className="usermenu">
            {userEmail}
            <button className="btn" onClick={() => signOut({ callbackUrl: "/login" })}>
              Sign out
            </button>
          </span>
        ) : null}
      </div>
    </header>
  );
}
