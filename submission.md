# Helm — submission package

Solana Perps & Prediction Markets  
https://hackathons.solana.com/hackathons/perps-and-prediction-markets  
Prepared 10 Nov 2026, Asia/Calcutta (IST). Entrant: Akhilesh Patil, solo, India.

## Is the submission window open?

As of the 10 Nov 2026 fetch of the official page:

- Registration is live (582 registered).
- The page shows **0 submissions** and a deadline of **5 Dec 2026**.
- How-it-works says submit before the deadline; late submissions are not accepted.
- Supporting materials (repo, demo, videos, team, up to 3 sponsor tracks) are listed as optional.
- The page copy says “one week to build”; the platform how-it-works page says 14 days from launch. OrbitFlare’s free RPC is “one week from the start.” The hard date is **5 Dec 2026**.
- Homepage also listed the event under “Scheduled hackathons” on the same day it featured it as live. Treat the event page’s deadline counter as authoritative, and confirm the Submit button is enabled after signing in.

Projects stay private until after judging.

## Do not pick the Spark pm-AMM sponsor track

That bounty is a $1,000 **investment** (not a grant), judged first on live pm-AMM traction, and it requires a real prediction-market integration. Helm is deliberately not a prediction market (see `research.md` and India’s PROGA 2025 / Rules 2026). OrbitFlare is free RPC, not a judged prize; mention it only if it was actually used (it was not, as of this writing).

Pick **only the main track** ($50k / $30k / $20k).

## Form answers

Sign in at https://hackathons.solana.com with a wallet or Google, open the Perps and Prediction Markets hackathon, submit a project. Field names below follow the how-it-works list; the live form may use slightly different labels — paste into the matching box.

### Project name
```
Helm
```

### Tagline / one-liner
```
Oracle-safe perps on Solana — a venue that would rather halt than mark you on a bad print.
```

### Description
```
Helm is an isolated-margin perpetual-futures venue on Solana devnet whose product is the risk engine, not the leverage slider.

Every open, increase, withdraw and liquidation is gated by the same on-chain oracle checks: the mark must exist, its publish slot must be fresh against the chain clock, its confidence band must be inside the market cap, and a jump against the last good mark trips the market into reduce-only instead of becoming the new mark. Liquidation is allowed only while that oracle is live. Helm will not liquidate a trader on a stale or jumped print.

Three markets ship in the demo: SOL-PERP, BTC-PERP, and XAU-PERP (a gold hedge market). Collateral is native devnet SOL held in a program vault. A keeper stamps Pyth Hermes prices on-chain so judges can see a real reference tape next to the on-chain mark. The web app reads those accounts live; it does not invent marks when an account is missing.

Helm is not a prediction market and does not integrate the PREDICT pm-AMM. It is a developer demonstration on devnet, not an offer of a real-money venue.

The risk-math crate (PnL, margin, liquidation price, oracle checks) has 15 unit tests, all passing. The on-chain program is a native Solana program that uses Anchor-compatible instruction discriminators so a conventional TypeScript client can talk to it.
```

### How it works / technical details
```
Program id (declared): 6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd
Network: Solana devnet
Collateral: native devnet SOL in a program-owned vault PDA
Accounts: Config, Vault, Market (per 8-byte symbol), Position (per market + owner)
Instructions: initialize, create_market, post_oracle, set_market_status, deposit, withdraw, open_or_increase, reduce, liquidate
Oracle path: scripts/keeper.mjs reads Pyth Hermes HTTP and posts price, confidence and the current slot; the program re-checks age, confidence and jump
Default market params: IM 10%, MM 5%, max 10x, max age 4096 slots, max confidence 2%, max jump 5%
Frontend: Next.js + Tailwind, dark/light, wallet via injected Phantom/Solflare, live RPC reads
Tests: cargo test -p helm-math (15 passed, 10 Nov 2026 IST); node --test crates/helm-math-js/math.test.mjs
```

