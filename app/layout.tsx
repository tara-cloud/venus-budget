import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";
import AuthProvider from "@/components/layout/AuthProvider";
import SwRegister from "@/components/layout/SwRegister";

export const metadata: Metadata = {
  title: "Venus",
  description: "Your personal finance tracker — track, budget, and forecast",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Venus",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

// Inline script to prevent flash of wrong theme before React hydrates
const themeScript = `
(function(){
  try {
    var p = localStorage.getItem('theme-preference') || 'system';
    var dark = p === 'dark' || (p === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light');
    if (dark) document.documentElement.classList.add('dark');
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable} h-full antialiased`}>
      <head>
        {/* Runs before any CSS/React paint — prevents theme flash */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">
        <AuthProvider>{children}</AuthProvider>
        <SwRegister />
      </body>
    </html>
  );
}
