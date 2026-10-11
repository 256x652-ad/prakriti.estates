"use client";

import { useEffect } from "react";
import { ThemeConfigurationDTO } from "@/modules/theme/core/themeSchemas";

interface ThemeProviderProps {
  children: React.ReactNode;
  initialTheme: ThemeConfigurationDTO | null;
}

export default function ThemeProvider({ children, initialTheme }: ThemeProviderProps) {
  useEffect(() => {
    // If no custom theme is found in the DB, fallback to the Tailwind defaults
    if (!initialTheme) return;

    const root = document.documentElement;

    // Safely inject CSS variables into the root DOM element.
    // Because the payload was strictly validated by Zod on the server before storage,
    // we know these are safe HEX/HSL values and not malicious `expression()` or `url()` payloads.
    root.style.setProperty("--theme-primary", initialTheme.primaryColor);
    root.style.setProperty("--theme-secondary", initialTheme.secondaryColor);
    root.style.setProperty("--theme-bg-light", initialTheme.backgroundLight);
    
    if (initialTheme.enableDarkMode) {
      root.style.setProperty("--theme-bg-dark", initialTheme.backgroundDark);
      // In a real app, you would dynamically append the 'dark' class here based on user preference
    } else {
      // Force remove dark mode if the admin disabled it globally
      root.classList.remove("dark");
    }

  }, [initialTheme]);

  return <>{children}</>;
}
