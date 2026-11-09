# Solana Perps & Prediction Markets — research and idea pick

Captured: 10 Nov 2026, Asia/Calcutta (IST).  
Entrant: Akhilesh Patil, solo, India. GitHub `akhilexx`.  
Official page: https://hackathons.solana.com/hackathons/perps-and-prediction-markets  
How it works: https://hackathons.solana.com/how-it-works

## 1. What the page actually says

| Fact | Source |
|---|---|
| Title / tagline | “Perps and Prediction Markets” — “The market never closes. $100K in prizes. One week to build perpetuals and prediction markets on Solana.” |
| Prize pool | $101,000 listed as “$100,000 main track + $1,000 bounties” |
| Main track | Awarded by the Solana Foundation, judged across every submission. 1st $50,000 / 2nd $30,000 / 3rd $20,000 |
| Sponsor bounty 1 | “Best use of the pm-AMM by PREDICT” (Spark) — $1,000. If awarded, it is a **$1,000 investment** (not a grant), plus Spark support to raise up to $25,000 on Backable. Funded by the $PREDICT treasury via futarchy proposal #002. |
| Sponsor bounty 2 | OrbitFlare “Free RPC for All Hackathon Participants” — not a judged prize. Developer plan ($49/mo) free for **one week from the start of the hackathon**. Claim: sign up at orbitflare.com once the hackathon starts, open a Discord support ticket. |
| Registered / submissions (fetched 10 Nov 2026 IST) | 582 registered, **0 submissions** |
| Deadline | **5 Dec 2026**. The page rendered “Dec 5, 2026 in 26 days” on 10 Nov 2026. |
| Build-window wording conflict | The event page says “One week to build”. The platform how-it-works page says builders have **14 days from launch** to the submission deadline. OrbitFlare’s free RPC is explicitly “one week from the start”. Homepage listed the event both as the featured live hackathon and again under “Scheduled hackathons” on the same fetch. Treat **5 Dec 2026** as the hard close; treat “one week” vs “14 days” as platform copy that does not override that date. |
| Submission window | The page already exposes a submissions counter (0). How-it-works: submit before the deadline; late submissions are not accepted. Materials listed as optional: GitHub repo, live demo (devnet or mainnet), pitch video (3 min max), technical video (5 min), team members, up to 3 sponsor tracks. Projects stay **private until after judging**. |
| Who can enter | “For everyone.” Builders register with a **wallet or Google**. Solo is allowed (team members are optional). No published country ban. |
| KYC / payout | Main-track winners are “contacted by Solana Foundation for prize payout.” Sponsor bounties pay from on-chain USDC escrow to the winning wallet. The page does not publish a pre-submission KYC step. Expect Foundation KYC at payout, which is normal for their hackathons — not documented as a barrier to an Indian solo builder submitting. |
| Judging | Two tracks at once. **Main track:** Solana Foundation–selected judges review **all** submissions and score **1 to 10**. **Sponsor tracks:** the sponsor picks the winner among entries that opted into that bounty. |
| Main-track written rubric | **Not published** on the event page or the how-it-works page. Only the numeric 1–10 score is stated. The only detailed written rubric on the event is Spark’s pm-AMM bounty (below). |

### Spark pm-AMM bounty rubric (not the main track)

Eligibility: the pm-AMM must be a **core** part of the product (not a mock or side feature); working code; public repo; short demo.

Judging weights they published:

1. **Traction (biggest weight)** — real on-chain users, trades, volume, fees on the pm-AMM. Not plans.
2. Why the pm-AMM (technical understanding vs order book / LMSR / constant-product / parimutuel).
3. Narrative.
4. Depth of integration.
5. Product today (end-to-end, not perfect).
6. Standalone potential after the hackathon.

If no submission meets the bar, they award nobody.

Links they published: https://predict-pm-amm.dev · X @Predict_PM_AMM · Telegram t.me/sparkdotfun/4496 · https://justspark.fun

**Decision:** do **not** chase this $1,000 bounty. It is an investment, not cash; its heaviest criterion is live traction we will not have; and it requires a real-money-shaped prediction-market integration, which is the legal problem below.

## 2. India legal issue — prediction markets

