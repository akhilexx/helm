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

## Combined entry, and the Spark pm-AMM track

Submit **one** project named Helm (perps + Forecast). The event theme is both; splitting would make two thinner entries.

Also **opt into** “Best use of the pm-AMM by PREDICT.” Forecast trading calls the live program `GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y` with mock USDC on devnet — that is a core integration, not a mock, which is the eligibility bar. Predict’s own docs say resolution is still a manual authority call and ask for an oracle plus a dispute window; that is Helm’s Forecast resolver.

Be honest on the form: we do not report users, volume or fees we did not generate. Traction is the bounty’s heaviest published weight, so the $1,000 investment is unlikely on that criterion. The main-track $100k is the primary target. OrbitFlare was not used.

The owner accepted the India legal note in `research.md` provided the product stays on devnet / test tokens. The footer states: “Devnet demo, not available for real-money use.”

## Form answers

Sign in at https://hackathons.solana.com with a wallet or Google, open the Perps and Prediction Markets hackathon, submit a project. Field names below follow the how-it-works list; the live form may use slightly different labels — paste into the matching box.

### Project name
```
Helm
```

### Tagline / one-liner
```
Oracle-safe perps and forecasts on Solana — a venue that would rather halt than mark or resolve you on a bad print.
```

### Description
```
Helm is an isolated-margin perpetual-futures venue on Solana devnet whose product is the risk engine, not the leverage slider.

Every open, increase, withdraw and liquidation is gated by the same on-chain oracle checks: the mark must exist, its publish slot must be fresh against the chain clock, its confidence band must be inside the market cap, and a jump against the last good mark trips the market into reduce-only instead of becoming the new mark. Liquidation is allowed only while that oracle is live. Helm will not liquidate a trader on a stale or jumped print.

Three markets ship in the demo: SOL-PERP, BTC-PERP, and XAU-PERP (a gold hedge market). Collateral is native devnet SOL held in a program vault. A keeper stamps real Pyth prices (on-chain Core Compatible shard-0 feeds; Hermes if a key is already present) so judges can see a real reference tape next to the on-chain mark. The web app reads those accounts live; it does not invent marks when an account is missing.

Forecast is the prediction-market half. Trading uses the live Predict pm-AMM on Solana devnet (mock USDC), not a homemade curve. Market names encode a price threshold (for example HELM SOL >= 150). After expiry, Helm reads Pyth Hermes and applies the same oracle checks as the perps engine. A safe print proposes YES or NO and opens a dispute window. A later safe print that disagrees discards the proposal. Helm calls resolveMarket only after an uncontested window. If the oracle never becomes safe, Helm does not guess — it halts, then treats the market as void.

This is a developer demonstration on Solana devnet. It is not available for real-money use. The app is wired to the devnet mock-USDC mint, not mainnet USDC.

The risk-math crate (perps PnL/margin/liquidation plus the forecast resolver) has 29 unit tests, all passing (10 Nov 2026 IST). A Forecast market was created on the live pm-AMM the same day: name HELM SOL >= 150, market id 71859704526502, PDA HRjM8df1dFoi41XqqMZ8SibyQSs4gCDmHaQV6w47m1C4, signature 5zap6FgEYwKjrB4RuqxqgUzgg3C93uG6f7SY6X8WMcTAxeQxtRvencLwzaUexyCq2fDpGkWADkLSunufgajEyuUE.
```

### How it works / technical details
```
Program id (declared): 6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd
Network: Solana devnet
Collateral: native devnet SOL in a program-owned vault PDA
Accounts: Config, Vault, Market (per 8-byte symbol), Position (per market + owner)
Instructions: initialize, create_market, post_oracle, set_market_status, deposit, withdraw, open_or_increase, reduce, liquidate
Oracle path: scripts/keeper.mjs tries Hermes HTTP only with an existing PYTH_API_KEY (signup not performed; Hermes returned 401 without a key on 10 Nov 2026 IST), then reads Pyth Core Compatible shard-0 price-feed accounts on Solana devnet and posts price, confidence and the feed posted_slot; the program re-checks age, confidence and jump
Default market params: IM 10%, MM 5%, max 10x, max age 4096 slots, max confidence 2%, max jump 5%
Frontend: Next.js + Tailwind, dark/light, wallet via injected Phantom/Solflare, live RPC reads
Helm program (devnet, executable): 6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd
  explorer: https://solscan.io/account/6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd?cluster=devnet
  deploy tx: H9SzM5nhajy1cZvf1cdwFHqdT1hcUEHZXdFqxwQfnMqn2KJ1TNRdcB2Bsug5FRr4p3UD2DjCZqa4mJA8L36Vp6P
  init tx: 5KewZeR4UJFQQCe35nTgXnpzEBU46x9QbHNrx7MHYhQA4wM7WQGhti5oeta8xYUtfWoYbr3kPiCe8idf8TbZ6jmd
  SOL-PERP: HsN1VKHYG5kw8JCxqc7MroYgmCAMbwHEMMoH1Tm2gNUx
  BTC-PERP: HVu6tg3gNEiztaAJeaNfhZWpYX9w6eu57xC2QVinSPmi
  XAU-PERP: 84nbrVPxDx3ZLYYsdqzu3GncLFy4HXzfiJFv3G19mEVS
  upgrade tx (Market unpack padding fix): 27Zcbvzm1fSGdU5AxBNeFHYLryoAfPXCabv8Vv9ZEsyfPyngxdgrcZXyrPpgcToV4FZHVSmg1hhtsuq9PPxEKrRv
  keeper tx: 3yN3vPM3Fxipifx6yi1gQPHUL29d3J5VUNxc8wNKY3Wsg9FexFSm1nMfUfDNVhbiv5R7J2PdFBJrWtZQ3Y2TJnEM
  keeper source: Pyth Core Compatible shard-0 on devnet (Hermes 401 without API key; no signup)
  SOL-PERP mark 85964823 ($85.964823) conf 40795 publish 10 Nov 2026, 12:28:10 IST slot 520660235 account 7AviUf9nL62mcxNbQGKm4nKDQnPjswo6c5MX4D57HmyE
  BTC-PERP mark 74567899580 ($74567.89958) conf 92350623 publish 10 Nov 2026, 12:24:52 IST slot 520659396 account APgzQGGdv2qCgBkX6aHVkrGePtBVDDg68GiqaM7rmtf5
  XAU-PERP mark 4121287000 ($4121.287) conf 143000 publish 10 Nov 2026, 12:24:52 IST slot 520659408 account csXV1aFF7uAfTHYWx6dDj718hnf7dUDU8v54dubib17
  deployer remaining: 4.56981784 SOL
Forecast: @pm-amm/sdk against program GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y, mock USDC 3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ
Seeded market: HELM SOL >= 150 / 71859704526502 / HRjM8df1dFoi41XqqMZ8SibyQSs4gCDmHaQV6w47m1C4
Routes: / (perps), /forecast, /forecast/new, /forecast/[pda], /positions, /risk, /about
Tests: cargo test -p helm-math (29 passed, 10 Nov 2026 IST); node --test crates/helm-math-js/math.test.mjs (6 passed)
Entrant LinkedIn: https://www.linkedin.com/in/akhilesh-patil-35b4b11b6
```

