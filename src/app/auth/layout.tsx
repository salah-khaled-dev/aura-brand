import React from "react";
import { ThemeProvider } from "@/components/admin/providers/ThemeProvider";

// Mirrors src/app/admin/layout.tsx: this subtree renders the admin-styled
// reset-password screen but lives outside /admin on purpose (see
// src/middleware.ts — everything under /admin requires an authorized admin
// session, which doesn't exist yet mid-recovery), so it needs its own
// ThemeProvider mount for the --admin-* dark/light tokens + ThemeToggle.
export default function AuthRootLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
