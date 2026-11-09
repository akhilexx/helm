# Helm demo script (about 3 minutes)

Network: Solana devnet. Wallet: Phantom or Solflare, Devnet mode.

1. **Open the homepage.** Three market cards (SOL-PERP, BTC-PERP, XAU-PERP). Point at the status pill and the on-chain mark. If a card shows “Uninitialised” and an em-dash, say so — Helm does not fabricate a mark.
2. **Open Risk console.** Walk the table: age cap, confidence cap, jump cap, last rejected print, open interest, insurance. This is the product.
3. **Open SOL-PERP.** Show the on-chain mark next to the Pyth Hermes reference and say they are different feeds: Hermes is informational, the mark is what the program will trade on.
4. **Connect a Devnet wallet.** Deposit a small amount of devnet SOL (for example 0.05). Open a 1.0 long. Show the health ring, entry, and liquidation price.
5. **Explain a trip.** Describe (or, if a keeper is running, trigger with a crafted jump in a local test) reduce-only: new risk is blocked; reduces still work; liquidation still requires a live oracle.
6. **XAU-PERP.** One sentence: gold hedge market, not an event contract.
7. **Close on the footer disclaimer.** Devnet demonstration, not offered as a real-money venue to persons in India, not a prediction market.

Do not claim TVL, volume, or user counts that the accounts do not show.
