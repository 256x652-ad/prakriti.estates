import type { Metadata } from "next";
import "./globals.css";

import ThemeProvider from "@/components/Theme/ThemeProvider";
import ImpersonationBanner from "@/components/Admin/ImpersonationBanner";
import AuthProvider from "@/components/Auth/AuthProvider";

export const metadata: Metadata = {
  title: "Prakriti Estates",
  description: "Map-centric real estate marketplace",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <ImpersonationBanner />
          <ThemeProvider initialTheme={{
            primaryColor: "#16a34a",
            secondaryColor: "#052e16",
            backgroundLight: "#f8fafc",
            backgroundDark: "#0f172a",
            enableDarkMode: false
          }}>
            {children}
          </ThemeProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
