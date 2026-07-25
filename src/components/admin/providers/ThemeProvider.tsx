import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import { type ThemeProviderProps } from "next-themes";

// NOTE: next-themes (v0.4.x) injects a no-flash <script> tag that React 19
// flags in dev with "Scripts inside React components are never executed
// when rendering on the client." This is a known false-positive (the script
// only needs to run during the initial SSR HTML parse, before hydration) and
// is safe to ignore. No functional impact in dev or production.
export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  return (
    <NextThemesProvider
      attribute="class" 
      defaultTheme="dark" 
      enableSystem={false}
      disableTransitionOnChange
      {...props}
    >
      {children}
    </NextThemesProvider>
  );
}
