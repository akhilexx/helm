"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Connection,
  PublicKey,
  Transaction
} from "@solana/web3.js";
import { MARKETS, RPC_URL, SCALE, STATUS_LABEL } from "@/lib/constants";
import { fetchMarket, fetchPosition, type MarketAccount, type PositionAccount } from "@/lib/program";
import { depositIx, openOrIncreaseIx, reduceIx, withdrawIx } from "@/lib/ix";
import {
  formatPx,
  formatSize,
  formatSol,
  healthPct,
  liquidationPrice,
  marginRequired,
  unrealizedPnl
} from "@/lib/math";
import { HealthRing } from "./HealthRing";
import { getInjected } from "@/lib/wallet";

export function TradeDesk({ symbol }: { symbol: string }) {
  const meta = MARKETS.find((m) => m.symbol === symbol);
  const connection = useMemo(() => new Connection(RPC_URL, "confirmed"), []);
  const [market, setMarket] = useState<MarketAccount | null>(null);
  const [pos, setPos] = useState<PositionAccount | null>(null);
  const [pk, setPk] = useState<string | null>(null);
  const [side, setSide] = useState<"long" | "short">("long");
  const [size, setSize] = useState("1");
  const [collat, setCollat] = useState("0.05");
  const [status, setStatus] = useState<string | null>(null);
  const [refPx, setRefPx] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const m = await fetchMarket(connection, symbol);
    setMarket(m);
    if (pk) {
      const p = await fetchPosition(connection, symbol, new PublicKey(pk));
      setPos(p);
    }
  }, [connection, symbol, pk]);

  useEffect(() => { refresh().catch(() => {}); const id = setInterval(() => refresh().catch(() => {}), 10_000); return () => clearInterval(id); }, [refresh]);

  useEffect(() => {
    if (!meta) return;
    fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${meta.pythId}`)
      .then((r) => r.json())
      .then((j) => {
        const p = j?.parsed?.[0]?.price;
        if (!p) return;
        const px = Number(p.price) * 10 ** p.expo;
        setRefPx(px.toLocaleString("en-US", { maximumFractionDigits: 2 }));
      })
      .catch(() => setRefPx(null));
  }, [meta]);

  const stats = useMemo(() => {
    if (!market || !pos || pos.size === 0n) return null;
    const isLong = pos.side === 0;
    const upnl = unrealizedPnl(isLong, pos.size, pos.entryPrice, market.markPrice);
    const eq = pos.collateral + upnl; // bigint; upnl can be negative — use signed via Number for display only
    const eqN = Number(pos.collateral) + Number(upnl);
    const mm = marginRequired(pos.size, market.markPrice, market.mmBps);
    const im = marginRequired(pos.size, market.markPrice, market.imBps);
    const liq = liquidationPrice(isLong, pos.size, pos.entryPrice, pos.collateral, market.mmBps);
    return { isLong, upnl, eqN, mm, im, liq, health: healthPct(BigInt(Math.max(0, Math.trunc(eqN))), mm) };
  }, [market, pos]);

  async function send(build: (owner: PublicKey) => ReturnType<typeof depositIx>) {
    const w = getInjected();
    if (!w) { setStatus("Connect a Devnet wallet first."); return; }
    const owner = new PublicKey((await w.connect()).publicKey.toString());
    setPk(owner.toString());
    const ix = build(owner);
    const tx = new Transaction().add(ix);
    tx.feePayer = owner;
    tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
    const signed = await w.signTransaction(tx);
    const sig = await connection.sendRawTransaction(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (signed as any).serialize()
    );
    setStatus(`Submitted ${sig}`);
    await connection.confirmTransaction(sig, "confirmed");
    await refresh();
  }

  if (!meta) return <p>Unknown market.</p>;

  return (
    <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section>
        <p className="text-xs uppercase tracking-[0.2em]" style={{ color: "var(--mut)" }}>{meta.pair}</p>
        <h1 className="mb-1 text-3xl font-semibold">{symbol}</h1>
        <p className="mb-6 text-sm" style={{ color: "var(--mut)" }}>{meta.note}</p>

        <div className="card mb-6 grid grid-cols-2 gap-4 p-5 md:grid-cols-4">
          <Kpi label="On-chain mark" value={market ? formatPx(market.markPrice) : "—"} hint={`slot ${market ? market.markSlot.toString() : "—"}`} />
          <Kpi label="Pyth Hermes (ref)" value={refPx ?? "—"} hint="off-chain reference, not the mark" />
          <Kpi label="Confidence" value={market ? formatPx(market.markConf) : "—"} hint={`max ${market ? market.maxConfBps / 100 : "—"}%`} />
          <Kpi label="Status" value={market ? STATUS_LABEL[market.status] : "Uninitialised"} hint={`jump cap ${market ? market.maxJumpBps / 100 : "—"}%`} />
        </div>

        <div className="card p-5">
          <div className="mb-4 flex gap-2">
            {(["long", "short"] as const).map((s) => (
              <button key={s} onClick={() => setSide(s)}
                className="rounded-full px-4 py-1.5 text-sm capitalize"
                style={{
                  background: side === s ? (s === "long" ? "var(--ok)" : "var(--bad)") : "transparent",
                  color: side === s ? "#061018" : "var(--fg)",
                  border: "1px solid var(--line)"
                }}>{s}</button>
            ))}
          </div>
          <label className="mb-3 block text-xs" style={{ color: "var(--mut)" }}>
            Size (base units)
            <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
              value={size} onChange={(e) => setSize(e.target.value)} />
          </label>
          <label className="mb-4 block text-xs" style={{ color: "var(--mut)" }}>
            Collateral to deposit (devnet SOL)
            <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
              value={collat} onChange={(e) => setCollat(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={() => send((o) => depositIx(o, symbol, BigInt(Math.round(parseFloat(collat) * 1e9))))}>Deposit</Btn>
            <Btn onClick={() => send((o) => openOrIncreaseIx(o, symbol, side === "long", BigInt(Math.round(parseFloat(size) * SCALE))))}>
              Open / increase {side}
            </Btn>
            <Btn onClick={() => send((o) => reduceIx(o, symbol, BigInt(Math.round(parseFloat(size) * SCALE))))}>Reduce</Btn>
            <Btn onClick={() => send((o) => withdrawIx(o, symbol, BigInt(Math.round(parseFloat(collat) * 1e9))))}>Withdraw</Btn>
          </div>
          {status && <p className="mt-3 break-all text-xs mono" style={{ color: "var(--mut)" }}>{status}</p>}
        </div>
      </section>

      <aside className="card p-5">
        <h2 className="mb-4 text-sm uppercase tracking-wide" style={{ color: "var(--mut)" }}>Your position</h2>
        <div className="mb-4 flex items-center gap-4">
          <HealthRing ratio={stats?.health ?? null} />
          <div className="text-sm" style={{ color: "var(--mut)" }}>
            Health is equity ÷ maintenance margin. Below 1.0× the position is liquidatable — but only if the oracle itself is live.
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-y-3 text-sm">
          <Dt>Side</Dt><Dd>{pos && pos.size > 0n ? (pos.side === 0 ? "Long" : "Short") : "Flat"}</Dd>
          <Dt>Size</Dt><Dd>{pos ? formatSize(pos.size) : "—"}</Dd>
          <Dt>Entry</Dt><Dd>{pos ? formatPx(pos.entryPrice) : "—"}</Dd>
          <Dt>Collateral</Dt><Dd>{pos ? `${formatSol(pos.collateral)} SOL` : "—"}</Dd>
          <Dt>uPnL</Dt><Dd>{stats ? `${formatSol(stats.upnl)} SOL` : "—"}</Dd>
          <Dt>Liq. price</Dt><Dd>{stats?.liq ? formatPx(stats.liq) : "—"}</Dd>
          <Dt>IM / MM</Dt><Dd>{stats ? `${formatSol(stats.im)} / ${formatSol(stats.mm)}` : "—"}</Dd>
        </dl>
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
function Dt({ children }: { children: React.ReactNode }) {
  return <dt style={{ color: "var(--mut)" }}>{children}</dt>;
}
function Dd({ children }: { children: React.ReactNode }) {
  return <dd className="mono text-right">{children}</dd>;
}
function Btn({ children, onClick }: { children: React.ReactNode; onClick: () => void }) {
  return (
    <button onClick={onClick} className="rounded-full px-4 py-2 text-sm font-medium"
      style={{ background: "var(--fg)", color: "var(--bg)" }}>
      {children}
    </button>
  );
}
