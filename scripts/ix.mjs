import { PublicKey, SystemProgram, TransactionInstruction } from "@solana/web3.js";
import { createHash } from "crypto";

export const PROGRAM_ID = new PublicKey(
  process.env.HELM_PROGRAM_ID || "6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd"
);

function disc(name) {
  return createHash("sha256").update(`global:${name}`).digest().subarray(0, 8);
}

export function configPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("config")], PROGRAM_ID)[0];
}
export function vaultPda() {
  return PublicKey.findProgramAddressSync([Buffer.from("vault")], PROGRAM_ID)[0];
}
export function marketPda(symbol) {
  return PublicKey.findProgramAddressSync([Buffer.from("market"), Buffer.from(symbol)], PROGRAM_ID)[0];
}

function u16(n) { const b = Buffer.alloc(2); b.writeUInt16LE(n); return b; }
function u64(n) { const b = Buffer.alloc(8); b.writeBigUInt64LE(BigInt(n)); return b; }
function sym(s) {
  const b = Buffer.from(s);
  if (b.length !== 8) throw new Error(`symbol ${s} must be 8 bytes`);
  return b;
}

export function initializeIx(authority, oracle) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: true },
      { pubkey: vaultPda(), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: Buffer.concat([disc("initialize"), oracle.toBuffer()])
  });
}

export function createMarketIx(authority, symbol, params) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: configPda(), isSigner: false, isWritable: false },
      { pubkey: marketPda(symbol), isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false }
    ],
    data: Buffer.concat([
      disc("create_market"),
      sym(symbol),
      u16(params.imBps),
      u16(params.mmBps),
      u16(params.maxLeverageX),
      u64(params.maxAgeSlots),
      u16(params.maxConfBps),
      u16(params.maxJumpBps)
    ])
  });
}

export function postOracleIx(oracle, symbol, price, confidence, publishSlot) {
  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: oracle, isSigner: true, isWritable: false },
      { pubkey: configPda(), isSigner: false, isWritable: false },
      { pubkey: marketPda(symbol), isSigner: false, isWritable: true }
    ],
    data: Buffer.concat([disc("post_oracle"), sym(symbol), u64(price), u64(confidence), u64(publishSlot)])
  });
}
