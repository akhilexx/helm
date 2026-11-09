import {
  PublicKey,
  SystemProgram,
  TransactionInstruction
} from "@solana/web3.js";
import { PROGRAM_ID } from "./constants";
import { DISC } from "./disc";
import { configPda, marketPda, positionPda, vaultPda } from "./program";

function u64(n: bigint | number): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(BigInt(n));
  return b;
}
function u16(n: number): Buffer {
  const b = Buffer.alloc(2);
  b.writeUInt16LE(n);
  return b;
}
function symbolBytes(symbol: string): Buffer {
  const raw = Buffer.from(symbol, "utf8");
  if (raw.length !== 8) throw new Error(`symbol must be 8 bytes, got ${symbol}`);
  return raw;
}

export function depositIx(owner: PublicKey, symbol: string, amount: bigint): TransactionInstruction {
  const market = marketPda(symbol);
  const keys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: positionPda(market, owner), isSigner: false, isWritable: true },
    { pubkey: vaultPda(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];
  const data = Buffer.concat([Buffer.from(DISC.deposit), symbolBytes(symbol), u64(amount)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function withdrawIx(owner: PublicKey, symbol: string, amount: bigint): TransactionInstruction {
  const market = marketPda(symbol);
  const keys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: positionPda(market, owner), isSigner: false, isWritable: true },
    { pubkey: vaultPda(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];
  const data = Buffer.concat([Buffer.from(DISC.withdraw), symbolBytes(symbol), u64(amount)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function openOrIncreaseIx(
  owner: PublicKey,
  symbol: string,
  isLong: boolean,
  size: bigint
): TransactionInstruction {
  const market = marketPda(symbol);
  const keys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: positionPda(market, owner), isSigner: false, isWritable: true },
    { pubkey: vaultPda(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];
  const data = Buffer.concat([
    Buffer.from(DISC.openOrIncrease),
    symbolBytes(symbol),
    Buffer.from([isLong ? 1 : 0]),
    u64(size)
  ]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function reduceIx(owner: PublicKey, symbol: string, size: bigint): TransactionInstruction {
  const market = marketPda(symbol);
  const keys = [
    { pubkey: owner, isSigner: true, isWritable: true },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: positionPda(market, owner), isSigner: false, isWritable: true },
    { pubkey: vaultPda(), isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
  ];
  const data = Buffer.concat([Buffer.from(DISC.reduce), symbolBytes(symbol), u64(size)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function liquidateIx(
  liquidator: PublicKey,
  owner: PublicKey,
  symbol: string
): TransactionInstruction {
  const market = marketPda(symbol);
  const keys = [
    { pubkey: liquidator, isSigner: true, isWritable: true },
    { pubkey: owner, isSigner: false, isWritable: false },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: market, isSigner: false, isWritable: true },
    { pubkey: positionPda(market, owner), isSigner: false, isWritable: false }
  ];
  // position is mut
  keys[4].isWritable = true;
  const data = Buffer.concat([Buffer.from(DISC.liquidate), symbolBytes(symbol)]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}

export function postOracleIx(
  oracle: PublicKey,
  symbol: string,
  price: bigint,
  confidence: bigint,
  publishSlot: bigint
): TransactionInstruction {
  const keys = [
    { pubkey: oracle, isSigner: true, isWritable: false },
    { pubkey: configPda(), isSigner: false, isWritable: false },
    { pubkey: marketPda(symbol), isSigner: false, isWritable: true }
  ];
  const data = Buffer.concat([
    Buffer.from(DISC.postOracle),
    symbolBytes(symbol),
    u64(price),
    u64(confidence),
    u64(publishSlot)
  ]);
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data });
}
