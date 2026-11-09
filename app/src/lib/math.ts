import { BPS_DENOM, SCALE } from "./constants";

export function formatPx(price: number | bigint): string {
  const n = Number(price) / SCALE;
  if (!Number.isFinite(n) || n === 0) return "—";
  return n >= 1000
    ? n.toLocaleString("en-US", { maximumFractionDigits: 2 })
    : n.toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatSize(size: number | bigint): string {
  return (Number(size) / SCALE).toLocaleString("en-US", { maximumFractionDigits: 4 });
}

export function formatSol(lamports: number | bigint): string {
  return (Number(lamports) / 1_000_000_000).toLocaleString("en-US", {
    maximumFractionDigits: 4
  });
}

export function unrealizedPnl(
  isLong: boolean,
  size: bigint,
  entry: bigint,
  mark: bigint
): bigint {
  if (size === 0n) return 0n;
  const delta = mark - entry;
  const raw = isLong ? delta * size : -delta * size;
  return raw / BigInt(SCALE);
}

export function notional(size: bigint, price: bigint): bigint {
  return (size * price) / BigInt(SCALE);
}

export function marginRequired(size: bigint, price: bigint, bps: number): bigint {
  return (notional(size, price) * BigInt(bps)) / BigInt(BPS_DENOM);
}

export function liquidationPrice(
  isLong: boolean,
  size: bigint,
  entry: bigint,
  collateral: bigint,
  mmBps: number
): bigint | null {
  if (size === 0n) return null;
  const mm = BigInt(mmBps);
  const scale = BigInt(SCALE);
  const denomBps = BigInt(BPS_DENOM);
  if (isLong) {
    const num = collateral * scale - entry * size;
    const den = (size * mm) / denomBps - size;
    if (den === 0n) return null;
    const liq = num / den;
    return liq > 0n ? liq : 1n;
  }
  const num = collateral * scale + entry * size;
  const den = (size * mm) / denomBps + size;
  if (den === 0n) return null;
  const liq = num / den;
  return liq > 0n ? liq : 1n;
}

export function healthPct(
  equity: bigint,
  mm: bigint
): number | null {
  if (mm <= 0n) return null;
  return Number(equity) / Number(mm);
}
