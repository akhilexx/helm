export function Disclaimer() {
  return (
    <footer className="mx-auto max-w-6xl px-5 pb-10 text-xs leading-relaxed" style={{ color: "var(--mut)" }}>
      <strong style={{ color: "var(--warn)" }}>Devnet demo, not available for real-money use.</strong>{" "}
      Helm is a developer demonstration on Solana <strong>devnet</strong>. It is not a licensed
      exchange and is not offered as a real-money trading or betting service. Perps use devnet SOL.
      Forecast markets trade <strong>mock USDC (mUSDC)</strong> through the public Predict pm-AMM
      on devnet (program <span className="mono">GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y</span>).
      The same program ID exists on mainnet with real USDC — this app is wired only to the devnet
      mint and a devnet RPC. Do not deposit mainnet assets.
    </footer>
  );
}
