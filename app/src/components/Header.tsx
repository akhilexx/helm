import Link from "next/link";
import { ThemeToggle } from "./ThemeToggle";
import { WalletButton } from "./WalletButton";

export function Header() {
  return (
    <header
      className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-3"
      style={{ background: "var(--bg)", borderColor: "var(--line)" }}
    >
      <div className="flex items-center gap-6">
        <Link href="/" className="text-lg font-semibold tracking-tight">
          Helm <span style={{ color: "var(--warn)" }}>Protocol</span>
        </Link>
        <nav className="flex gap-4 text-sm" style={{ color: "var(--mut)" }}>
          <Link href="/">Markets</Link>
          <Link href="/risk">Risk console</Link>
          <Link href="/about">About</Link>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <span className="rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide"
          style={{ background: "var(--bg-soft)", color: "var(--warn)", border: "1px solid var(--line)" }}>
          Solana devnet
        </span>
        <ThemeToggle />
        <WalletButton />
      </div>
    </header>
  );
}
