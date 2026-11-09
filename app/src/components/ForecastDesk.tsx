"use client";
import { useCallback, useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
import {
  advanceResolution,
  decisionLabel,
  DEFAULT_DISPUTE_SECS,
  DEFAULT_VOID_GRACE_SECS,
  fetchHermesPrice,
  loadProposal,
  proposeResolution,
  questionFor,
  saveProposal,
  type ResolutionDecision
} from "@/lib/forecast";
import { decodeName, readOnlyClient, requestMusdc, signingClient } from "@/lib/pmamm";
import { marketState, minOutput, quoteSwap } from "@/lib/pm-amm-helpers";
import { getInjected } from "@/lib/wallet";
import { parseHelmName } from "@/lib/forecast";

export function ForecastDesk({ marketId }: { marketId: string }) {
  const [raw, setRaw] = useState<unknown>(null);
  const [err, setErr] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [amount, setAmount] = useState("5");
  const [decision, setDecision] = useState<ResolutionDecision | null>(null);
  const [ref, setRef] = useState<{ price: number; confidence: number; publishTime: number } | null>(null);

  const load = useCallback(async () => {
    const client = await readOnlyClient();
    const acc = await client.fetchMarket(new PublicKey(marketId));
    if (!acc) { setErr("Market not found on the pm-AMM."); return; }
    setRaw(acc);
    const name = decodeName(acc.name);
    const spec = parseHelmName(name);
    if (!spec) { setErr("This market is not Helm-encoded."); return; }
    const hermes = await fetchHermesPrice(spec.asset);
    setRef(hermes);
    const endTs = Number(acc.endTs.toNumber());
    const now = Math.floor(Date.now() / 1000);
    if (!hermes) { setDecision({ kind: "halt", reason: "missing" }); return; }
    const args = {
      now,
      expiry: endTs,
      price: hermes.price,
      strike: spec.strike,
      compare: spec.compare,
      publishTime: hermes.publishTime || now,
      confidence: hermes.confidence,
      prevPrice: hermes.price
    };
    const existing = loadProposal(marketId);
    if (!existing) {
      const d = proposeResolution(args);
      if (d.kind === "propose") saveProposal(marketId, { proposed: d.outcome, proposedAt: now });
      setDecision(d);
    } else {
      const d = advanceResolution({
        ...args,
        proposedAt: existing.proposedAt,
        proposed: existing.proposed,
        disputeWindow: DEFAULT_DISPUTE_SECS,
        voidGrace: DEFAULT_VOID_GRACE_SECS
      });
      if (d.kind === "disputed") saveProposal(marketId, null);
      setDecision(d);
    }
  }, [marketId]);

  useEffect(() => { load().catch((e) => setErr(e instanceof Error ? e.message : "load failed")); }, [load]);

  const name = raw ? decodeName((raw as { name: unknown }).name) : "";
  const spec = name ? parseHelmName(name) : null;
  const st = raw ? marketState(raw as Parameters<typeof marketState>[0]) : null;

  async function trade(dir: "usdcToYes" | "usdcToNo") {
    const w = getInjected();
    if (!w) { setStatus("Connect a Devnet wallet first."); return; }
    try {
      const session = await w.connect();
      await requestMusdc(session.publicKey.toString());
      const client = await signingClient(w as never);
      const micro = Math.round(parseFloat(amount) * 1_000_000);
      const q = quoteSwap(raw as Parameters<typeof quoteSwap>[0], dir, micro);
      const sig = await client.send.swap(new PublicKey(marketId), dir, micro, minOutput(q));
      setStatus(`Swap ${sig}`);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "swap failed");
    }
  }

  async function claim() {
    const w = getInjected();
    if (!w) return;
    try {
      await w.connect();
      const client = await signingClient(w as never);
      const sig = await client.send.claimWinnings(new PublicKey(marketId));
      setStatus(`Claim ${sig}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "claim failed");
    }
  }

  async function finalize() {
    if (!decision || decision.kind !== "finalize") return;
    const w = getInjected();
    if (!w) { setStatus("Only the market authority can finalize, from a Devnet wallet."); return; }
    try {
      await w.connect();
      const client = await signingClient(w as never);
      const sig = await client.send.resolveMarket(new PublicKey(marketId), decision.outcome);
      setStatus(`Resolved ${decision.outcome} · ${sig}`);
      saveProposal(marketId, null);
      await load();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "resolve failed");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <section>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--mut)" }}>{name || "Forecast"}</p>
        <h1 className="mb-2 text-3xl font-semibold">{spec ? questionFor(spec) : "Market"}</h1>
        {err && <p className="mb-4 text-sm" style={{ color: "var(--bad)" }}>{err}</p>}
        <div className="card mb-6 grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          <Kpi label="YES price" value={st ? `${(st.price * 100).toFixed(1)}%` : "—"} hint="pm-AMM, after accrual" />
          <Kpi label="Pyth ref" value={ref ? `$${ref.price.toLocaleString("en-US", { maximumFractionDigits: 2 })}` : "—"} hint={ref ? `conf ${ref.confidence.toFixed(2)}` : "Hermes"} />
          <Kpi label="Strike" value={spec ? `$${spec.strike.toLocaleString("en-US")}` : "—"} hint={spec ? spec.compare : ""} />
          <Kpi label="Status" value={st?.resolved ? `Resolved ${st.winner}` : st?.expired ? "Expired" : "Open"} hint={st && !st.expired ? `${Math.ceil(st.secondsLeft / 60)} min left` : "devnet mUSDC"} />
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--mut)" }}>Trade mock USDC</h2>
          <label className="mb-3 block text-xs" style={{ color: "var(--mut)" }}>
            Amount (mUSDC)
            <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
              value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => trade("usdcToYes")}>Buy YES</Btn>
            <Btn onClick={() => trade("usdcToNo")}>Buy NO</Btn>
            {st?.resolved && <Btn onClick={claim}>Claim winnings</Btn>}
          </div>
          {status && <p className="mt-3 break-all text-xs mono" style={{ color: "var(--mut)" }}>{status}</p>}
        </div>
      </section>
      <aside className="card p-5">
        <h2 className="mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--mut)" }}>Helm resolver</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--mut)" }}>
          Predict’s pm-AMM leaves resolution to the market authority, with no oracle. Helm will
          only call <span className="mono">resolveMarket</span> after a safe print and an uncontested
          dispute window ({DEFAULT_DISPUTE_SECS / 60} minutes). A bad oracle halts; after a day
          of unsafe prints the market is voided, not guessed.
        </p>
        <div className="mb-4 rounded-xl border p-3 text-sm" style={{ borderColor: "var(--line)" }}>
          {decision ? decisionLabel(decision) : "Waiting for an oracle look…"}
        </div>
        {decision?.kind === "finalize" && (
          <button onClick={finalize} className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: "var(--ok)", color: "#061018" }}>
            Finalize {decision.outcome.toUpperCase()} on pm-AMM
          </button>
        )}
        {decision?.kind === "halt" && (
          <p className="text-xs" style={{ color: "var(--warn)" }}>
            Trading may continue until expiry, but Helm will not resolve while the oracle is {decision.reason}.
          </p>
        )}
      </aside>
    </div>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div>
      <div className="text-[11px] uppercase tracking-wide" style={{ color: "var(--mut)" }}>{label}</div>
      <div className="mono text-xl">{value}</div>
      <div className="text-[11px]" style={{ color: "var(--mut)" }}>{hint}</div>
    </div>
  );
}
function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full px-4 py-2 text-sm font-medium"
      style={{ background: "var(--fg)", color: "var(--bg)" }}>{children}</button>
  );
}
