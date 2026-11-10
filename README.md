# Helm

Oracle-safe isolated-margin perpetual futures on Solana **devnet**.

> A perp that would rather halt than mark you on a bad print.

Helm is the Solana Perps & Prediction Markets hackathon entry for Akhilesh Patil (solo). It is a risk engine first: perpetual futures with an oracle guard, and binary forecasts that trade on the live Predict pm-AMM but refuse to resolve on a bad print.

```
                   ┌─────────────────────────────┐
                   │ Pyth Core shard-0 (on-chain)│
                   │ Hermes HTTP if PYTH_API_KEY │
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
| Upgrade tx | `27Zcbvzm1fSGdU5AxBNeFHYLryoAfPXCabv8Vv9ZEsyfPyngxdgrcZXyrPpgcToV4FZHVSmg1hhtsuq9PPxEKrRv` |
| Keeper tx | `3yN3vPM3Fxipifx6yi1gQPHUL29d3J5VUNxc8wNKY3Wsg9FexFSm1nMfUfDNVhbiv5R7J2PdFBJrWtZQ3Y2TJnEM` |
| Deployer remaining | 4.56981784 SOL (was 5.26461784 SOL before deploy) |

`scripts/keeper.mjs --once` posted a real stamp on 10 Nov 2026, 12:28 IST (Asia/Calcutta). Hermes (`hermes.pyth.network` and `pyth.dourolabs.app/hermes`) returned HTTP 401: since 26 Aug 2026 Hermes requires a Pyth API key from [Pyth Terminal signup](https://app.pyth.com/signup) (not created from this host). The keeper then read sponsored Pyth Core Compatible shard-0 price-feed accounts on Solana **devnet** (no API key) and posted price, confidence and the feed account’s `posted_slot`.

Keeper tx: `3yN3vPM3Fxipifx6yi1gQPHUL29d3J5VUNxc8wNKY3Wsg9FexFSm1nMfUfDNVhbiv5R7J2PdFBJrWtZQ3Y2TJnEM`

| Market | mark (1e6) | USD | conf (1e6) | Pyth publish time (IST) | stamp slot | source account |
|---|---:|---:|---:|---|---:|---|
| SOL-PERP | 85964823 | 85.964823 | 40795 | 10 Nov 2026, 12:28:10 IST | 520660235 | `7AviUf9nL62mcxNbQGKm4nKDQnPjswo6c5MX4D57HmyE` |
| BTC-PERP | 74567899580 | 74567.89958 | 92350623 | 10 Nov 2026, 12:24:52 IST | 520659396 | `APgzQGGdv2qCgBkX6aHVkrGePtBVDDg68GiqaM7rmtf5` |
| XAU-PERP | 4121287000 | 4121.287 | 143000 | 10 Nov 2026, 12:24:52 IST | 520659408 | `csXV1aFF7uAfTHYWx6dDj718hnf7dUDU8v54dubib17` |

All three marks are non-zero and the markets stayed `ACTIVE` (status 0). No price was invented.

A program upgrade (`27Zcbvzm1fSGdU5AxBNeFHYLryoAfPXCabv8Vv9ZEsyfPyngxdgrcZXyrPpgcToV4FZHVSmg1hhtsuq9PPxEKrRv`) was required first: `unpack` used Borsh `try_from_slice` on Market accounts allocated at 168 bytes, so leftover padding rejected `post_oracle` with `InvalidAccountData`. `unpack` now uses `deserialize` and ignores padding.

```bash
node scripts/keeper.mjs --once
```

Optional: export `PYTH_API_KEY` if you already have a Hermes key. The script will not sign up for one.

Keys live in `keys/` (mode 600, gitignored). Do not commit them.

## Web app

```bash
cd app && npm install && npm run dev
```

The UI reads accounts from `https://api.devnet.solana.com` against program `6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd`. On-chain marks are the keeper stamps above (non-zero as of 10 Nov 2026, 12:28 IST). The app does not invent prices. A Pyth Hermes number, when a key is present, is shown as an off-chain reference next to the on-chain mark.

Live demo: https://akhilexx.github.io/helm/ (GitHub Pages static export of `app/`, base path `/helm`).

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
