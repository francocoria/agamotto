"use client";
import { createContext, useContext, useEffect, useState } from "react";

type Theme = "light" | "dark";
const Ctx = createContext<{ theme: Theme; setTheme: (t: Theme) => void }>({
  theme: "light",
  setTheme: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = (typeof window !== "undefined" && localStorage.getItem("agm-theme")) as Theme | null;
    if (stored === "light" || stored === "dark") setTheme(stored);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem("agm-theme", theme);
    const root = document.querySelector(".agm-root") as HTMLElement | null;
    if (root) root.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Ctx.Provider value={{ theme, setTheme }}>
      <div className="agm-root agm-bg" data-theme={theme}>
        {children}
      </div>
    </Ctx.Provider>
  );
}

export function useTheme() {
  return useContext(Ctx);
}

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  return (
    <button
      className="agm-theme-toggle"
      onClick={() => setTheme(theme === "light" ? "dark" : "light")}
      aria-label="Toggle theme"
      title={theme === "light" ? "Modo oscuro" : "Modo claro"}
    >
      {theme === "light" ? (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      ) : (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.4 1.4M17.6 17.6L19 19M5 19l1.4-1.4M17.6 6.4L19 5" />
        </svg>
      )}
    </button>
  );
}