### Inspiration / why this
```
The closest comparable event on this same platform, Stocklana (completed Oct 2026), awarded first place to Roster Finance for “stock leverage without margin liquidation” — a novel risk rule plus a working product, not another spot DEX. Helm is the perpetual-markets version of that idea: leverage with an oracle guard that refuses the unsafe settlement. It also avoids prediction-market shape, which is legally the wrong product for an Indian entrant under the Promotion and Regulation of Online Gaming Act, 2025 and the 2026 rules.
```

### GitHub repo
Paste the public URL after the owner pushes this directory (the repo is prepared locally; it is not pushed from this environment). Suggested name: `akhilexx/helm`.

### Live demo
https://akhilexx.github.io/helm/

### Pitch video (≤ 3 min)
Record from `DEMO.md`. Voiceover cues:

| Time | Visual | Voice |
|---|---|---|
| 0:00–0:20 | Homepage hero | “Helm is a perpetual-futures venue on Solana that treats the oracle as a claim, not a fact.” |
| 0:20–0:50 | Risk console table | “Every market has an age cap, a confidence cap and a jump cap. Fail those and Helm goes reduce-only. It will not mark you — or liquidate you — on a bad print.” |
| 0:50–1:30 | SOL-PERP trade ticket + wallet | “Isolated margin, devnet SOL collateral. I deposit, I open a long, and the health ring is equity over maintenance margin.” |
| 1:30–2:10 | Position stats / liq price | “Liquidation price is computed on-chain from the same math the tests cover. Fifteen risk-math tests passed before this recording.” |
| 2:00–2:40 | Forecast market + resolver | “Trading here is the real Predict pm-AMM on devnet, mock USDC. Helm will not resolve until Pyth is safe and a dispute window has passed.” |
| 2:40–3:00 | Footer disclaimer | “Devnet demo, not available for real-money use.” |

### Technical video (≤ 5 min)
Walk `programs/helm/src/math.rs` (oracle checks and liquidation price), then `post_oracle` and `require_live_oracle` in `lib.rs`, then `scripts/keeper.mjs`, then the Risk console reading those fields live.

### Team
Solo — Akhilesh Patil. GitHub `akhilexx`. No teammates to invite.

### Sponsor tracks
Select “Best use of the pm-AMM by PREDICT.” Do not invent traction numbers. Do not select OrbitFlare (not a judged prize; unused).

## Browser steps to submit

1. Open https://hackathons.solana.com/hackathons/perps-and-prediction-markets
2. Sign in with Google or a Solana wallet (the page allows either).
3. Confirm the page still shows the event as open and that a **Submit** / **Submit project** control is visible. If it is disabled, the official build week may not have started; keep the package ready and submit as soon as it enables, before **5 Dec 2026**.
4. Create a project named **Helm**.
5. Paste the name, tagline, description and technical details above.
6. Add the GitHub URL (https://github.com/akhilexx/helm) and the live demo URL (https://akhilexx.github.io/helm/).
7. Upload the pitch video (≤ 3 min) and optional technical video (≤ 5 min).
8. Leave team empty (solo). Opt into the pm-AMM bounty. Paste the seeded market PDA and signature if there is a “links / extra” box.
9. Submit. Projects remain private until after judging.
10. If a prize is later awarded, the Solana Foundation contacts winners for payout (expect KYC then). No pre-submit KYC is published.

## What still has to happen after this package

| Step | Who | Notes |
|---|---|---|
| Push this repo to GitHub as `akhilexx` | Owner (GitHub login is owner-held) | Do not push `keys/`. |
| Host `app/` | Done | Live demo at https://akhilexx.github.io/helm/ (GitHub Pages from the `gh-pages` branch). The app points at program `6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd` on devnet. |
| Record and upload videos | Owner review (standing rule for demo videos) | Script is in this file and in `DEMO.md`. |
| Click Submit on the hackathon form | Browser, owner’s Google or wallet login | Package above is ready to paste. |
