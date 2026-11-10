import Link from "next/link";

export function Disclaimer() {
  return (
    <footer className="border-t bg-white" style={{ borderColor: "var(--line)", color: "var(--mut)" }}>
      <div className="mx-auto max-w-6xl px-5 py-10">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-lg font-semibold" style={{ color: "var(--fg)" }}>
              Helm <span style={{ color: "var(--acc)" }}>Protocol</span>
            </div>
            <p className="mt-1 text-sm">Oracle-safe perps and Helm-resolved forecasts on Solana devnet.</p>
          </div>
          <div className="flex flex-wrap gap-4 text-sm">
            <Link href="/markets" className="nav-link">Markets</Link>
            <Link href="/forecast" className="nav-link">Forecast</Link>
            <Link href="/about" className="nav-link">About</Link>
            <a href="https://github.com/akhilexx/helm" className="nav-link" target="_blank" rel="noreferrer">GitHub</a>
          </div>
        </div>
        <p className="text-xs leading-relaxed">
          <strong style={{ color: "var(--warn)" }}>Devnet demo, not available for real-money use.</strong>{" "}
          Helm is a developer demonstration on Solana <strong>devnet</strong>. It is not a licensed
          exchange and is not offered as a real-money trading or betting service. Perps use devnet SOL.
          Forecast markets trade <strong>mock USDC (mUSDC)</strong> through the public Predict pm-AMM
          on devnet (program <span className="mono">GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y</span>).
          The same program ID exists on mainnet with real USDC — this app is wired only to the devnet
          mint and a devnet RPC. Do not deposit mainnet assets.
        </p>
      </div>
    </footer>
  );
}
