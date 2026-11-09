# Helm

Oracle-safe isolated-margin perpetual futures on Solana **devnet**.

> A perp that would rather halt than mark you on a bad print.

Helm is the Solana Perps & Prediction Markets hackathon entry for Akhilesh Patil (solo). It is a risk engine first and a trading venue second. It is **not** a prediction market.

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
| `app/` | Next.js + Tailwind UI (dark / light, responsive) |
| `scripts/` | `deploy.sh`, `init.mjs`, `keeper.mjs` |
| `research.md` | Hackathon rules, India legal note, idea pick |
| `submission.md` | Form answers, video script, browser steps |
| `DEMO.md` | Click-through demo script |

Declared program id: `6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd`.

## Tests (measured)

```bash
cargo test -p helm-math
# 15 passed; 0 failed  (10 Nov 2026, Asia/Calcutta)

node --test crates/helm-math-js/math.test.mjs
```

The on-chain crate is built with `cargo-build-sbf` (Solana CLI 2.1.21, platform-tools rustc 1.79). Current Anchor crates on crates.io pull `edition2024` dependencies that this BPF toolchain cannot parse, so the program is written as a native Solana program with the same account layouts and discriminators an Anchor client expects. That is a toolchain constraint, not a feature claim.

```bash
cargo-build-sbf --manifest-path programs/helm/Cargo.toml
# produces target/deploy/helm.so (134,936 bytes on 10 Nov 2026)
```

## Deploy (devnet)

1. Request ~1.1 SOL to the deployer at [faucet.solana.com](https://faucet.solana.com) (the public RPC faucet returns HTTP 410 as of 10 Nov 2026).
2. `./scripts/deploy.sh`
3. `node scripts/init.mjs`
4. `node scripts/keeper.mjs --once` (or leave it running)

Keys live in `keys/` (mode 600, gitignored). Do not commit them.

## Web app

```bash
cd app && npm install && npm run dev
```

The UI reads accounts from `https://api.devnet.solana.com`. Empty marks mean the program is not initialised yet — the app does not invent prices. A Pyth Hermes number is shown as an off-chain reference next to the on-chain mark.

Frontend hosting: no login-free static host was used. Deploy the `app/` directory to Render (vault login `Render`) with build `npm install && npm run build` and start `npm start`, working directory `app`.

## What this is not

Not a prediction market, not a pm-AMM integration, not a mainnet venue, not an offer of real-money derivatives to persons in India. Devnet SOL only.

## License

MIT
