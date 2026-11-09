import { Buffer } from "buffer";
import {
  Connection,
  PublicKey
} from "@solana/web3.js";
import { PROGRAM_ID, MARKETS, type MarketMeta } from "./constants";

const encoder = new TextEncoder();

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("config")], PROGRAM_ID)[0];
}

export function vaultPda(): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("vault")], PROGRAM_ID)[0];
}

export function marketPda(symbol: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("market"), encoder.encode(symbol)],
    PROGRAM_ID
  )[0];
}

export function positionPda(market: PublicKey, owner: PublicKey): PublicKey {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("position"), market.toBuffer(), owner.toBuffer()],
    PROGRAM_ID
  )[0];
}

export type MarketAccount = {
  symbol: string;
  status: number;
  imBps: number;
  mmBps: number;
  maxLeverageX: number;
  maxAgeSlots: bigint;
  maxConfBps: number;
  maxJumpBps: number;
  markPrice: bigint;
  markConf: bigint;
  markSlot: bigint;
  lastRejectedPrice: bigint;
  openInterestLong: bigint;
  openInterestShort: bigint;
  insuranceLamports: bigint;
  pubkey: PublicKey;
};

export type PositionAccount = {
  owner: PublicKey;
  market: PublicKey;
  side: number;
  size: bigint;
  entryPrice: bigint;
  collateral: bigint;
  pubkey: PublicKey;
};

function readU64(buf: Buffer, off: number): bigint {
  return buf.readBigUInt64LE(off);
}
function readU16(buf: Buffer, off: number): number {
  return buf.readUInt16LE(off);
}

export function decodeMarket(pubkey: PublicKey, data: Buffer): MarketAccount {
  // disc 8 + symbol 8 + status 1 + im 2 + mm 2 + lev 2 + age 8 + conf 2 + jump 2
  // + mark 8 + conf 8 + slot 8 + rejected 8 + oiL 8 + oiS 8 + ins 8 + bump 1
  let o = 8;
  const symbol = data.subarray(o, o + 8).toString("utf8");
  o += 8;
  const status = data[o];
  o += 1;
  const imBps = readU16(data, o);
  o += 2;
  const mmBps = readU16(data, o);
  o += 2;
  const maxLeverageX = readU16(data, o);
  o += 2;
  const maxAgeSlots = readU64(data, o);
  o += 8;
  const maxConfBps = readU16(data, o);
  o += 2;
  const maxJumpBps = readU16(data, o);
  o += 2;
  const markPrice = readU64(data, o);
  o += 8;
  const markConf = readU64(data, o);
  o += 8;
  const markSlot = readU64(data, o);
  o += 8;
  const lastRejectedPrice = readU64(data, o);
  o += 8;
  const openInterestLong = readU64(data, o);
  o += 8;
  const openInterestShort = readU64(data, o);
  o += 8;
  const insuranceLamports = readU64(data, o);
  return {
    symbol,
    status,
    imBps,
    mmBps,
    maxLeverageX,
    maxAgeSlots,
    maxConfBps,
    maxJumpBps,
    markPrice,
    markConf,
    markSlot,
    lastRejectedPrice,
    openInterestLong,
    openInterestShort,
    insuranceLamports,
    pubkey
  };
}

export function decodePosition(pubkey: PublicKey, data: Buffer): PositionAccount {
  let o = 8;
  const owner = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const market = new PublicKey(data.subarray(o, o + 32));
  o += 32;
  const side = data[o];
  o += 1;
  const size = readU64(data, o);
  o += 8;
  const entryPrice = readU64(data, o);
  o += 8;
  const collateral = readU64(data, o);
  return { owner, market, side, size, entryPrice, collateral, pubkey };
}

export async function fetchMarket(
  connection: Connection,
  symbol: string
): Promise<MarketAccount | null> {
  const pubkey = marketPda(symbol);
  const info = await connection.getAccountInfo(pubkey);
  if (!info) return null;
  return decodeMarket(pubkey, Buffer.from(info.data));
}

export async function fetchPosition(
  connection: Connection,
  symbol: string,
  owner: PublicKey
): Promise<PositionAccount | null> {
  const market = marketPda(symbol);
  const pubkey = positionPda(market, owner);
  const info = await connection.getAccountInfo(pubkey);
  if (!info) return null;
  return decodePosition(pubkey, Buffer.from(info.data));
}

export function marketMeta(symbol: string): MarketMeta | undefined {
  return MARKETS.find((m) => m.symbol === symbol);
}