This is a real constraint, not a vibe.

- The **Promotion and Regulation of Online Gaming Act, 2025** prohibits offering, aiding, advertising, or facilitating payments for an “online money game” / “online money gaming service” in India (including services operated from outside India). Penalties in the Act include imprisonment and large fines (section 9: offering the service — up to three years and/or up to one crore rupees; advertising — up to two years and/or fifty lakh; payment facilitation — up to three years and/or one crore).
- MeitY notified the Promotion and Regulation of Online Gaming Rules, 2026 on 22 Apr 2026; they took effect **1 May 2026**.
- Indian commentary and reporting in 2026 treat **opinion trading / prediction markets** (pay money to win money on an outcome) as inside that ban. Domestic apps such as Probo shut real-money books. MeitY moved to block foreign platforms including Polymarket; Kalshi added India to its restricted-jurisdiction list (member agreement dated 17 Jun 2026, per Mint/Bloomberg reporting).
- Building, demoing, or pitching a product that lets Indian users stake value on event outcomes is therefore the wrong shape for this entrant.

**What we will not build:** any prediction-market venue, outcome-token AMM, Polymarket clone, or pm-AMM integration that takes or simulates real-money event bets for users in India.

**What we will build instead:** a **perpetuals risk engine and oracle-safe settlement venue on Solana devnet**, framed as trading infrastructure / hedging tooling (including an XAU-PERP gold hedge market that continues the Afterglow / Gold Curve / XAUConnect line). The demo uses **devnet SOL** only. The UI states that this is a developer demonstration, not an offer of a real-money venue to persons in India.

Crypto perpetual futures offered as a production, real-money service to Indian residents would still sit in a restricted / grey area under existing FIA/SEBI/RBI treatment of crypto derivatives. That is why this entry stays on **devnet**, does not solicit mainnet deposits, and does not claim to be a licensed exchange.

## 3. Winner patterns (closest comparable: Stocklana, completed Oct 2026)

Same self-serve platform (hackathons.solana.com). Stocklana: 1,182 registered, **604 submissions**, main track paid by the Foundation.

| Place | Project | Why it reads as a winner |
|---|---|---|
| 1st — $35,000 | **Roster Finance** | Inverted the obvious trade. “Stock leverage **without** margin liquidation.” Fully collateralized options, loss capped at premium, **oracle-free settlement**, live on 14 markets including PreStocks. Novel risk design + working product, not another spot DEX. |
| 2nd — $20,000 | **Draw** | One crisp job: spend tokenized shares without selling them. A payment button that deposits into Kamino, borrows USDC, pays the merchant. Concrete UX on existing rails. |
| 3rd (several $15,000) | **Neo**, **CRESCO**, **Xorr Finance** | Complete consumer products or tightly scoped permissioned agents. Explainable rules, live mainnet where they claimed it. |

Pattern, translated to this theme:

- Do **not** ship the 400th Drift/Jupiter-perps UI clone or the 400th Polymarket clone.
- Win with a **risk-architecture idea** that a Foundation judge can repeat in one sentence, plus an end-to-end demo that actually runs.
- Prefer “this venue refuses to do the unsafe thing” over “this venue has more leverage.”
- Optional sponsor bounties are a side quest; the $100k is the main track.

Roster’s winning line was essentially *leverage without reckless liquidation*. The analogous line for perps is: *a perpetual that would rather halt than settle or liquidate on a bad oracle print*.

## 4. Assets we can reuse (without pretending they are this product)

| Asset | What it actually is | What transfers |
|---|---|---|
| Afterglow Kit (`akhilexx/afterglow-kit`, local copy under `forge/afterglow-kit`) | TypeScript library on `@solana/kit` for reading Solana data correctly after Alpenglow: multi-RPC quorum merge, certificate bitmap decode, conformance checks AG-01–AG-09. Prototype, MIT, not a trading venue. | The **multi-provider / refuse-to-guess** ethic. Helm’s on-chain oracle guard is the trading analogue of Afterglow’s “no value if the quorum fails.” Visual language (deep navy, gold warning, clear “verified vs not” honesty) informs the UI. We do **not** import Afterglow Kit into the program runtime (it is an off-chain reader). |
| Afterglow Guard (name used in the earning playbook / kit narrative) | Tooling posture: guard rails around bad data. | Product name lineage: this entry is **Helm** (the control surface), with the subtitle “Afterglow Guard for perpetual markets.” |
| XAUConnect / Gold Curve | NEAR/Solana gold-routing and curve work already pitched to Solana grants and the NEAR hackathon. | **XAU-PERP** as a first-class market. Narrative: gold hedging infrastructure, not event betting. We do not claim XAUConnect’s code is this program. |

