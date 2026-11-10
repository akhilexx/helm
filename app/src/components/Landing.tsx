"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { MARKETS, PROGRAM_ID, RPC_URL, STATUS_LABEL } from "@/lib/constants";
import { fetchMarket, type MarketAccount } from "@/lib/program";
import { formatPx } from "@/lib/math";
import { Reveal } from "./Reveal";

const FEATURES = [
  {
    title: "Pyth oracle safety",
    body: "Every open, increase, withdraw and liquidation is gated by oracle age, confidence width, and jump bounds. A late, wide, or jumped print is treated as a failed claim, not a new mark."
  },
  {
    title: "On-chain risk engine",
    body: "Isolated-margin perps with health as equity over maintenance margin. Default demo parameters: 10% initial margin, 5% maintenance, 10× leverage cap, 4096-slot max age, 2% max confidence, 5% max jump."
  },
  {
    title: "Forecast on the pm-AMM",
    body: "Binary threshold markets trade on the live Predict pm-AMM on Solana devnet (mock USDC), not a homemade curve. Helm proposes YES or NO only from a safe Pyth print, waits out a dispute window, and voids the market rather than guessing."
  }
];

const STEPS = [
  {
    n: "01",
    title: "A keeper stamps the tape",
    body: "Real Pyth prices are written to each market account. The web app reads those accounts live and does not invent a mark when an account is missing."
  },
  {
    n: "02",
    title: "You trade isolated margin",
    body: "Deposit devnet SOL as collateral, then open or increase a long or short on SOL-PERP, BTC-PERP, or XAU-PERP. Liquidation price uses the same math the unit tests cover."
  },
  {
    n: "03",
    title: "Unsafe prints trip the circuit",
    body: "If age, confidence, or jump checks fail, the market goes reduce-only. New risk is blocked; reduces still work; liquidation still requires a live oracle."
  },
  {
    n: "04",
    title: "Forecasts resolve — or they don’t",
    body: "After expiry, Helm checks Pyth the same way. A safe print proposes an outcome and opens a dispute window. A later disagreeing safe print discards the proposal. A persistently unsafe oracle is halted, then treated as void."
  }
];

const FAQ = [
  {
    q: "What is Helm?",
    a: "Helm is an isolated-margin perpetual-futures venue on Solana devnet, plus a forecast (prediction-market) resolver. It refuses to mark, trade, liquidate, or resolve on a stale, wide, or jumped oracle."
  },
  {
    q: "Which markets are live?",
    a: "Three perpetual markets ship in the demo: SOL-PERP, BTC-PERP, and XAU-PERP (a gold hedge market). Collateral is native devnet SOL held in a program vault. Forecast trading uses the Predict pm-AMM with mock USDC; a seeded market is named HELM SOL >= 150."
  },
  {
    q: "How does the oracle guard work?",
    a: "The program checks publish age, confidence width, and jump size against per-market caps. The keeper posts real Pyth Core Compatible shard-0 prices on devnet (Hermes is used as an off-chain reference when available). The UI never fabricates a mark."
  },
  {
    q: "Is this real-money trading?",
    a: "No. This is a developer demonstration on Solana devnet, not available for real-money use. It is not wired to mainnet USDC even though the pm-AMM program ID is shared across clusters. Do not deposit mainnet assets."
  },
  {
    q: "Where is the program, and what was tested?",
    a: "The Helm program on devnet is 6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd. The helm-math crate has 29 unit tests (15 perps + 14 forecast resolver) and crates/helm-math-js has 6 Node tests, all recorded passing on 10 Nov 2026 (Asia/Calcutta)."
  }
];

