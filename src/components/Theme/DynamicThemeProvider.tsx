"use client";

import * as React from "react";
import { ThemeConfigurationDTO } from "@/modules/theme/core/themeSchemas";

export type ThemeMode = "light" | "dark" | "system";

interface ThemeContextValue {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  themeConfig: ThemeConfigurationDTO | null;
  setThemeConfig: (config: ThemeConfigurationDTO) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

interface DynamicThemeProviderProps {
  children: React.ReactNode;
  initialTheme?: ThemeConfigurationDTO | null;
  defaultMode?: ThemeMode;
}

export function DynamicThemeProvider({
  children,
  initialTheme = null,
  defaultMode = "light",
}: DynamicThemeProviderProps) {
  const [mode, setModeState] = React.useState<ThemeMode>(defaultMode);
  const [themeConfig, setThemeConfig] = React.useState<ThemeConfigurationDTO | null>(initialTheme);

  // Apply CSS variables and dark mode class to document element
  React.useEffect(() => {
    const root = document.documentElement;

    // 1. Inject custom CSS variables if provided
    if (themeConfig) {
      root.style.setProperty("--theme-primary", themeConfig.primaryColor);
      root.style.setProperty("--theme-secondary", themeConfig.secondaryColor);
      root.style.setProperty("--theme-bg-light", themeConfig.backgroundLight);
      if (themeConfig.backgroundDark) {
        root.style.setProperty("--theme-bg-dark", themeConfig.backgroundDark);
      }
    }

    // 2. Resolve Light/Dark Mode
    const isDark =
      mode === "dark" ||
      (mode === "system" &&
        window.matchMedia &&
        window.matchMedia("(prefers-color-scheme: dark)").matches);

    if (isDark && themeConfig?.enableDarkMode !== false) {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
  }, [mode, themeConfig]);

  const setMode = (newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      localStorage.setItem("prakriti_theme_mode", newMode);
    } catch {
      // Ignore local storage write errors
    }
  };

  return (
    <ThemeContext.Provider
      value={{
        mode,
        setMode,
        themeConfig,
        setThemeConfig,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within DynamicThemeProvider");
  }
  return context;
}
