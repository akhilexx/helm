# Helm demo script (about 3 minutes)

Network: Solana devnet. Wallet: Phantom or Solflare, Devnet mode.

1. **Open the homepage** at https://akhilexx.github.io/helm/. Three market cards (SOL-PERP, BTC-PERP, XAU-PERP). Point at the status pill and the on-chain mark. If a card shows “Uninitialised” and an em-dash, say so — Helm does not fabricate a mark.
2. **Open Risk console.** Walk the table: age cap, confidence cap, jump cap, last rejected print, open interest, insurance. This is the product.
3. **Open SOL-PERP.** Show the on-chain mark next to the Pyth Hermes reference and say they are different feeds: Hermes is informational, the mark is what the program will trade on.
4. **Connect a Devnet wallet.** Deposit a small amount of devnet SOL (for example 0.05). Open a 1.0 long. Show the health ring, entry, and liquidation price.
5. **Explain a trip.** Describe (or, if a keeper is running, trigger with a crafted jump in a local test) reduce-only: new risk is blocked; reduces still work; liquidation still requires a live oracle.
6. **XAU-PERP.** One sentence: gold hedge market, not an event contract.
7. **Open Forecast.** Show the Helm-encoded market list (name `HELM SOL >= 150`). Open the seeded market if it is visible (PDA `HRjM8df1dFoi41XqqMZ8SibyQSs4gCDmHaQV6w47m1C4`).
8. **Resolver panel.** Read the status aloud: trading is on the Predict pm-AMM; Helm will not call resolve while the oracle is unsafe; a proposal must survive the dispute window.
9. **Create market (optional).** Encode a new `HELM BTC >= …` or `HELM XAU >= …` rule. Mention mock USDC and the faucet.
10. **Positions.** Show the combined perps + forecast table. Empty rows mean no position, not an estimate.
11. **Close on the footer.** “Devnet demo, not available for real-money use.”

Do not claim TVL, volume, or user counts that the accounts do not show.
