import { Connection, PublicKey, Transaction } from "@solana/web3.js";
import { RPC_URL } from "./constants";
import { parseHelmName, type ForecastSpec } from "./forecast";

export const PM_AMM_PROGRAM_ID = new PublicKey(
  "GV1FMGHRYBjQLaghE5fnGuYCuCcpdt3GD5xEX3TwN16y"
);
export const MUSDC_MINT = new PublicKey(
  "3WQ8hCqTNwjrh8WzE2XyoZoUrd1miPcwWfMkmFPUMEWZ"
);
export const FAUCET_URL = "https://pm-amm-devnet.vercel.app/api/faucet";

export function decodeName(name: unknown): string {
  if (typeof name === "string") return name.replace(/\0/g, "").trim();
  if (Array.isArray(name)) {
    return Buffer.from(name as number[]).toString("utf8").replace(/\0/g, "").trim();
  }
  return "";
}

export function connection(): Connection {
  return new Connection(RPC_URL, "confirmed");
}

export async function readOnlyClient() {
  const { PmAmmClient } = await import("@pm-amm/sdk");
  return PmAmmClient.readOnly(connection(), PM_AMM_PROGRAM_ID, MUSDC_MINT);
}

export async function signingClient(injected: {
  publicKey: { toString(): string };
  signTransaction: (tx: Transaction) => Promise<Transaction>;
  signAllTransactions?: (txs: Transaction[]) => Promise<Transaction[]>;
}) {
  const { AnchorProvider } = await import("@anchor-lang/core");
  const { PublicKey: PK } = await import("@solana/web3.js");
  const { PmAmmClient } = await import("@pm-amm/sdk");
  const publicKey = new PK(injected.publicKey.toString());
  const wallet = {
    publicKey,
    signTransaction: (tx: Transaction) => injected.signTransaction(tx),
    signAllTransactions: (txs: Transaction[]) =>
      injected.signAllTransactions
        ? injected.signAllTransactions(txs)
        : Promise.all(txs.map((t) => injected.signTransaction(t)))
  };
  const provider = new AnchorProvider(connection(), wallet as never, { commitment: "confirmed" });
  return PmAmmClient.fromProvider(provider, PM_AMM_PROGRAM_ID, MUSDC_MINT);
}

export type HelmMarket = {
  pubkey: PublicKey;
  name: string;
  spec: ForecastSpec;
  account: unknown;
};

export async function fetchHelmMarkets(): Promise<HelmMarket[]> {
  const client = await readOnlyClient();
  const rows = await client.fetchAllMarkets(443);
  const out: HelmMarket[] = [];
  for (const row of rows) {
    const name = decodeName(row.account.name);
    const spec = parseHelmName(name);
    if (!spec) continue;
    out.push({ pubkey: row.publicKey, name, spec, account: row.account });
  }
  return out.sort((a, b) => {
    const ae = Number((a.account as { endTs: { toNumber(): number } }).endTs.toNumber());
    const be = Number((b.account as { endTs: { toNumber(): number } }).endTs.toNumber());
    return be - ae;
  });
}

export async function requestMusdc(wallet: string): Promise<{ ok: boolean; amount?: number; sol?: number; error?: string }> {
  const res = await fetch(FAUCET_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ wallet, role: "player" })
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: body.error || `faucet HTTP ${res.status}` };
  return body;
}
