#!/usr/bin/env node
/**
 * Posts real Pyth prices onto Helm market PDAs.
 *
 * Source order:
 *   1. Hermes HTTP, only if PYTH_API_KEY is already set (Bearer). Since
 *      26 Aug 2026 Hermes requires a Pyth Terminal key
 *      (https://docs.pyth.network/pro/how-to-guides/create-an-api-key,
 *      signup https://app.pyth.com/signup). This script never signs up
 *      and never invents a key or a price.
 *   2. Documented Hermes hosts without a key (expected 401 after the
 *      upgrade) — tried so a later public endpoint would just work.
 *   3. On-chain Pyth Core / Pyth Core Compatible shard-0 price-feed
 *      accounts (sponsored push oracles). Reading those accounts needs
 *      no API key. Same-cluster (devnet) accounts are preferred so the
 *      PriceUpdateV2 posted_slot is a valid slot on the Helm cluster.
 *
 * Helm's post_oracle field is publish_slot (compared to Clock::slot),
 * not Unix time. We stamp the Pyth account's posted_slot when it was
 * read on the same cluster; otherwise the current Helm-cluster slot.
 * The real Pyth publish_time is always logged.
 *
 * Reads the deployer keypair from HELM_KEYPAIR (default ./keys/deployer.json).
 * Never logs secret bytes.
 */
import fs from "fs";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  clusterApiUrl
} from "@solana/web3.js";
import { postOracleIx } from "./ix.mjs";

const MARKETS = [
  { symbol: "SOL-PERP", id: "ef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d" },
  { symbol: "BTC-PERP", id: "e62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43" },
  { symbol: "XAU-PERP", id: "765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2" }
];

const PUSH_ORACLES = [
  { name: "pyth-core-compatible", program: "pyt2F414BA6dPttK6RddPZUdHfapoBN24GL5wbrPCou" },
  { name: "pyth-core", program: "pythWSnswVUd12oZpeFP8e9CVaEqJg25g1Vtc2biRsT" }
];

const HERMES_HOSTS = [
  process.env.HERMES_URL,
  "https://hermes.pyth.network",
  "https://pyth.dourolabs.app/hermes"
].filter(Boolean);

const keyPath = process.env.HELM_KEYPAIR || new URL("../keys/deployer.json", import.meta.url).pathname;
const secret = JSON.parse(fs.readFileSync(keyPath, "utf8"));
const payer = Keypair.fromSecretKey(Uint8Array.from(secret));
const rpcUrl = process.env.RPC_URL || clusterApiUrl("devnet");
const connection = new Connection(rpcUrl, "confirmed");
const pythRpcUrl = process.env.PYTH_RPC_URL || rpcUrl;
const pythConnection = pythRpcUrl === rpcUrl ? connection : new Connection(pythRpcUrl, "confirmed");
const sameCluster = pythRpcUrl === rpcUrl;

function feedAccount(programId, shard, hex) {
  const shardBuf = Buffer.alloc(2);
  shardBuf.writeUInt16LE(shard);
  return PublicKey.findProgramAddressSync(
    [shardBuf, Buffer.from(hex, "hex")],
    new PublicKey(programId)
  )[0];
}

function toScale1e6(raw, exponent) {
  const n = Number(raw) * 10 ** (Number(exponent) + 6);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n);
}

function parsePriceUpdateV2(data, hex) {
  const buf = Buffer.from(data);
  const needle = Buffer.from(hex, "hex");
  const idx = buf.indexOf(needle);
  if (idx < 0) return null;
  const o = idx + 32;
  if (buf.length < o + 52) return null;
  const price = buf.readBigInt64LE(o);
  const conf = buf.readBigUInt64LE(o + 8);
  const exponent = buf.readInt32LE(o + 16);
  const publishTime = buf.readBigInt64LE(o + 20);
  let postedSlot = null;
  if (buf.length >= o + 60) postedSlot = buf.readBigUInt64LE(o + 52);
  if (price <= 0n) return null;
  return {
    price,
    conf,
    exponent,
    publishTime: Number(publishTime),
    postedSlot: postedSlot === null ? null : Number(postedSlot)
  };
}

async function tryHermes() {
  const key = process.env.PYTH_API_KEY;
  const headers = { Accept: "application/json" };
  if (key) headers.Authorization = `Bearer ${key}`;
  else {
    console.log(
      "Hermes: no PYTH_API_KEY in the environment. Since 26 Aug 2026 Hermes requires a Pyth API key (Authorization: Bearer). Free keys are issued after signup at https://app.pyth.com/signup — not signing up from this host. Falling through to documented hosts, then on-chain Pyth accounts."
    );
  }
  const qs = MARKETS.map((m) => `ids[]=0x${m.id}`).join("&");
  for (const base of HERMES_HOSTS) {
    const url = `${base.replace(/\/$/, "")}/v2/updates/price/latest?${qs}`;
    try {
      const res = await fetch(url, { headers });
      if (!res.ok) {
        console.log(`Hermes ${base} HTTP ${res.status}`);
        continue;
      }
      const body = await res.json();
      const parsed = body.parsed || [];
      const out = [];
      for (const m of MARKETS) {
        const row = parsed.find((p) => p.id === m.id || p.id === `0x${m.id}` || `0x${p.id}` === `0x${m.id}`);
        if (!row?.price) {
          console.log(`Hermes ${base}: no row for ${m.symbol}`);
          continue;
        }
        const px = toScale1e6(row.price.price, row.price.expo);
        const conf = toScale1e6(row.price.conf, row.price.expo);
        const publishTime = Number(row.price.publish_time);
        if (!(px > 0)) {
          console.log(`Hermes ${base}: non-positive price for ${m.symbol}, skipping`);
          continue;
        }
        out.push({
          symbol: m.symbol,
          px,
          conf: Math.max(1, conf),
          publishTime,
          source: `hermes ${base}`
        });
      }
      if (out.length) return out;
    } catch (e) {
      console.log(`Hermes ${base} error: ${e.message}`);
    }
  }
  return null;
}

