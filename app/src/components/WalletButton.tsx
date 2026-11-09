"use client";
import { useEffect, useState } from "react";
import { getInjected } from "@/lib/wallet";

export function WalletButton({ onChange }: { onChange?: (pk: string | null) => void }) {
  const [pk, setPk] = useState<string | null>(null);
  useEffect(() => {
    const w = getInjected();
    w?.on?.("disconnect", () => { setPk(null); onChange?.(null); });
  }, [onChange]);

  async function connect() {
    const w = getInjected();
    if (!w) {
      alert("No Solana wallet found. Install Phantom or Solflare and switch it to Devnet.");
      return;
    }
    const res = await w.connect();
    const next = res.publicKey.toString();
    setPk(next);
    onChange?.(next);
  }

  if (pk) {
    return (
      <span className="mono text-xs" style={{ color: "var(--mut)" }}>
        {pk.slice(0, 4)}…{pk.slice(-4)}
      </span>
    );
  }
  return (
    <button
      onClick={connect}
      className="rounded-full px-4 py-1.5 text-sm font-medium"
      style={{ background: "var(--acc)", color: "#061018" }}
    >
      Connect wallet
    </button>
  );
}
