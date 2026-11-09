#!/usr/bin/env bash
# Deploy helm.so to Solana devnet. Does not print key material.
set -euo pipefail
export PATH="$HOME/.cargo/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
PUB=$(solana-keygen pubkey "$ROOT/keys/deployer.json")
PROG=$(solana-keygen pubkey "$ROOT/keys/program.json")
echo "Deployer: $PUB"
echo "Program:  $PROG"
solana config set --url https://api.devnet.solana.com --keypair "$ROOT/keys/deployer.json" >/dev/null
BAL=$(solana balance | awk '{print $1}')
echo "Balance:  $BAL SOL"
need=1.1
awk "BEGIN{exit !($BAL >= $need)}" || {
  echo "Need about 1.1 SOL on devnet. Request it at https://faucet.solana.com for $PUB"
  echo "then re-run this script."
  exit 1
}
solana program deploy "$ROOT/target/deploy/helm.so" --program-id "$ROOT/keys/program.json"
echo "Deployed. Next: node scripts/init.mjs && node scripts/keeper.mjs --once"
