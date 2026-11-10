"use client";
import Link from "next/link";
import { useState } from "react";
import { WalletButton } from "./WalletButton";

const NAV = [
  { href: "/markets", label: "Markets" },
  { href: "/forecast", label: "Forecast" },
  { href: "/positions", label: "Positions" },
  { href: "/risk", label: "Risk console" },
  { href: "/about", label: "About" }
];

export function Header() {
  const [open, setOpen] = useState(false);
  return (
    <header className="site-header sticky top-0 z-30 border-b" style={{ borderColor: "var(--line)" }}>
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="text-lg font-semibold tracking-tight">
            Helm <span style={{ color: "var(--acc)" }}>Protocol</span>
          </Link>
          <nav className="hidden flex-wrap gap-4 text-sm md:flex" style={{ color: "var(--mut)" }}>
            {NAV.map((item) => (
              <Link key={item.href} href={item.href} className="nav-link">{item.label}</Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide sm:inline"
            style={{ background: "var(--acc-soft)", color: "var(--acc)", border: "1px solid var(--line)" }}>
            Solana devnet · demo only
          </span>
          <Link href="/trade/SOL-PERP" className="hidden rounded-full px-3 py-1.5 text-sm font-medium md:inline"
            style={{ background: "var(--acc)", color: "#ffffff" }}>
            Launch app
          </Link>
          <WalletButton />
          <button
            type="button"
            className="rounded-lg border px-2 py-1 text-sm md:hidden"
            style={{ borderColor: "var(--line)" }}
            aria-expanded={open}
            aria-label="Toggle navigation"
            onClick={() => setOpen((v) => !v)}
          >
            Menu
          </button>
        </div>
      </div>
      {open && (
        <nav className="space-y-2 border-t px-5 py-3 md:hidden" style={{ borderColor: "var(--line)", color: "var(--mut)" }}>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className="nav-link block py-1" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
          <Link href="/trade/SOL-PERP" className="nav-link block py-1" onClick={() => setOpen(false)}>Launch app</Link>
        </nav>
      )}
    </header>
  );
}
