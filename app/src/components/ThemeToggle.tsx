"use client";
export function ThemeToggle() {
  function toggle() {
    const root = document.documentElement;
    const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("helm-theme", next); } catch {}
  }
  return (
    <button
      onClick={toggle}
      className="rounded-full border px-3 py-1 text-xs"
      style={{ borderColor: "var(--line)", color: "var(--mut)" }}
    >
      Dark / Light
    </button>
  );
}
