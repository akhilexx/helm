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
