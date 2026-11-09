export type WalletLike = {
  publicKey: { toBytes(): Uint8Array; toString(): string };
  signTransaction: (tx: unknown) => Promise<unknown>;
  connect: () => Promise<{ publicKey: { toString(): string } }>;
  disconnect?: () => Promise<void>;
  on?: (ev: string, cb: () => void) => void;
};

export function getInjected(): WalletLike | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { solana?: WalletLike; solflare?: WalletLike };
  return w.solana || w.solflare || null;
}
