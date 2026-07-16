import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Urban District — Marketing",
  description: "Unified marketing operations for Urban District.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
