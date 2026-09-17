export const THEMES = ["light", "dark", "system"];
export function normalizeTheme(value) { return THEMES.includes(value) ? value : "system"; }
export function resolvedTheme(value, prefersDark = false) { const theme = normalizeTheme(value); return theme === "system" ? (prefersDark ? "dark" : "light") : theme; }
export function applyTheme(root, value, prefersDark = false) { const theme = normalizeTheme(value); const resolved = resolvedTheme(theme, prefersDark); root?.classList?.remove("light", "dark"); root?.classList?.add(resolved); root?.setAttribute?.("data-theme", theme); return { theme, resolved }; }
export function initTheme(doc = globalThis.document, win = globalThis.window) {
  if (!doc?.documentElement || !win?.matchMedia) return null; const media = win.matchMedia("(prefers-color-scheme: dark)"); let choice;
  try { choice = normalizeTheme(win.localStorage?.getItem("openings-theme")); } catch { choice = "system"; }
  const buttons = [...(doc.querySelectorAll?.("[data-theme-choice]") ?? [])];
  const render = () => { applyTheme(doc.documentElement, choice, media.matches); for (const button of buttons) button.setAttribute("aria-pressed", String(button.dataset.themeChoice === choice)); };
  for (const button of buttons) button.addEventListener?.("click", () => { choice = normalizeTheme(button.dataset.themeChoice); try { win.localStorage?.setItem("openings-theme", choice); } catch {} render(); });
  media.addEventListener?.("change", () => { if (choice === "system") render(); }); render(); return { get choice() { return choice; } };
}
if (typeof document !== "undefined") initTheme();