export function Landing() {
  const [rows, setRows] = useState<(MarketAccount | null)[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const c = new Connection(RPC_URL, "confirmed");
    let dead = false;
    async function load() {
      try {
        const markets = await Promise.all(MARKETS.map((m) => fetchMarket(c, m.symbol)));
        if (dead) return;
        setRows(markets);
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
      <section className="hero-stage">
        <div className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-16 md:pb-28 md:pt-24">
          <Reveal>
            <p className="mb-4 text-xs font-medium uppercase tracking-[0.22em]" style={{ color: "var(--acc)" }}>
              Afterglow Guard for perpetual markets
            </p>
            <h1 className="max-w-4xl text-4xl font-semibold tracking-tight md:text-6xl md:leading-[1.08]">
              Oracle-safe perps, and prediction markets that would rather halt than guess.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed" style={{ color: "var(--mut)" }}>
              Helm is a Solana devnet venue for isolated-margin perpetual futures and Helm-resolved
              binary forecasts. It treats the oracle as a claim — and refuses to mark, trade,
              liquidate, or resolve when that claim is late, wide, or jumped.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/trade/SOL-PERP" className="btn-primary">Launch app</Link>
              <Link href="/forecast" className="btn-secondary">Forecast</Link>
              <a href="https://github.com/akhilexx/helm" className="btn-ghost" target="_blank" rel="noreferrer">
                GitHub repo
              </a>
            </div>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Reveal>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--acc)" }}>Live markets</p>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight">SOL, BTC and XAU — read from chain</h2>
            </div>
            <Link href="/markets" className="nav-link text-sm" style={{ color: "var(--acc)" }}>
              View all markets →
            </Link>
          </div>
        </Reveal>
        {err && (
          <p className="mb-4 text-sm" style={{ color: "var(--bad)" }}>
            Could not read markets: {err}. Empty cards stay empty on purpose — Helm does not invent marks.
          </p>
        )}
        <div className="grid gap-4 md:grid-cols-3">
          {MARKETS.map((meta, i) => {
            const m = rows[i];
            const status = m ? STATUS_LABEL[m.status] ?? `status ${m.status}` : "Uninitialised";
            const tone = !m ? "var(--mut)" : m.status === 0 ? "var(--ok)" : "var(--warn)";
            return (
              <Reveal key={meta.symbol} delay={0.08 * i}>
                <Link href={`/trade/${meta.symbol}`} className="card hover-lift block p-5">
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
                    on-chain mark · conf {m ? formatPx(m.markConf) : "—"}
                  </div>
                  <p className="mt-5 text-xs" style={{ color: "var(--mut)" }}>{meta.note}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      <section className="border-y bg-white" style={{ borderColor: "var(--line)" }}>
        <div className="mx-auto max-w-6xl px-5 py-16 md:py-20">
          <Reveal>
            <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--acc)" }}>Why Helm</p>
            <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">
              A risk rule, not another tape that always believes the last print.
            </h2>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {FEATURES.map((f, i) => (
              <Reveal key={f.title} delay={0.08 * i}>
                <div className="card hover-lift h-full p-6">
                  <div className="mb-4 h-10 w-10 rounded-xl" style={{ background: "var(--acc-soft)", color: "var(--acc)" }}>
                    <span className="flex h-full items-center justify-center text-sm font-semibold">{String(i + 1).padStart(2, "0")}</span>
                  </div>
                  <h3 className="text-lg font-semibold">{f.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{f.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:py-20">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--acc)" }}>How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">From a Pyth print to a position — or a halt.</h2>
        </Reveal>
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.06 * i}>
              <div className="flex gap-4">
                <div className="mono text-sm font-medium" style={{ color: "var(--acc)" }}>{s.n}</div>
                <div>
                  <h3 className="text-lg font-semibold">{s.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{s.body}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="bg-white" style={{ borderTop: "1px solid var(--line)", borderBottom: "1px solid var(--line)" }}>
        <div className="mx-auto grid max-w-6xl gap-8 px-5 py-12 md:grid-cols-4">
          {[
            { k: "Network", v: "Solana devnet" },
            { k: "Program", v: PROGRAM_ID.toBase58() },
            { k: "Tests", v: "29 Rust + 6 JS" },
            { k: "Markets", v: "SOL · BTC · XAU" }
          ].map((item, i) => (
            <Reveal key={item.k} delay={0.05 * i}>
              <div>
                <div className="text-xs uppercase tracking-[0.16em]" style={{ color: "var(--mut)" }}>{item.k}</div>
                <div className={`mt-2 text-lg font-semibold ${item.k === "Program" ? "mono break-all text-sm" : ""}`}>
                  {item.v}
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-16 md:py-20">
        <Reveal>
          <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--acc)" }}>FAQ</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Straight answers from the repo.</h2>
        </Reveal>
        <div className="mt-8">
          {FAQ.map((item) => (
            <details key={item.q} className="faq border-b py-2" style={{ borderColor: "var(--line)" }}>
              <summary className="flex items-center justify-between gap-4 py-3 text-left text-base font-medium">
                {item.q}
                <span style={{ color: "var(--acc)" }} aria-hidden>+</span>
              </summary>
              <p className="pb-4 text-sm leading-relaxed" style={{ color: "var(--mut)" }}>{item.a}</p>
            </details>
          ))}
        </div>
        <Reveal delay={0.1}>
          <div className="mt-10 flex flex-wrap gap-3">
            <Link href="/trade/SOL-PERP" className="btn-primary">Launch app</Link>
            <Link href="/markets" className="btn-secondary">Browse markets</Link>
          </div>
        </Reveal>
      </section>
    </div>
  );
}
