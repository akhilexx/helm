//! Pure risk and PnL math. Unit-tested with `cargo test --lib`.
//! All prices and sizes use 1e6 fixed-point (`SCALE`). Collateral is native
//! lamports (1e9). Functions that mix the two convert explicitly.

pub const SCALE: u128 = 1_000_000;
pub const BPS_DENOM: u128 = 10_000;

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Side {
    Long,
    Short,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum OracleCheck {
    Ok,
    Stale,
    WideConfidence,
    Jump,
    Missing,
}

/// Unrealized PnL in lamports.
/// `size` and `price` are 1e6-scaled. Result is converted so that
/// 1.0 unit of size at a $1 price move = 1_000_000 "quote units", then
/// mapped 1:1 into lamports for the demo (1 quote unit = 1 lamport).
/// This keeps the demo internally consistent: depositing 1 SOL (1e9 lamports)
/// of collateral against a $100 mark and size 1e6 (1.0) is meaningful.
pub fn unrealized_pnl(side: Side, size: u64, entry_price: u64, mark_price: u64) -> i128 {
    if size == 0 {
        return 0;
    }
    let size = size as i128;
    let entry = entry_price as i128;
    let mark = mark_price as i128;
    let delta = mark - entry;
    let raw = match side {
        Side::Long => delta * size,
        Side::Short => -delta * size,
    };
    raw / SCALE as i128
}

pub fn notional(size: u64, price: u64) -> u128 {
    (size as u128) * (price as u128) / SCALE
}

pub fn margin_required(size: u64, price: u64, bps: u16) -> u128 {
    notional(size, price) * (bps as u128) / BPS_DENOM
}

pub fn equity(collateral: u64, upnl: i128) -> i128 {
    collateral as i128 + upnl
}

pub fn is_liquidatable(collateral: u64, upnl: i128, size: u64, mark: u64, mm_bps: u16) -> bool {
    if size == 0 {
        return false;
    }
    let eq = equity(collateral, upnl);
    let mm = margin_required(size, mark, mm_bps) as i128;
    eq < mm
}

/// Isolated-margin liquidation price, 1e6-scaled.
/// Long:  eq = collat + (liq - entry)*size/SCALE
///        mm = liq*size/SCALE * mm_bps/10000
///        collat + (liq-entry)*s = liq*s*mm
/// Short is the symmetric form.
/// Returns None if size is zero or the denominator vanishes.
pub fn liquidation_price(
    side: Side,
    size: u64,
    entry_price: u64,
    collateral: u64,
    mm_bps: u16,
) -> Option<u64> {
    if size == 0 {
        return None;
    }
    let s = size as i128;
    let entry = entry_price as i128;
    let c = collateral as i128;
    let mm = mm_bps as i128;
    match side {
        Side::Long => {
            // c + (liq - entry) * s / SCALE = liq * s / SCALE * mm / 10000
            // c*SCALE + (liq - entry)*s = liq * s * mm / 10000
            // c*SCALE - entry*s = liq*s*mm/10000 - liq*s
            // c*SCALE - entry*s = liq*s*(mm/10000 - 1)
            let num = c * SCALE as i128 - entry * s;
            let den = s * mm / BPS_DENOM as i128 - s;
            if den == 0 {
                return None;
            }
            let liq = num / den;
            if liq <= 0 {
                return Some(1);
            }
            Some(liq as u64)
        }
        Side::Short => {
            // c + (entry - liq)*s/SCALE = liq*s/SCALE * mm/10000
            // c*SCALE + (entry - liq)*s = liq*s*mm/10000
            // c*SCALE + entry*s = liq*s*mm/10000 + liq*s
            // c*SCALE + entry*s = liq*s*(mm/10000 + 1)
            let num = c * SCALE as i128 + entry * s;
            let den = s * mm / BPS_DENOM as i128 + s;
            if den == 0 {
                return None;
            }
            let liq = num / den;
            if liq <= 0 {
                return Some(1);
            }
            Some(liq as u64)
        }
    }
}

pub fn check_oracle(
    now_slot: u64,
    oracle_slot: u64,
    price: u64,
    confidence: u64,
    prev_price: u64,
    max_age_slots: u64,
    max_conf_bps: u16,
    max_jump_bps: u16,
) -> OracleCheck {
    if price == 0 {
        return OracleCheck::Missing;
    }
    if now_slot < oracle_slot {
        return OracleCheck::Stale;
    }
    if now_slot.saturating_sub(oracle_slot) > max_age_slots {
        return OracleCheck::Stale;
    }
    let conf_bps = if price == 0 {
        u128::MAX
    } else {
        (confidence as u128) * BPS_DENOM / (price as u128)
    };
    if conf_bps > max_conf_bps as u128 {
        return OracleCheck::WideConfidence;
    }
    if prev_price > 0 {
        let jump = if price >= prev_price {
            (price as u128 - prev_price as u128) * BPS_DENOM / prev_price as u128
        } else {
            (prev_price as u128 - price as u128) * BPS_DENOM / prev_price as u128
        };
        if jump > max_jump_bps as u128 {
            return OracleCheck::Jump;
        }
    }
    OracleCheck::Ok
}

pub fn max_size_for_leverage(collateral: u64, price: u64, max_leverage_x: u16) -> u64 {
    if price == 0 {
        return 0;
    }
    // notional = size * price / SCALE <= collateral * lev
    // size <= collateral * lev * SCALE / price
    let raw = (collateral as u128) * (max_leverage_x as u128) * SCALE / (price as u128);
    raw.min(u64::MAX as u128) as u64
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn long_pnl_positive_when_mark_rises() {
        let pnl = unrealized_pnl(Side::Long, 1_000_000, 100_000_000, 110_000_000);
        assert_eq!(pnl, 10_000_000);
    }

    #[test]
    fn short_pnl_positive_when_mark_falls() {
        let pnl = unrealized_pnl(Side::Short, 2_000_000, 100_000_000, 90_000_000);
        assert_eq!(pnl, 20_000_000);
    }

    #[test]
    fn long_pnl_negative_when_mark_falls() {
        let pnl = unrealized_pnl(Side::Long, 1_000_000, 100_000_000, 95_000_000);
        assert_eq!(pnl, -5_000_000);
    }

    #[test]
    fn zero_size_pnl_is_zero() {
        assert_eq!(unrealized_pnl(Side::Long, 0, 100, 200), 0);
    }

    #[test]
    fn notional_and_margin() {
        // size 1.0, price $100 → notional 100_000_000
        assert_eq!(notional(1_000_000, 100_000_000), 100_000_000);
        // 10% IM = 10_000_000
        assert_eq!(margin_required(1_000_000, 100_000_000, 1_000), 10_000_000);
        // 5% MM = 5_000_000
        assert_eq!(margin_required(1_000_000, 100_000_000, 500), 5_000_000);
    }

    #[test]
    fn healthy_long_not_liquidatable() {
        let upnl = unrealized_pnl(Side::Long, 1_000_000, 100_000_000, 100_000_000);
        assert!(!is_liquidatable(20_000_000, upnl, 1_000_000, 100_000_000, 500));
    }

    #[test]
    fn underwater_long_is_liquidatable() {
        // collat 6e6, mark dropped $10 on 1.0 size → upnl -10e6, equity -4e6 < mm 4.5e6
        let upnl = unrealized_pnl(Side::Long, 1_000_000, 100_000_000, 90_000_000);
        assert_eq!(upnl, -10_000_000);
        assert!(is_liquidatable(6_000_000, upnl, 1_000_000, 90_000_000, 500));
    }

    #[test]
    fn liquidation_price_long_below_entry() {
        let liq = liquidation_price(Side::Long, 1_000_000, 100_000_000, 20_000_000, 500).unwrap();
        // From the closed form: roughly 84.21
        assert!(liq < 100_000_000, "liq {liq} should be below entry");
        assert!(liq > 80_000_000, "liq {liq} should be above 80");
        // At the computed liq, equity should sit on the MM line (within rounding).
        let upnl = unrealized_pnl(Side::Long, 1_000_000, 100_000_000, liq);
        let eq = equity(20_000_000, upnl);
        let mm = margin_required(1_000_000, liq, 500) as i128;
        let gap = (eq - mm).abs();
        assert!(gap <= 2, "eq {eq} mm {mm} gap {gap}");
    }

    #[test]
    fn liquidation_price_short_above_entry() {
        let liq = liquidation_price(Side::Short, 1_000_000, 100_000_000, 20_000_000, 500).unwrap();
        assert!(liq > 100_000_000, "liq {liq} should be above entry");
        let upnl = unrealized_pnl(Side::Short, 1_000_000, 100_000_000, liq);
        let eq = equity(20_000_000, upnl);
        let mm = margin_required(1_000_000, liq, 500) as i128;
        let gap = (eq - mm).abs();
        assert!(gap <= 2, "eq {eq} mm {mm} gap {gap}");
    }

    #[test]
    fn oracle_ok_when_fresh_and_tight() {
        let r = check_oracle(1000, 990, 100_000_000, 50_000, 100_000_000, 32, 100, 500);
        assert_eq!(r, OracleCheck::Ok);
    }

    #[test]
    fn oracle_stale_when_older_than_max_age() {
        let r = check_oracle(1000, 900, 100_000_000, 50_000, 100_000_000, 32, 100, 500);
        assert_eq!(r, OracleCheck::Stale);
    }

    #[test]
    fn oracle_rejects_wide_confidence() {
        // conf 2% of price, max 1%
        let r = check_oracle(1000, 990, 100_000_000, 2_000_000, 100_000_000, 32, 100, 500);
        assert_eq!(r, OracleCheck::WideConfidence);
    }

    #[test]
    fn oracle_rejects_jump() {
        // 10% jump, max 5%
        let r = check_oracle(1000, 990, 110_000_000, 50_000, 100_000_000, 32, 100, 500);
        assert_eq!(r, OracleCheck::Jump);
    }

    #[test]
    fn oracle_missing_on_zero_price() {
        assert_eq!(
            check_oracle(1, 1, 0, 0, 0, 32, 100, 500),
            OracleCheck::Missing
        );
    }

    #[test]
    fn leverage_cap_size() {
        // 10 SOL collateral, $100 mark, 10x → max notional 100 SOL → size 1.0
        let size = max_size_for_leverage(10_000_000, 100_000_000, 10);
        assert_eq!(size, 1_000_000);
    }
}