## 5. Ideas considered

1. **Prediction market on pm-AMM** — rejected. India legal risk + $1k investment bounty judged on traction we will not have + crowded field.
2. **Generic isolated-margin perps DEX** (order book or vAMM, leverage slider, funding) — rejected as the default 582-registrant build. No sentence a judge remembers.
3. **Liquidation-protection vault that sits in front of someone else’s perps** — strong conceptually, but a hackathon CPI into Drift/Jupiter on devnet is brittle (account layouts, remaining accounts, no guarantee those programs match docs on devnet) and judges cannot replay it reliably.
4. **Chosen: Helm — an oracle-safe isolated-margin perps venue whose risk engine is the product.** A small, complete on-chain market (SOL-PERP, BTC-PERP, XAU-PERP) where every open, increase, withdraw and liquidation is gated by oracle age, confidence width, and jump-circuit rules. When the circuit trips, the market goes reduce-only / halt rather than marking traders on a poisoned print. Liquidation exists, but it is itself oracle-gated. Collateral is devnet SOL. A keeper stamps Pyth Hermes prices on-chain so the venue has a real, inspectable price tape.

### Why Helm is the highest-win-probability pick

- Fits the official theme (“perpetuals”) without touching banned prediction-market shape.
- Copies the Stocklana-winning pattern: **novel risk rule, one sentence, working demo**.
- Differentiates against clones: the judge-facing sentence is “Helm would rather halt than liquidate you on a stale or jumped oracle.”
- Reuses the Afterglow honesty ethic and the XAU/gold story without overclaiming.
- Buildable as a real Anchor program + Next.js app + tests inside this window, deployable to **devnet** (no user GitHub login required for the program deploy).
- Does not depend on Spark traction, OrbitFlare signup, or mainnet deposits.

Honest limit: 582 people are registered and the comparable Stocklana event converted ~51% of registrants into submissions (604 / 1,182). A similar conversion here would be on the order of ~300 entries. A polished solo infrastructure entry is competitive for attention, not a probable top-3. We are optimizing for *being in the set of projects a judge can explain*, not for pretending the $50k is likely.

## 6. Product specification (what we will ship)

**Name:** Helm  
**One-liner:** Oracle-safe perpetual futures on Solana — a risk engine that refuses to mark, trade, or liquidate on a bad print.  
**Network:** Solana devnet only for this hackathon.  
**Markets:** SOL-PERP, BTC-PERP, XAU-PERP.  
**Collateral:** native devnet SOL in a program vault.  
**Oracle path:** keeper reads Pyth Hermes (public HTTP), posts price / confidence / publish time; on-chain checks monotonic slot, max age, max confidence, and jump vs last print.  
**Risk:** isolated margin, initial and maintenance margin BPS, max leverage, liquidation when equity < maintenance, insurance fund, circuit breaker with reduce-only.  
**Frontend:** Next.js + Tailwind, dark/light, responsive, wallet adapter, live account reads from devnet.  
**Out of scope:** prediction markets, mainnet, real-money onboarding of Indian users, claimed TVL or volume we did not generate.

## 7. Eligibility recap for this entrant

| Question | Answer |
|---|---|
| India resident | Allowed by published rules (“for everyone”). |
| Solo | Allowed (team invite is optional). |
| KYC | Not listed as a submit-time requirement; expect it if a prize is won. |
| Public repo | Optional on the form, but expected by judges and required for the Spark bounty (which we are not targeting). Repo will be prepared locally; the user pushes to GitHub himself. |
| Demo | Optional but decisive. Program on devnet + web app. |
| Videos | Optional; pitch ≤ 3 min, technical ≤ 5 min. Script prepared in `submission.md`. |
