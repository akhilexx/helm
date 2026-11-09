#!/usr/bin/env node
/**
 * Creates one Helm-encoded binary market on the live Predict pm-AMM (devnet).
 * Uses keys/deployer.json. Never prints secret bytes.
 */
const fs = require("fs");
const path = require("path");
const { Connection, Keypair, PublicKey, clusterApiUrl } = require("@solana/web3.js");
const { AnchorProvider, Wallet } = require("@anchor-lang/core");
const { PmAmmClient } = require("@pm-amm/sdk");

const PROGRAM_ID = new PublicKey("GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y");
const USDC_MINT = new PublicKey("3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ");
const SOL_ID = "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d";

async function strikeFromHermes() {
  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${SOL_ID}`);
  if (!res.ok) throw new Error(`hermes HTTP ${res.status}`);
  const body = await res.json();
  const p = body.parsed[0].price;
  const px = Number(p.price) * 10 ** p.expo;
  return { px, strike: Math.round(px) };
}

async function main() {
  const keyPath = process.env.HELM_KEYPAIR || path.join(__dirname, "../keys/deployer.json");
  const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf8"))));
  console.log("creator", payer.publicKey.toBase58());
  let strike = 150;
  try {
    const h = await strikeFromHermes();
    strike = h.strike;
    console.log("hermes SOL/USD", h.px, "strike", strike);
  } catch (e) {
    console.log("hermes unavailable, default strike", strike, e.message);
  }
  const name = `HELM SOL >= ${strike}`;
  const connection = new Connection(process.env.RPC_URL || clusterApiUrl("devnet"), "confirmed");
  const provider = new AnchorProvider(connection, new Wallet(payer), { commitment: "confirmed" });
  const client = PmAmmClient.fromProvider(provider, PROGRAM_ID, USDC_MINT);
  const result = await client.send.createMarket({
    name,
    durationSecs: 7 * 86_400,
    initialPriceBps: 5000,
    depositUsdc: 50
  });
  console.log("name", name);
  console.log("marketId", result.marketId);
  console.log("marketPda", result.marketPda);
  console.log("signature", result.signature);
}

main().catch((err) => {
  console.error(err && err.message ? err.message : err);
  process.exit(1);
});
