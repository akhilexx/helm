//! Oracle-safe resolution for binary price-threshold markets.
//! The same units are used for `now`, `expiry`, `proposed_at` and window
//! lengths (slots or unix seconds — the caller picks one clock and stays on it).

use crate::{check_oracle, OracleCheck};

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum Compare {
    Gte,
    Lte,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ForecastOutcome {
    Yes,
    No,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum ResolutionDecision {
    TooEarly,
    Halt { reason: OracleCheck },
    Propose(ForecastOutcome),
    Disputed,
    Finalize(ForecastOutcome),
    Void,
}

pub fn threshold_outcome(mark: u64, strike: u64, cmp: Compare) -> ForecastOutcome {
    match cmp {
        Compare::Gte => {
            if mark >= strike {
                ForecastOutcome::Yes
            } else {
                ForecastOutcome::No
            }
        }
        Compare::Lte => {
            if mark <= strike {
                ForecastOutcome::Yes
            } else {
                ForecastOutcome::No
            }
        }
    }
}

/// First look after expiry. Never returns Finalize — a proposal must sit
/// through the dispute window.
pub fn propose_resolution(
    now: u64,
    expiry: u64,
    mark: u64,
    strike: u64,
    cmp: Compare,
    oracle_slot: u64,
    confidence: u64,
    prev_mark: u64,
    max_age: u64,
    max_conf_bps: u16,
    max_jump_bps: u16,
) -> ResolutionDecision {
    if now < expiry {
        return ResolutionDecision::TooEarly;
    }
    match check_oracle(
        now,
        oracle_slot,
        mark,
        confidence,
        prev_mark,
        max_age,
        max_conf_bps,
        max_jump_bps,
    ) {
        OracleCheck::Ok => {
            ResolutionDecision::Propose(threshold_outcome(mark, strike, cmp))
        }
        reason => ResolutionDecision::Halt { reason },
    }
}

/// Subsequent look: keep the proposal, dispute it, finalize it, halt, or void.
pub fn advance_resolution(
    now: u64,
    expiry: u64,
    proposed_at: u64,
    proposed: ForecastOutcome,
    dispute_window: u64,
    void_grace: u64,
    mark: u64,
    strike: u64,
    cmp: Compare,
    oracle_slot: u64,
    confidence: u64,
    prev_mark: u64,
    max_age: u64,
    max_conf_bps: u16,
    max_jump_bps: u16,
) -> ResolutionDecision {
    if now < expiry {
        return ResolutionDecision::TooEarly;
    }
    let oracle = check_oracle(
        now,
        oracle_slot,
        mark,
        confidence,
        prev_mark,
        max_age,
        max_conf_bps,
        max_jump_bps,
    );
    let in_window = now < proposed_at.saturating_add(dispute_window);
    match oracle {
        OracleCheck::Ok => {
            let live = threshold_outcome(mark, strike, cmp);
            if live != proposed {
                return ResolutionDecision::Disputed;
            }
            if in_window {
                ResolutionDecision::Propose(proposed)
            } else {
                ResolutionDecision::Finalize(proposed)
            }
        }
        reason => {
            if now >= expiry.saturating_add(void_grace) {
                ResolutionDecision::Void
            } else if in_window {
                // Still waiting; do not finalize on a bad print.
                ResolutionDecision::Halt { reason }
            } else {
                // Window elapsed but we cannot confirm the last look — halt,
                // then void once grace runs out.
                ResolutionDecision::Halt { reason }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    const STRIKE: u64 = 150_000_000;
    const AGE: u64 = 32;
    const CONF: u16 = 100;
    const JUMP: u16 = 500;

    fn ok_propose(now: u64, expiry: u64, mark: u64) -> ResolutionDecision {
        propose_resolution(
            now, expiry, mark, STRIKE, Compare::Gte, now, 50_000, mark, AGE, CONF, JUMP,
        )
    }

    #[test]
    fn before_expiry_is_too_early() {
        assert_eq!(ok_propose(99, 100, 160_000_000), ResolutionDecision::TooEarly);
    }

    #[test]
    fn mark_at_or_above_strike_proposes_yes() {
        assert_eq!(
            ok_propose(100, 100, 150_000_000),
            ResolutionDecision::Propose(ForecastOutcome::Yes)
        );
        assert_eq!(
            ok_propose(100, 100, 160_000_000),
            ResolutionDecision::Propose(ForecastOutcome::Yes)
        );
    }

    #[test]
    fn mark_below_strike_proposes_no() {
        assert_eq!(
            ok_propose(100, 100, 149_999_999),
            ResolutionDecision::Propose(ForecastOutcome::No)
        );
    }

    #[test]
    fn lte_compare_flips_the_threshold() {
        let d = propose_resolution(
            100, 100, 140_000_000, STRIKE, Compare::Lte, 100, 50_000,
            140_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Propose(ForecastOutcome::Yes));
    }

    #[test]
    fn stale_oracle_halts() {
        let d = propose_resolution(
            1000, 100, 160_000_000, STRIKE, Compare::Gte, 900, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Halt { reason: OracleCheck::Stale });
    }

    #[test]
    fn wide_confidence_halts() {
        let d = propose_resolution(
            100, 100, 160_000_000, STRIKE, Compare::Gte, 100, 2_000_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Halt { reason: OracleCheck::WideConfidence });
    }

    #[test]
    fn jump_halts() {
        let d = propose_resolution(
            100, 100, 176_000_000, STRIKE, Compare::Gte, 100, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Halt { reason: OracleCheck::Jump });
    }

    #[test]
    fn missing_price_halts() {
        let d = propose_resolution(
            100, 100, 0, STRIKE, Compare::Gte, 100, 0, 0, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Halt { reason: OracleCheck::Missing });
    }

    #[test]
    fn contrary_print_during_window_disputes() {
        let d = advance_resolution(
            110, 100, 100, ForecastOutcome::Yes, 32, 200,
            140_000_000, STRIKE, Compare::Gte, 110, 50_000,
            140_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Disputed);
    }

    #[test]
    fn agreeing_print_during_window_keeps_proposal() {
        let d = advance_resolution(
            110, 100, 100, ForecastOutcome::Yes, 32, 200,
            160_000_000, STRIKE, Compare::Gte, 110, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Propose(ForecastOutcome::Yes));
    }

    #[test]
    fn agreeing_print_after_window_finalizes() {
        let d = advance_resolution(
            140, 100, 100, ForecastOutcome::Yes, 32, 200,
            160_000_000, STRIKE, Compare::Gte, 140, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Finalize(ForecastOutcome::Yes));
    }

    #[test]
    fn last_look_disagreement_after_window_still_disputes() {
        let d = advance_resolution(
            140, 100, 100, ForecastOutcome::Yes, 32, 200,
            140_000_000, STRIKE, Compare::Gte, 140, 50_000,
            140_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Disputed);
    }

    #[test]
    fn bad_oracle_after_grace_voids() {
        let d = advance_resolution(
            400, 100, 100, ForecastOutcome::Yes, 32, 200,
            160_000_000, STRIKE, Compare::Gte, 300, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Void);
    }

    #[test]
    fn bad_oracle_before_grace_halts_instead_of_guessing() {
        let d = advance_resolution(
            150, 100, 100, ForecastOutcome::Yes, 32, 200,
            160_000_000, STRIKE, Compare::Gte, 100, 50_000,
            160_000_000, AGE, CONF, JUMP,
        );
        assert_eq!(d, ResolutionDecision::Halt { reason: OracleCheck::Stale });
    }
}
