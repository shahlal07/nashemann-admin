"use client";

const KEY = "nashemann_theme";
export type Theme = "dark" | "light";

export function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "dark";
  return (window.localStorage.getItem(KEY) as Theme) || "dark";
}

export function setStoredTheme(theme: Theme) {
  window.localStorage.setItem(KEY, theme);
  document.documentElement.setAttribute("data-theme", theme);
}

/** Inlined verbatim into <head> before first paint to avoid a flash of the wrong theme. */
export const THEME_INIT_SCRIPT = `
(function() {
  try {
    var t = localStorage.getItem('${KEY}') || 'dark';
    document.documentElement.setAttribute('data-theme', t);
  } catch (e) {}
})();
`;
