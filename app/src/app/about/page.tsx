export default function AboutPage() {
  return (
    <article className="max-w-2xl leading-relaxed">
      <h1 className="mb-4 text-3xl font-semibold">Why Helm exists</h1>
      <p style={{ color: "var(--mut)" }}>
        Most trading venues treat the oracle as a number that always arrives. Helm treats it as a
        claim that can be late, wide, or jumped — and refuses to mark, liquidate or resolve when
        that claim fails its checks.
      </p>
      <h2 className="mb-2 mt-8 text-xl font-semibold">Perps</h2>
      <p style={{ color: "var(--mut)" }}>
        Isolated-margin SOL, BTC and XAU perpetuals. Every open, increase, withdraw and liquidation
        is gated by oracle age, confidence and jump bounds. A jumped print flips the market to
        reduce-only instead of becoming the new mark.
      </p>
      <h2 className="mb-2 mt-8 text-xl font-semibold">Forecast</h2>
      <p style={{ color: "var(--mut)" }}>
        Binary price-threshold markets. Trading uses the live Predict pm-AMM on Solana devnet
        (mock USDC), not a homemade curve. Predict’s own docs say resolution is still a manual
        authority call with no oracle or dispute process. Helm supplies that missing piece: a
        Pyth Hermes threshold, the same oracle checks as the perps engine, a dispute window, and
        a void if the oracle never becomes safe. Helm will not call <span className="mono">resolveMarket</span> on a bad print.
      </p>
      <h2 className="mb-2 mt-8 text-xl font-semibold">What this is not</h2>
      <p style={{ color: "var(--mut)" }}>
        This is a hackathon demonstration on Solana devnet. It is not available for real-money use.
        It is not wired to mainnet USDC even though the pm-AMM program ID is shared across clusters.
      </p>
    </article>
  );
}
