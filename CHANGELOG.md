# Changelog: Cover

All notable changes to the Cover intelligent contract suite on GenLayer Studionet are documented in this file.

---

## [2.0.0] - 2026-11-06 (Cover V2)

### Fixed
- **Policy Term Binding**: Policies now permanently bind to their purchase-time coverage term, settlement rules, thresholds, and evidence source URL upon `buy`. Product source updates via `update_source` affect only policies bought afterwards.
- **Decision Rule Determinism**: Removed free-text `rule_text` parameter from `create_product`. Enforced deterministic constant `DECISION_RULE_V2 = "OUTAGE >= min_full minutes: 100% | OUTAGE >= min_half: 50% | DEGRADED >= min_full: 25% | otherwise 0%; unreadable or unclear: REVIEW"`.
- **Explicit Coverage Term**: Defined explicit term `COVERAGE_TERM_V2 = "OPEN_UNTIL_SETTLED_OR_CANCELLED"`, removing phantom clock or duration assumptions.
- **Product ID Return**: `create_product` returns generated product ID as string for direct client receipt handling.
- **CoverGuard Signatures & Attestation**:
  - Aligned view signature: `is_covered_for(holder: str, policy_id: str, product_id: str, terms_hash: str, min_coverage: int) -> bool`.
  - Bound `attest(policy_id: str)` to policy purchase-time `terms_hash` and SHA-256 hash of policy `evidence_url`.
- **Field Consistency**: Added `settlement_id`, `payout`, `cancel_refund` to policy record; added `product_id`, `terms_hash`, `evidence_url`, `url_used`, `payout` to settlement record.

### Added
- Pre-deploy regression test suite `tests/test_v2_regression.py` covering 9 critical properties (a-i) including multi-policy URL binding, terms hash sensitivity, ledger fuzzing (5000 ops), pure helper parity, and mock fixture evaluations. Total test suite expanded to 38 passing tests.
- Deployed active V2 contract pair on GenLayer Studionet:
  - `CoverV2`: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
  - `CoverGuardV2`: `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`
- Complete on-chain empirical evidence execution for Scenarios S1-S5 with receipts and balance snapshots.

---

## [1.0.0] - 2026-10-31 (Cover V1)

### Added
- Initial deployment of parametric cover on GenLayer Studionet (`0x4d12d00d527869a6a6f95358A11589ecf3C347e3` / `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724`).
- Iteration 2 prompt achieving 60/60 (100%) parse and match rate across 6 test fixtures.
- Proof of conservation invariants and multi-layer defensive gates (PAGE_UNCHANGED, TRIPWIRE, STRICT_PARSER).
