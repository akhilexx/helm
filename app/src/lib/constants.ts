import { PublicKey, clusterApiUrl } from "@solana/web3.js";

// Live on Solana devnet as of 10 Nov 2026 IST. See ../../deployed-devnet.txt
export const PROGRAM_ID = new PublicKey(
  process.env.NEXT_PUBLIC_PROGRAM_ID || "6edxEyrKXKAYSHcYy1wVEzF7miJ3dvYoR93TkrxfhXnd"
);

export const RPC_URL =
  process.env.NEXT_PUBLIC_RPC_URL || "https://api.devnet.solana.com";

export const SCALE = 1_000_000;
export const BPS_DENOM = 10_000;

export type MarketMeta = {
  symbol: string;
  bytes: Uint8Array;
  label: string;
  pair: string;
  pythId: string;
  note: string;
};

export const MARKETS: MarketMeta[] = [
  {
    symbol: "SOL-PERP",
    bytes: new TextEncoder().encode("SOL-PERP"),
    label: "Solana",
    pair: "SOL / USD",
    pythId: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
    note: "Crypto perpetual, isolated margin"
  },
  {
    symbol: "BTC-PERP",
    bytes: new TextEncoder().encode("BTC-PERP"),
    label: "Bitcoin",
    pair: "BTC / USD",
    pythId: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
    note: "Crypto perpetual, isolated margin"
  },
  {
    symbol: "XAU-PERP",
    bytes: new TextEncoder().encode("XAU-PERP"),
    label: "Gold",
    pair: "XAU / USD",
    pythId: "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2",
    note: "Gold hedge perpetual — continues the Afterglow / Gold Curve line"
  }
];

export const STATUS_LABEL = ["Active", "Reduce-only", "Halted"] as const;
