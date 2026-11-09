"use client";
import { useEffect, useState } from "react";
import { Connection } from "@solana/web3.js";
import { MARKETS, RPC_URL, STATUS_LABEL } from "@/lib/constants";
import { fetchMarket, type MarketAccount } from "@/lib/program";
import { formatPx, formatSol } from "@/lib/math";

export default function RiskPage() {
  const [rows, setRows] = useState<(MarketAccount | null)[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  useEffect(() => {
    const c = new Connection(RPC_URL, "confirmed");
    async function load() {
      setRows(await Promise.all(MARKETS.map((m) => fetchMarket(c, m.symbol))));
      setSlot(await c.getSlot());
    }
    load().catch(() => {});
    const id = setInterval(() => load().catch(() => {}), 10_000);
    return () => clearInterval(id);
  }, []);

  return (
    <div>
      <h1 className="mb-2 text-3xl font-semibold">Risk console</h1>
      <p className="mb-8 max-w-2xl text-sm" style={{ color: "var(--mut)" }}>
        This page is the product. Each row is an on-chain market and the oracle guard that stands in
        front of it. Empty cells mean the account is not initialised yet — they are not estimates.
        Current devnet slot: <span className="mono">{slot ?? "—"}</span>
      </p>
      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead style={{ color: "var(--mut)" }}>
            <tr>
              {["Market","Status","Mark","Conf","Oracle slot","Age cap","Conf cap","Jump cap","Rejected print","OI long","OI short","Insurance"].map((h) => (
                <th key={h} className="px-3 py-3 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MARKETS.map((meta, i) => {
              const m = rows[i];
              return (
                <tr key={meta.symbol} className="border-t hair">
                  <td className="px-3 py-3 font-medium">{meta.symbol}</td>
                  <td className="px-3 py-3">{m ? STATUS_LABEL[m.status] : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? formatPx(m.markPrice) : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? formatPx(m.markConf) : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? m.markSlot.toString() : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? `${m.maxAgeSlots} slots` : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? `${m.maxConfBps / 100}%` : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? `${m.maxJumpBps / 100}%` : "—"}</td>
                  <td className="px-3 py-3 mono">{m && m.lastRejectedPrice > 0n ? formatPx(m.lastRejectedPrice) : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? (Number(m.openInterestLong) / 1e6).toFixed(4) : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? (Number(m.openInterestShort) / 1e6).toFixed(4) : "—"}</td>
                  <td className="px-3 py-3 mono">{m ? `${formatSol(m.insuranceLamports)} SOL` : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
