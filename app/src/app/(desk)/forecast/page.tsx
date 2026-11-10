"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { fetchHelmMarkets, type HelmMarket } from "@/lib/pmamm";
import { questionFor } from "@/lib/forecast";
import { marketState } from "@/lib/pm-amm-helpers";

export default function ForecastIndex() {
  const [rows, setRows] = useState<HelmMarket[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    fetchHelmMarkets()
      .then((m) => { if (!dead) setRows(m); })
      .catch((e) => { if (!dead) setErr(e instanceof Error ? e.message : "RPC error"); });
    return () => { dead = true; };
  }, []);

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div className="max-w-2xl">
          <p className="mb-2 text-xs uppercase tracking-[0.2em]" style={{ color: "var(--warn)" }}>
            Forecast · Predict pm-AMM · Helm resolver
          </p>
          <h1 className="mb-3 text-3xl font-semibold tracking-tight">
            Binary markets that refuse to resolve on a bad print.
          </h1>
          <p className="text-sm leading-relaxed" style={{ color: "var(--mut)" }}>
            Trading runs on the live Predict pm-AMM on Solana devnet (mock USDC). Resolution does
            not: Helm proposes YES or NO from a Pyth Hermes threshold only when the oracle is
            fresh, tight and unjumped, then waits out a dispute window. If the oracle never
            becomes safe, the market is voided rather than guessed.
          </p>
        </div>
        <Link href="/forecast/new" className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--acc)", color: "#ffffff" }}>
          Create market
        </Link>
      </div>

      {err && <p className="mb-4 text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
      {rows === null && !err && <p style={{ color: "var(--mut)" }}>Reading pm-AMM markets…</p>}
      {rows && rows.length === 0 && (
        <p style={{ color: "var(--mut)" }}>
          No Helm-guarded markets yet. Names must look like <span className="mono">HELM SOL &gt;= 150</span>.
          Create one, or run <span className="mono">node scripts/seed-forecast.cjs</span>.
        </p>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        {rows?.map((m) => {
          const acc = m.account as Parameters<typeof marketState>[0];
          const st = marketState(acc);
          return (
            <Link key={m.pubkey.toBase58()} href={`/forecast/${m.pubkey.toBase58()}`} className="card block p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs uppercase tracking-wide" style={{ color: "var(--mut)" }}>{m.name}</div>
                  <div className="text-lg font-semibold">{questionFor(m.spec)}</div>
                </div>
                <span className="rounded-full px-2 py-0.5 text-[11px]" style={{
                  color: st.resolved ? "var(--ok)" : st.expired ? "var(--warn)" : "var(--acc)",
                  border: "1px solid var(--line)"
                }}>
                  {st.resolved ? `Resolved ${st.winner}` : st.expired ? "Expired" : "Open"}
                </span>
              </div>
              <div className="mono text-3xl">{(st.price * 100).toFixed(1)}%</div>
              <div className="mt-1 text-xs" style={{ color: "var(--mut)" }}>
                YES price · {st.expired ? "expired" : `${Math.ceil(st.secondsLeft / 60)} min left`}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
