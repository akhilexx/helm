"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Connection, PublicKey } from "@solana/web3.js";
import { MARKETS, RPC_URL } from "@/lib/constants";
import { fetchMarket, fetchPosition } from "@/lib/program";
import { formatPx, formatSize, formatSol, unrealizedPnl } from "@/lib/math";
import { fetchHelmMarkets } from "@/lib/pmamm";
import { questionFor } from "@/lib/forecast";
import { getInjected } from "@/lib/wallet";

type PerpRow = { symbol: string; side: string; size: string; entry: string; collat: string; upnl: string };
type FcRow = { question: string; href: string; yes: string; no: string };

export default function PositionsPage() {
  const [pk, setPk] = useState<string | null>(null);
  const [perps, setPerps] = useState<PerpRow[]>([]);
  const [forecasts, setForecasts] = useState<FcRow[]>([]);
  const [note, setNote] = useState<string | null>(null);

  async function load(ownerStr: string) {
    const owner = new PublicKey(ownerStr);
    const conn = new Connection(RPC_URL, "confirmed");
    const perpRows: PerpRow[] = [];
    for (const meta of MARKETS) {
      const [mkt, pos] = await Promise.all([fetchMarket(conn, meta.symbol), fetchPosition(conn, meta.symbol, owner)]);
      if (!pos || pos.size === 0n && pos.collateral === 0n) continue;
      const upnl = mkt && pos.size > 0n ? unrealizedPnl(pos.side === 0, pos.size, pos.entryPrice, mkt.markPrice) : 0n;
      perpRows.push({
        symbol: meta.symbol,
        side: pos.size === 0n ? "Flat" : pos.side === 0 ? "Long" : "Short",
        size: formatSize(pos.size),
        entry: formatPx(pos.entryPrice),
        collat: `${formatSol(pos.collateral)} SOL`,
        upnl: `${formatSol(upnl)} SOL`
      });
    }
    setPerps(perpRows);
    try {
      const { getAssociatedTokenAddress, getAccount } = await import("@solana/spl-token");
      const markets = await fetchHelmMarkets();
      const fc: FcRow[] = [];
      for (const m of markets) {
        const acc = m.account as { yesMint: PublicKey; noMint: PublicKey };
        const yesAta = await getAssociatedTokenAddress(acc.yesMint, owner);
        const noAta = await getAssociatedTokenAddress(acc.noMint, owner);
        let yes = 0, no = 0;
        try { yes = Number((await getAccount(conn, yesAta)).amount) / 1e6; } catch {}
        try { no = Number((await getAccount(conn, noAta)).amount) / 1e6; } catch {}
        if (yes === 0 && no === 0) continue;
        fc.push({
          question: questionFor(m.spec),
          href: `/forecast/${m.pubkey.toBase58()}`,
          yes: yes.toFixed(2),
          no: no.toFixed(2)
        });
      }
      setForecasts(fc);
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not read forecast positions");
    }
  }

  useEffect(() => {
    const w = getInjected();
    if (!w) return;
    w.connect().then((r) => {
      const next = r.publicKey.toString();
      setPk(next);
      load(next).catch((e) => setNote(e instanceof Error ? e.message : "load failed"));
    }).catch(() => {});
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">Positions</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--mut)" }}>
        Connected {pk ? <span className="mono">{pk.slice(0, 4)}…{pk.slice(-4)}</span> : "— (connect a Devnet wallet)"}.
        Empty tables mean no positions were found, not that numbers were estimated.
      </p>
      {note && <p className="mb-4 text-sm" style={{ color: "var(--warn)" }}>{note}</p>}

      <h2 className="mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--mut)" }}>Perps</h2>
      <div className="card mb-8 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead style={{ color: "var(--mut)" }}><tr>
            {["Market","Side","Size","Entry","Collateral","uPnL"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {perps.length === 0 && <tr><td className="px-3 py-3" colSpan={6} style={{ color: "var(--mut)" }}>No perp positions.</td></tr>}
            {perps.map((r) => (
              <tr key={r.symbol} className="border-t hair">
                <td className="px-3 py-3"><Link href={`/trade/${r.symbol}`}>{r.symbol}</Link></td>
                <td className="px-3 py-3">{r.side}</td>
                <td className="px-3 py-3 mono">{r.size}</td>
                <td className="px-3 py-3 mono">{r.entry}</td>
                <td className="px-3 py-3 mono">{r.collat}</td>
                <td className="px-3 py-3 mono">{r.upnl}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="mb-3 text-sm uppercase tracking-wide" style={{ color: "var(--mut)" }}>Forecast</h2>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead style={{ color: "var(--mut)" }}><tr>
            {["Market","YES","NO"].map((h) => <th key={h} className="px-3 py-3 font-medium">{h}</th>)}
          </tr></thead>
          <tbody>
            {forecasts.length === 0 && <tr><td className="px-3 py-3" colSpan={3} style={{ color: "var(--mut)" }}>No forecast outcome tokens.</td></tr>}
            {forecasts.map((r) => (
              <tr key={r.href} className="border-t hair">
                <td className="px-3 py-3"><Link href={r.href}>{r.question}</Link></td>
                <td className="px-3 py-3 mono">{r.yes}</td>
                <td className="px-3 py-3 mono">{r.no}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
