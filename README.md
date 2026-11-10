# Helm

Oracle-safe isolated-margin perpetual futures on Solana **devnet**.

> A perp that would rather halt than mark you on a bad print.

Helm is the Solana Perps & Prediction Markets hackathon entry for Akhilesh Patil (solo). It is a risk engine first: perpetual futures with an oracle guard, and binary forecasts that trade on the live Predict pm-AMM but refuse to resolve on a bad print.

```
                   ┌─────────────────────────────┐
                   │   Pyth Hermes (HTTP, ref)   │
                   └──────────────┬──────────────┘
                                  │ keeper.mjs
                                  ▼
┌────────────┐  post_oracle   ┌──────────────────┐
│  Keeper    │───────────────►│  Market PDA      │
│  (devnet)  │                │  mark, conf, slot│
└────────────┘                │  status, OI, IF  │
                              └─────────┬────────┘
                                        │ require_live_oracle()
          ┌───────────────┬─────────────┼──────────────┐
          ▼               ▼             ▼              ▼
     deposit()     open_or_increase  reduce()     liquidate()
          │               │             │              │
          └───────────────┴──────┬──────┴──────────────┘
                                 ▼
                         Position PDA + Vault
                         (devnet SOL collateral)
```

## What the risk engine checks

| Check | On a failing print |
|---|---|
| Price is non-zero | Reject |
| Publish slot ≤ chain clock and not older than `max_age_slots` | Reject trades; a first print may still seed the mark |
| Confidence / price ≤ `max_conf_bps` | Market flips to **reduce-only** |
| Jump vs last good mark ≤ `max_jump_bps` | Last good mark is kept; market flips to **reduce-only**; rejected price is stored |

Liquidation exists, but it calls the same live-oracle check. Helm will not liquidate on a stale or jumped mark.

Default demo parameters (set in `scripts/init.mjs`): 10% initial margin, 5% maintenance, 10× cap, 4096-slot max age, 2% max confidence, 5% max jump.

## Markets

- `SOL-PERP` — SOL / USD
- `BTC-PERP` — BTC / USD
- `XAU-PERP` — gold / USD, continuing the Afterglow / Gold Curve / XAUConnect narrative without importing those codebases

## Repo layout

| Path | What it is |
|---|---|
| `programs/helm` | On-chain program (`solana-program` 1.18). Instruction discriminators match Anchor’s `sha256("global:<name>")[..8]` so the TypeScript client stays conventional. |
| `crates/helm-math` | Pure Rust PnL / margin / oracle / liquidation-price math |
| `app/` | Next.js + Tailwind UI (dark / light, responsive) — perps, forecast, positions |
| `scripts/` | `deploy.sh`, `init.mjs`, `keeper.mjs` |
| `research.md` | Hackathon rules, India legal note, idea pick |
| `submission.md` | Form answers, video script, browser steps |
| `DEMO.md` | Click-through demo script |

Declared program id: `6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd`.

## Tests (measured)

```bash
cargo test -p helm-math
# 29 passed; 0 failed  (10 Nov 2026, Asia/Calcutta) — 15 perps + 14 forecast resolver

node --test crates/helm-math-js/math.test.mjs
# 6 passed; 0 failed
```

The on-chain crate is built with `cargo-build-sbf` (Solana CLI 2.1.21, platform-tools rustc 1.79). Current Anchor crates on crates.io pull `edition2024` dependencies that this BPF toolchain cannot parse, so the program is written as a native Solana program with the same account layouts and discriminators an Anchor client expects. That is a toolchain constraint, not a feature claim.

```bash
cargo-build-sbf --manifest-path programs/helm/Cargo.toml
# produces target/deploy/helm.so (134,936 bytes on 10 Nov 2026)
```

## Deploy (devnet)

Live as of 10 Nov 2026, 12:23 IST. Full record: [`deployed-devnet.txt`](deployed-devnet.txt).

