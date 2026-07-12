import { createContext, use, useCallback, useMemo, useState, type ReactNode } from "react";

export const themes = [
  { id: "dark-red", name: "Rojo", mode: "dark", accent: "red" },
  { id: "dark-blue", name: "Azul", mode: "dark", accent: "blue" },
  { id: "dark-orange", name: "Naranja", mode: "dark", accent: "orange" },
  { id: "dark-purple", name: "Morado", mode: "dark", accent: "purple" },
  { id: "light-red", name: "Rojo", mode: "light", accent: "red" },
  { id: "light-blue", name: "Azul", mode: "light", accent: "blue" },
  { id: "light-orange", name: "Naranja", mode: "light", accent: "orange" },
  { id: "light-purple", name: "Morado", mode: "light", accent: "purple" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

const aliases: Record<string, ThemeId> = {
  noir: "dark-red",
  marble: "light-red",
  ember: "dark-orange",
  ocean: "dark-blue",
  forest: "dark-red",
  dusk: "dark-purple",
  light: "light-red",
};

function resolveTheme(value: string | null | undefined): ThemeId {
  if (value && aliases[value]) return aliases[value];
  return themes.some((theme) => theme.id === value) ? (value as ThemeId) : "dark-red";
}

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() =>
    resolveTheme(document.documentElement.dataset.theme ?? localStorage.getItem("ga-theme")),
  );

  const setTheme = useCallback((nextTheme: ThemeId) => {
    document.documentElement.dataset.theme = nextTheme;
    document.documentElement.style.colorScheme = nextTheme.startsWith("light-") ? "light" : "dark";
    localStorage.setItem("ga-theme", nextTheme);
    setThemeState(nextTheme);
  }, []);

  const value = useMemo(() => ({ theme, setTheme }), [setTheme, theme]);
  return <ThemeContext value={value}>{children}</ThemeContext>;
}

export function useTheme(): ThemeContextValue {
  const value = use(ThemeContext);
  if (!value) throw new Error("useTheme debe utilizarse dentro de ThemeProvider");
  return value;
}
