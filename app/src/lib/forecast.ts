export type Compare = "gte" | "lte";
export type ForecastOutcome = "yes" | "no";
export type OracleCheck = "ok" | "stale" | "wide" | "jump" | "missing";
export type ResolutionDecision =
  | { kind: "too_early" }
  | { kind: "halt"; reason: OracleCheck }
  | { kind: "propose"; outcome: ForecastOutcome }
  | { kind: "disputed" }
  | { kind: "finalize"; outcome: ForecastOutcome }
  | { kind: "void" };

export type ForecastSpec = {
  asset: "SOL" | "BTC" | "XAU";
  compare: Compare;
  strike: number;
};

export const FORECAST_MAX_AGE_SECS = 60;
export const FORECAST_MAX_CONF_BPS = 200;
export const FORECAST_MAX_JUMP_BPS = 500;
export const DEFAULT_DISPUTE_SECS = 3600;
export const DEFAULT_VOID_GRACE_SECS = 86400;

export function formatHelmName(spec: ForecastSpec): string {
  const op = spec.compare === "gte" ? ">=" : "<=";
  const name = `HELM ${spec.asset} ${op} ${spec.strike}`;
  if (name.length > 64) throw new Error("market name exceeds 64 bytes");
  return name;
}

export function parseHelmName(name: string): ForecastSpec | null {
  const m = name.trim().match(/^HELM (SOL|BTC|XAU) (>=|<=) ([0-9]+(?:\.[0-9]+)?)$/);
  if (!m) return null;
  return {
    asset: m[1] as ForecastSpec["asset"],
    compare: m[2] === ">=" ? "gte" : "lte",
    strike: Number(m[3])
  };
}

export function questionFor(spec: ForecastSpec): string {
  const op = spec.compare === "gte" ? "≥" : "≤";
  return `Will ${spec.asset} be ${op} $${spec.strike.toLocaleString("en-US")} at expiry?`;
}

export function checkOracle(
  now: number,
  publishTime: number,
  price: number,
  confidence: number,
  prevPrice: number,
  maxAge = FORECAST_MAX_AGE_SECS,
  maxConfBps = FORECAST_MAX_CONF_BPS,
  maxJumpBps = FORECAST_MAX_JUMP_BPS
): OracleCheck {
  if (!(price > 0)) return "missing";
  if (now < publishTime) return "stale";
  if (now - publishTime > maxAge) return "stale";
  const confBps = (confidence / price) * 10_000;
  if (confBps > maxConfBps) return "wide";
  if (prevPrice > 0) {
    const jump = (Math.abs(price - prevPrice) / prevPrice) * 10_000;
    if (jump > maxJumpBps) return "jump";
  }
  return "ok";
}

export function thresholdOutcome(price: number, strike: number, compare: Compare): ForecastOutcome {
  if (compare === "gte") return price >= strike ? "yes" : "no";
  return price <= strike ? "yes" : "no";
}

export function proposeResolution(args: {
  now: number;
  expiry: number;
  price: number;
  strike: number;
  compare: Compare;
  publishTime: number;
  confidence: number;
  prevPrice: number;
}): ResolutionDecision {
  if (args.now < args.expiry) return { kind: "too_early" };
  const reason = checkOracle(args.now, args.publishTime, args.price, args.confidence, args.prevPrice);
  if (reason !== "ok") return { kind: "halt", reason };
  return { kind: "propose", outcome: thresholdOutcome(args.price, args.strike, args.compare) };
}

export function advanceResolution(args: {
  now: number;
  expiry: number;
  proposedAt: number;
  proposed: ForecastOutcome;
  disputeWindow: number;
  voidGrace: number;
  price: number;
  strike: number;
  compare: Compare;
  publishTime: number;
  confidence: number;
  prevPrice: number;
}): ResolutionDecision {
  if (args.now < args.expiry) return { kind: "too_early" };
  const reason = checkOracle(args.now, args.publishTime, args.price, args.confidence, args.prevPrice);
  const inWindow = args.now < args.proposedAt + args.disputeWindow;
  if (reason === "ok") {
    const live = thresholdOutcome(args.price, args.strike, args.compare);
    if (live !== args.proposed) return { kind: "disputed" };
    return inWindow
      ? { kind: "propose", outcome: args.proposed }
      : { kind: "finalize", outcome: args.proposed };
  }
  if (args.now >= args.expiry + args.voidGrace) return { kind: "void" };
  return { kind: "halt", reason };
}

export function decisionLabel(d: ResolutionDecision): string {
  switch (d.kind) {
    case "too_early": return "Trading — not yet expired";
    case "halt": return `Halted — oracle ${d.reason}`;
    case "propose": return `Proposed ${d.outcome.toUpperCase()} — dispute window open`;
    case "disputed": return "Disputed — proposal discarded";
    case "finalize": return `Ready to finalize ${d.outcome.toUpperCase()}`;
    case "void": return "Void — oracle never became safe";
  }
}

export type ProposalState = {
  proposed: ForecastOutcome;
  proposedAt: number;
};

const STORE = "helm-forecast-proposals-v1";

export function loadProposal(market: string): ProposalState | null {
  if (typeof window === "undefined") return null;
  try {
    const all = JSON.parse(localStorage.getItem(STORE) || "{}") as Record<string, ProposalState>;
    return all[market] ?? null;
  } catch {
    return null;
  }
}

export function saveProposal(market: string, state: ProposalState | null) {
  if (typeof window === "undefined") return;
  const all = JSON.parse(localStorage.getItem(STORE) || "{}") as Record<string, ProposalState>;
  if (state) all[market] = state;
  else delete all[market];
  localStorage.setItem(STORE, JSON.stringify(all));
}

export const PYTH_IDS: Record<ForecastSpec["asset"], string> = {
  SOL: "0xef0d8b6fda2ceba41da15d4095d1da392a0d2f8ed0c6c7bc0f4cfac8c280b56d",
  BTC: "0xe62df6c8b4a85fe1a67db44dc12de5db330f7ac66b72dc658afedf0f4a415b43",
  XAU: "0x765d2ba906dbc32ca17cc11f5310a89e9ee1f6420508c63861f2f8ba4ee34bb2"
};

export async function fetchHermesPrice(asset: ForecastSpec["asset"]): Promise<{
  price: number;
  confidence: number;
  publishTime: number;
} | null> {
  const id = PYTH_IDS[asset];
  const res = await fetch(`https://hermes.pyth.network/v2/updates/price/latest?ids[]=${id}`);
  if (!res.ok) return null;
  const body = await res.json();
  const row = body?.parsed?.[0];
  if (!row?.price) return null;
  const expo = Number(row.price.expo);
  return {
    price: Number(row.price.price) * 10 ** expo,
    confidence: Number(row.price.conf) * 10 ** expo,
    publishTime: Number(row.price.publish_time ?? row.publish_time ?? 0)
  };
}
