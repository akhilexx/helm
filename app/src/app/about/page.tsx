export default function AboutPage() {
  return (
    <article className="prose-sm max-w-2xl leading-relaxed">
      <h1 className="mb-4 text-3xl font-semibold">Why Helm exists</h1>
      <p style={{ color: "var(--mut)" }}>
        Most perpetual venues treat the oracle as a number that always arrives. Helm treats it as a
        claim that can be late, wide, or jumped — and refuses to open risk or liquidate you when
        that claim fails its checks.
      </p>
      <h2 className="mb-2 mt-8 text-xl font-semibold">Oracle guard</h2>
      <ul className="list-disc pl-5" style={{ color: "var(--mut)" }}>
        <li>Rejects a zero price (missing).</li>
        <li>Rejects a stamp whose slot is older than the market’s max age.</li>
        <li>Rejects a confidence band wider than the market’s cap.</li>
        <li>On a jump larger than the cap, keeps the last good mark and flips the market to reduce-only.</li>
      </ul>
      <h2 className="mb-2 mt-8 text-xl font-semibold">What this is not</h2>
      <p style={{ color: "var(--mut)" }}>
        Helm is not a prediction market and does not list event contracts. It is a hackathon
        demonstration on Solana devnet. It reuses the Afterglow Kit ethic — multi-source honesty,
        refuse to guess — and the XAU / gold line from Gold Curve and XAUConnect as the XAU-PERP
        market. Those projects are not this program.
      </p>
    </article>
  );
}
