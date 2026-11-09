import test from "node:test";
import assert from "node:assert/strict";

const SCALE = 1_000_000n;
const BPS = 10_000n;

function upnl(isLong, size, entry, mark) {
  if (size === 0n) return 0n;
  const raw = isLong ? (mark - entry) * size : (entry - mark) * size;
  return raw / SCALE;
}
function notional(size, price) { return (size * price) / SCALE; }
function margin(size, price, bps) { return (notional(size, price) * BigInt(bps)) / BPS; }

test("long pnl +10 on a $10 rise of size 1", () => {
  assert.equal(upnl(true, 1_000_000n, 100_000_000n, 110_000_000n), 10_000_000n);
});
test("short pnl +20 on a $10 fall of size 2", () => {
  assert.equal(upnl(false, 2_000_000n, 100_000_000n, 90_000_000n), 20_000_000n);
});
test("margin 10% of $100 notional", () => {
  assert.equal(margin(1_000_000n, 100_000_000n, 1000), 10_000_000n);
});

import { createRequire } from "module";
// Lightweight copy of forecast rules for Node tests (mirrors app/src/lib/forecast.ts).
function checkOracle(now, pub, price, conf, prev, maxAge=60, maxConf=200, maxJump=500) {
  if (!(price > 0)) return "missing";
  if (now < pub) return "stale";
  if (now - pub > maxAge) return "stale";
  if ((conf / price) * 10000 > maxConf) return "wide";
  if (prev > 0 && (Math.abs(price - prev) / prev) * 10000 > maxJump) return "jump";
  return "ok";
}
function outcome(price, strike, gte) { return (gte ? price >= strike : price <= strike) ? "yes" : "no"; }

test("forecast name round-trip shape", () => {
  const name = "HELM SOL >= 150";
  const m = name.match(/^HELM (SOL|BTC|XAU) (>=|<=) ([0-9]+(?:\.[0-9]+)?)$/);
  assert.ok(m);
  assert.equal(m[1], "SOL");
  assert.equal(m[3], "150");
});

test("forecast proposes YES at strike", () => {
  assert.equal(checkOracle(100, 100, 150, 0.1, 150), "ok");
  assert.equal(outcome(150, 150, true), "yes");
});

test("forecast halts on stale print", () => {
  assert.equal(checkOracle(200, 100, 160, 0.1, 160), "stale");
});
