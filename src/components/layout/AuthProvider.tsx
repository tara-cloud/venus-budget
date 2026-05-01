"use client";
import { SessionProvider } from "next-auth/react";
import { ThemeProvider } from "./ThemeContext";

export default function AuthProvider({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <SessionProvider>
      <ThemeProvider>{children}</ThemeProvider>
    </SessionProvider>
  );
}