### Inspiration / why this
```
The closest comparable event on this same platform, Stocklana (completed Oct 2026), awarded first place to Roster Finance for “stock leverage without margin liquidation” — a novel risk rule plus a working product, not another spot DEX. Helm is the perpetual-markets version of that idea: leverage with an oracle guard that refuses the unsafe settlement. It also avoids prediction-market shape, which is legally the wrong product for an Indian entrant under the Promotion and Regulation of Online Gaming Act, 2025 and the 2026 rules.
```

### GitHub repo
Paste the public URL after the owner pushes this directory (the repo is prepared locally; it is not pushed from this environment). Suggested name: `akhilexx/helm`.

### Live demo
Paste the Render (or other) URL once the frontend is hosted. Until then, run `cd app && npm install && npm run dev` against devnet.

### Pitch video (≤ 3 min)
Record from `DEMO.md`. Voiceover cues:

| Time | Visual | Voice |
|---|---|---|
| 0:00–0:20 | Homepage hero | “Helm is a perpetual-futures venue on Solana that treats the oracle as a claim, not a fact.” |
| 0:20–0:50 | Risk console table | “Every market has an age cap, a confidence cap and a jump cap. Fail those and Helm goes reduce-only. It will not mark you — or liquidate you — on a bad print.” |
| 0:50–1:30 | SOL-PERP trade ticket + wallet | “Isolated margin, devnet SOL collateral. I deposit, I open a long, and the health ring is equity over maintenance margin.” |
| 1:30–2:10 | Position stats / liq price | “Liquidation price is computed on-chain from the same math the tests cover. Fifteen risk-math tests passed before this recording.” |
| 2:10–2:35 | XAU-PERP card | “XAU-PERP is a gold hedge market, not an event contract. Helm is not a prediction market.” |
| 2:35–3:00 | Footer disclaimer | “This demo runs on Solana devnet. It is not a real-money venue.” |

### Technical video (≤ 5 min)
Walk `programs/helm/src/math.rs` (oracle checks and liquidation price), then `post_oracle` and `require_live_oracle` in `lib.rs`, then `scripts/keeper.mjs`, then the Risk console reading those fields live.

### Team
Solo — Akhilesh Patil. GitHub `akhilexx`. No teammates to invite.

### Sponsor tracks
None. Do not select “Best use of the pm-AMM by PREDICT.”

## Browser steps to submit

1. Open https://hackathons.solana.com/hackathons/perps-and-prediction-markets
2. Sign in with Google or a Solana wallet (the page allows either).
3. Confirm the page still shows the event as open and that a **Submit** / **Submit project** control is visible. If it is disabled, the official build week may not have started; keep the package ready and submit as soon as it enables, before **5 Dec 2026**.
4. Create a project named **Helm**.
5. Paste the name, tagline, description and technical details above.
6. Add the GitHub URL (after the owner pushes) and the live demo URL (after Render).
7. Upload the pitch video (≤ 3 min) and optional technical video (≤ 5 min).
8. Leave team empty (solo). Do **not** opt into the pm-AMM track.
9. Submit. Projects remain private until after judging.
10. If a prize is later awarded, the Solana Foundation contacts winners for payout (expect KYC then). No pre-submit KYC is published.

## What still has to happen after this package

| Step | Who | Notes |
|---|---|---|
| Devnet SOL for the deployer `78KrbtrWJVuLhnGSb9UQsdcQki2oHw86N1MehJqLNskb` | Anyone with access to https://faucet.solana.com | Public RPC `requestAirdrop` returned HTTP 410 on 10 Nov 2026 (“RPC faucet is closed… Request test SOL at https://faucet.solana.com”). Deploy needs about 1.1 SOL. |
| `./scripts/deploy.sh` then `node scripts/init.mjs` and `node scripts/keeper.mjs --once` | After the airdrop | Program binary is already built at `target/deploy/helm.so` (134,936 bytes). |
| Push this repo to GitHub as `akhilexx` | Owner (GitHub login is owner-held) | Do not push `keys/`. |
| Host `app/` on Render | Browser session using the vault login named `Render` | Build `npm install && npm run build`, start `npm start`, root `app`. No login-free host was used. |
| Record and upload videos | Owner review (standing rule for demo videos) | Script is in this file and in `DEMO.md`. |
| Click Submit on the hackathon form | Browser, owner’s Google or wallet login | Package above is ready to paste. |
