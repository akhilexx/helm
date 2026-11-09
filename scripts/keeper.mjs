#!/usr/bin/env node
/**
 * Posts Pyth Hermes prices on-chain. Reads the deployer keypair from
 * HELM_KEYPAIR (default ./keys/deployer.json). Never logs secret bytes.
 */
import fs from "fs";
import {
  Connection,
  Keypair,
  Transaction,
  clusterApiUrl
} from "@solana/web3.js";
import { postOracleIx } from "./ix.mjs";

const MARKETS = [
  { symbol: "SOL-PERP", id: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" },
  { symbol: "BTC-PERP", id: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { symbol: "XAU-PERP", id: "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2" }
];

const keyPath = process.env.HELM_KEYPAIR || new URL("../keys/deployer.json", import.meta.url).pathname;
const secret = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
const connection = new Connection(process.env.RPC_URL || clusterApiUrl("devnet"), "confirmed");

async function tick() {
  const slot = await connection.getSlot();
  const ids = MARKETS.map((m) => `ids[]=${m.id}`).join("&");
  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?${ids}`);
  if (!res.ok) throw new Error(`Hermes HTTP ${res.status}`);
  const body = await res.json();
  const parsed = body.parsed || [];
  const tx = new Transaction();
  for (const m of MARKETS) {
    const row = parsed.find((p) => `0x${p.id}` === m.id || p.id === m.id.slice(2));
    if (!row) {
      console.log(`no Hermes row for ${m.symbol}`);
      continue;
    }
    const raw = BigInt(row.price.price);
    const expo = Number(row.price.expo);
    // Convert to 1e6 fixed-point.
    const scale = 10n ** BigInt(6 - Math.abs(expo));
    const price = expo < 0 ? raw * scale / (10n ** BigInt(Math.max(0, -expo - 6) === 0 ? 0 : 0)) : raw * (10n ** BigInt(expo + 6));
    // Safer conversion via number for demo bounds (these assets fit).
    const px = Math.round(Number(row.price.price) * 10 ** (row.price.expo + 6));
    const conf = Math.round(Number(row.price.conf) * 10 ** (row.price.expo + 6));
    if (!(px > 0)) continue;
    tx.add(postOracleIx(payer.publicKey, m.symbol, px, Math.max(1, conf), slot));
    console.log(m.symbol, "px", px, "conf", conf, "slot", slot);
  }
  if (tx.instructions.length === 0) return;
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  const sig = await connection.sendRawTransaction(tx.serialize());
  console.log("posted", sig);
}

const once = process.argv.includes("--once");
await tick();
if (!once) {
  setInterval(() => tick().catch((e) => console.error(e.message)), 15_000);
}