async function readOnChainFeed(conn, label, market) {
  for (const oracle of PUSH_ORACLES) {
    const key = feedAccount(oracle.program, 0, market.id);
    let acc;
    try {
      acc = await conn.getAccountInfo(key);
    } catch (e) {
      console.log(`${market.symbol} ${label} ${oracle.name} ${key.toBase58()} RPC error: ${e.message}`);
      continue;
    }
    if (!acc) {
      console.log(`${market.symbol} ${label} ${oracle.name} ${key.toBase58()} missing`);
      continue;
    }
    const parsed = parsePriceUpdateV2(acc.data, market.id);
    if (!parsed) {
      console.log(`${market.symbol} ${label} ${oracle.name} ${key.toBase58()} unparseable (${acc.data.length} bytes)`);
      continue;
    }
    const px = toScale1e6(parsed.price, parsed.exponent);
    const conf = toScale1e6(parsed.conf, parsed.exponent);
    if (!(px > 0)) {
      console.log(`${market.symbol} ${label} ${oracle.name}: non-positive scaled price, skipping`);
      continue;
    }
    return {
      symbol: market.symbol,
      px,
      conf: Math.max(1, conf),
      publishTime: parsed.publishTime,
      postedSlot: parsed.postedSlot,
      source: `${label} ${oracle.name} shard-0 ${key.toBase58()}`,
      account: key.toBase58()
    };
  }
  return null;
}

async function readOnChainPrices() {
  const out = [];
  for (const m of MARKETS) {
    let quote = await readOnChainFeed(pythConnection, sameCluster ? "helm-cluster" : "pyth-rpc", m);
    if (!quote && !sameCluster) {
      quote = await readOnChainFeed(connection, "helm-cluster-fallback", m);
    }
    // Last resort: official mainnet sponsored feeds (same program IDs,
    // same PDAs). Price/conf/publish_time are real; the stamp slot must
    // be the Helm cluster's current slot because mainnet posted_slot is
    // not comparable to devnet Clock::slot.
    if (!quote) {
      const mainnet = new Connection("https://api.mainnet-beta.solana.com", "confirmed");
      quote = await readOnChainFeed(mainnet, "mainnet", m);
      if (quote) quote.fromForeignCluster = true;
    }
    if (!quote) {
      console.log(`${m.symbol}: no on-chain Pyth price feed account found; leaving unpriced`);
      continue;
    }
    out.push(quote);
  }
  return out;
}

async function tick() {
  const slot = await connection.getSlot("confirmed");
  let quotes = await tryHermes();
  if (quotes) {
    for (const q of quotes) q.publishSlot = slot;
  } else {
    quotes = await readOnChainPrices();
    for (const q of quotes) {
      const canUsePosted =
        !q.fromForeignCluster &&
        Number.isFinite(q.postedSlot) &&
        q.postedSlot > 0 &&
        q.postedSlot <= slot;
      q.publishSlot = canUsePosted ? q.postedSlot : slot;
    }
  }

  const tx = new Transaction();
  for (const q of quotes) {
    tx.add(postOracleIx(payer.publicKey, q.symbol, q.px, q.conf, q.publishSlot));
    const when = Number.isFinite(q.publishTime)
      ? new Date(q.publishTime * 1000).toISOString()
      : "unknown";
    console.log(
      `${q.symbol} px ${q.px} conf ${q.conf} publish_time ${q.publishTime} (${when} UTC) ` +
        `posted_slot ${q.postedSlot ?? "n/a"} stamp_slot ${q.publishSlot} source ${q.source}`
    );
  }
  if (tx.instructions.length === 0) {
    console.log("no real quotes to post; not sending a transaction");
    return null;
  }
  tx.feePayer = payer.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash()).blockhash;
  tx.sign(payer);
  const sig = await connection.sendRawTransaction(tx.serialize());
  const conf = await connection.confirmTransaction(sig, "confirmed");
  if (conf.value.err) {
    console.error("posted but failed", sig, JSON.stringify(conf.value.err));
    throw new Error(`keeper tx failed: ${sig}`);
  }
  console.log("posted", sig);
  return sig;
}

const once = process.argv.includes("--once");
await tick();
if (!once) {
  setInterval(() => tick().catch((e) => console.error(e.message)), 15_000);
}
