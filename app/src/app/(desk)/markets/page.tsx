"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { MARKETS, RPC_URL, STATUS_LABEL } from "@/lib/constants";
import { fetchMarket, type MarketAccount } from "@/lib/program";
import { formatPx } from "@/lib/math";

export default function MarketsPage() {
  const [rows, setRows] = useState<(MarketAccount | null)[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [slot, setSlot] = useState<number | null>(null);

  useEffect(() => {
    const c = new Connection(RPC_URL, "confirmed");
    let dead = false;
    async function load() {
      try {
        const [markets, s] = await Promise.all([
          Promise.all(MARKETS.map((m) => fetchMarket(c, m.symbol))),
          c.getSlot()
        ]);
        if (dead) return;
        setRows(markets);
        setSlot(s);
        setErr(null);
      } catch (e) {
        if (!dead) setErr(e instanceof Error ? e.message : "RPC error");
      }
    }
    load();
    const id = setInterval(load, 12_000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  return (
    <div>
      <section className="mb-10 max-w-3xl">
        <p className="mb-2 text-xs uppercase tracking-[0.2em]" style={{ color: "var(--acc)" }}>
          Markets · Solana devnet
        </p>
        <h1 className="mb-3 text-4xl font-semibold tracking-tight">
          Perpetual markets
        </h1>
        <p className="text-base leading-relaxed" style={{ color: "var(--mut)" }}>
          Helm is an isolated-margin perpetual venue on Solana devnet. Every open, increase,
          withdraw and liquidation is gated by oracle age, confidence width, and jump bounds.
          When the circuit trips, the market goes reduce-only instead of settling on a poisoned mark.
        </p>
        <p className="mt-3 text-sm" style={{ color: "var(--mut)" }}>
          Binary forecasts live next door, on the Predict pm-AMM, with the same halt-rather-than-guess
          resolver. <Link href="/forecast" style={{ color: "var(--acc)" }}>Open Forecast →</Link>
        </p>
      </section>

      <div className="mb-4 flex items-center justify-between text-xs" style={{ color: "var(--mut)" }}>
        <span>Markets · live reads from {RPC_URL.includes("devnet") ? "devnet" : "custom RPC"}</span>
        <span className="mono">slot {slot ?? "—"}</span>
      </div>
      {err && (
        <p className="mb-4 text-sm" style={{ color: "var(--bad)" }}>
          Could not read markets: {err}. If the program is not initialised yet, the cards below stay empty on purpose — Helm does not invent marks.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        {MARKETS.map((meta, i) => {
          const m = rows[i];
          const status = m ? STATUS_LABEL[m.status] ?? `status ${m.status}` : "Uninitialised";
          const tone = !m ? "var(--mut)" : m.status === 0 ? "var(--ok)" : "var(--warn)";
          return (
            <Link key={meta.symbol} href={`/trade/${meta.symbol}`} className="card p-5 block hover:opacity-95">
              <div className="mb-6 flex items-start justify-between">
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: "var(--mut)" }}>{meta.pair}</div>
                  <div className="text-xl font-semibold">{meta.symbol}</div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: tone, border: `1px solid ${tone}` }}>
                  {status}
                </span>
              </div>
              <div className="mono text-3xl tabular">{m ? formatPx(m.markPrice) : "—"}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--mut)" }}>
                mark · conf {m ? formatPx(m.markConf) : "—"} · slot {m ? m.markSlot.toString() : "—"}
              </div>
              <div className="mt-5 grid grid-cols-2 gap-2 text-xs" style={{ color: "var(--mut)" }}>
                <div>IM {m ? `${m.imBps / 100}%` : "—"}</div>
                <div>MM {m ? `${m.mmBps / 100}%` : "—"}</div>
                <div>Max {m ? `${m.maxLeverageX}x` : "—"}</div>
                <div>OI L/S {m ? `${Number(m.openInterestLong) / 1e6} / ${Number(m.openInterestShort) / 1e6}` : "—"}</div>
              </div>
              <p className="mt-4 text-xs" style={{ color: "var(--mut)" }}>{meta.note}</p>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