| | |
|---|---|
| Program | [`6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd`](https://solscan.io/account/6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd?cluster=devnet) |
| Executable | true (BPF upgradeable loader) |
| Deploy tx | `H9SzM5nhajy1cZvf1cdwFHqdT1hcUEHZXdFqxwQfnMqn2KJ1TNRdcB2Bsug5FRr4p3UD2DjCZqa4mJA8L36Vp6P` |
| Init tx | `5KewZeR4UJFQQCe35nTgXnpzEBU46x9QbHNrx7MHYhQA4wM7WQGhti5oeta8xYUtfWoYbr3kPiCe8idf8TbZ6jmd` |
| SOL-PERP | [`HsN1VKHYG5kw8JCxqc7MroYgmCAMbwHEMMoH1Tm2gNUx`](https://solscan.io/account/HsN1VKHYG5kw8JCxqc7MroYgmCAMbwHEMMoH1Tm2gNUx?cluster=devnet) |
| BTC-PERP | [`HVu6tg3gNEiztaAJeaNfhZWpYX9w6eu57xC2QVinSPmi`](https://solscan.io/account/HVu6tg3gNEiztaAJeaNfhZWpYX9w6eu57xC2QVinSPmi?cluster=devnet) |
| XAU-PERP | [`84nbrVPxDx3ZLYYsdqzu3GncLFy4HXzfiJFv3G19mEVS`](https://solscan.io/account/84nbrVPxDx3ZLYYsdqzu3GncLFy4HXzfiJFv3G19mEVS?cluster=devnet) |
| Deployer remaining | 4.57050284 SOL (was 5.26461784 SOL before deploy) |

`scripts/keeper.mjs --once` did **not** post a stamp: Pyth Hermes returned HTTP 401 (`unauthorized`), including with a browser User-Agent. On-chain `mark_price` fields are still 0. No price was invented. Re-run the keeper when Hermes accepts this host:

```bash
node scripts/keeper.mjs --once
```

Keys live in `keys/` (mode 600, gitignored). Do not commit them.

## Web app

```bash
cd app && npm install && npm run dev
```

The UI reads accounts from `https://api.devnet.solana.com` against program `6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd`. Markets are initialised; marks stay `—` / 0 until a keeper stamp lands. The app does not invent prices. A Pyth Hermes number, when the API allows it, is shown as an off-chain reference next to the on-chain mark.

Frontend hosting: no login-free static host was used. Deploy the `app/` directory to Render (vault login `Render`) with build `npm install && npm run build` and start `npm start`, working directory `app`.

## Forecast (prediction markets)

Trading is **not** a homemade AMM. Forecast calls the live Predict pm-AMM on Solana devnet (`GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y`, mock USDC `3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ`) via `@pm-amm/sdk`. Helm supplies the resolver Predict’s docs say they do not have yet:

1. Market names encode the rule (`HELM SOL >= 150`).
2. After expiry, Pyth Hermes is checked for freshness, confidence and jumps (same ethic as the perps engine).
3. A safe print proposes YES or NO and opens a dispute window (default 1 hour).
4. A later safe print that disagrees discards the proposal.
5. Helm calls `resolveMarket` only after an uncontested window. A persistently unsafe oracle is halted, then treated as void rather than guessed.

A seeded devnet market (10 Nov 2026 IST): name `HELM SOL >= 150`, market id `71859704526502`, PDA `HRjM8df1dFoi41XqqMZ8SibyQSs4gCDmHaQV6w47m1C4`, signature `5zap6FgEYwKjrB4RuqxqgUzgg3C93uG6f7SY6X8WMcTAxeQxtRvencLwzaUexyCq2fDpGkWADkLSunufgajEyuUE`. Hermes returned HTTP 401 at seed time, so the strike defaulted to 150 (logged by the script). Details: `scripts/seeded-forecast.txt`.

```bash
# create another Helm-encoded market (needs deployer key + mUSDC)
node scripts/seed-forecast.cjs
```

UI routes: `/forecast`, `/forecast/new`, `/forecast/[pda]`, `/positions`.

## What this is not

A developer demonstration on Solana devnet, not available for real-money use. Forecast trades mock USDC only. The app is not wired to mainnet USDC. Devnet SOL for perps.

## License

MIT
