"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatHelmName, type ForecastSpec } from "@/lib/forecast";
import { signingClient, requestMusdc } from "@/lib/pmamm";
import { getInjected } from "@/lib/wallet";

export default function NewForecast() {
  const router = useRouter();
  const [asset, setAsset] = useState<ForecastSpec["asset"]>("SOL");
  const [compare, setCompare] = useState<ForecastSpec["compare"]>("gte");
  const [strike, setStrike] = useState("150");
  const [hours, setHours] = useState("24");
  const [liquidity, setLiquidity] = useState("50");
  const [status, setStatus] = useState<string | null>(null);

  async function submit() {
    const w = getInjected();
    if (!w) { setStatus("Connect a Devnet wallet first."); return; }
    const spec: ForecastSpec = { asset, compare, strike: Number(strike) };
    if (!Number.isFinite(spec.strike) || spec.strike <= 0) { setStatus("Strike must be a positive number."); return; }
    const durationSecs = Math.max(300, Math.round(parseFloat(hours) * 3600));
    const depositUsdc = Number(liquidity);
    if (!(depositUsdc > 0)) { setStatus("Seed liquidity must be positive mUSDC."); return; }
    setStatus("Creating on the Predict pm-AMM…");
    try {
      const session = await w.connect();
      await requestMusdc(session.publicKey.toString());
      const client = await signingClient(w as never);
      const { marketPda, marketId, signature } = await client.send.createMarket({
        name: formatHelmName(spec),
        durationSecs,
        initialPriceBps: 5000,
        depositUsdc
      });
      setStatus(`Created market ${marketId} · ${signature}`);
      router.push(`/forecast/${marketPda}`);
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "create failed");
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="mb-2 text-3xl font-semibold">Create a Helm-guarded market</h1>
      <p className="mb-6 text-sm" style={{ color: "var(--mut)" }}>
        This calls <span className="mono">createMarket</span> on the live Predict pm-AMM (devnet,
        mock USDC). The name encodes the oracle rule so anyone can re-check resolution without us.
        Minimum duration is 5 minutes (on-chain).
      </p>
      <div className="card space-y-4 p-5">
        <label className="block text-xs" style={{ color: "var(--mut)" }}>Asset
          <select className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" style={{ borderColor: "var(--line)" }}
            value={asset} onChange={(e) => setAsset(e.target.value as ForecastSpec["asset"])}>
            <option>SOL</option><option>BTC</option><option>XAU</option>
          </select>
        </label>
        <label className="block text-xs" style={{ color: "var(--mut)" }}>Threshold
          <select className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2" style={{ borderColor: "var(--line)" }}
            value={compare} onChange={(e) => setCompare(e.target.value as ForecastSpec["compare"])}>
            <option value="gte">at or above</option>
            <option value="lte">at or below</option>
          </select>
        </label>
        <label className="block text-xs" style={{ color: "var(--mut)" }}>Strike (USD)
          <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
            value={strike} onChange={(e) => setStrike(e.target.value)} />
        </label>
        <label className="block text-xs" style={{ color: "var(--mut)" }}>Duration (hours)
          <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
            value={hours} onChange={(e) => setHours(e.target.value)} />
        </label>
        <label className="block text-xs" style={{ color: "var(--mut)" }}>Seed liquidity (mUSDC)
          <input className="mt-1 w-full rounded-lg border bg-transparent px-3 py-2 mono" style={{ borderColor: "var(--line)" }}
            value={liquidity} onChange={(e) => setLiquidity(e.target.value)} />
        </label>
        <p className="mono text-xs" style={{ color: "var(--mut)" }}>
          Encoded name: {formatHelmName({ asset, compare, strike: Number(strike) || 0 })}
        </p>
        <button onClick={submit} className="rounded-full px-4 py-2 text-sm font-medium"
          style={{ background: "var(--fg)", color: "var(--bg)" }}>
          Create on devnet pm-AMM
        </button>
        {status && <p className="break-all text-xs mono" style={{ color: "var(--mut)" }}>{status}</p>}
      </div>
    </div>
  );
}
