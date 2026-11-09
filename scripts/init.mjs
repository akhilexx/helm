#!/usr/bin/env node
import fs from "fs";
import { Connection, Keypair, Transaction, clusterApiUrl } from "@solana/web3.js";
import { initializeIx, createMarketIx, marketPda, configPda } from "./ix.mjs";

const keyPath = process.env.HELM_KEYPAIR || new URL("../keys/deployer.json", import.meta.url).pathname;
const payer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync(keyPath, "utf8"))));
const connection = new Connection(process.env.RPC_URL || clusterApiUrl("devnet"), "confirmed");

const PARAMS = {
  imBps: 1000,
  mmBps: 500,
  maxLeverageX: 10,
  maxAgeSlots: 4096,
  maxConfBps: 200,
  maxJumpBps: 500
};

const tx = new Transaction();
const existing = await connection.getAccountInfo(configPda());
if (!existing) {
  tx.add(initializeIx(payer.publicKey, payer.publicKey));
  console.log("will initialize config + vault");
} else {
  console.log("config already exists");
}
for (const symbol of ["SOL-PERP", "BTC-PERP", "XAU-PERP"]) {
  const info = await connection.getAccountInfo(marketPda(symbol));
  if (info) {
    console.log(symbol, "exists", marketPda(symbol).toBase58());
    continue;
  }
  tx.add(createMarketIx(payer.publicKey, symbol, PARAMS));
  console.log("will create", symbol, marketPda(symbol).toBase58());
}
if (tx.instructions.length === 0) {
  console.log("nothing to do");
  process.exit(0);
}
tx.feePayer = payer.publicKey;
tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
tx.sign(payer);
const sig = await connection.sendRawTransaction(tx.serialize());
console.log("signature", sig);
await connection.confirmTransaction(sig, "confirmed");
