# Pre-Registration Amendment: Real Payout Path on Cover V2 Pair

Status: Preview
Target Contracts:
- Cover V2: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
- CoverGuard V2: `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`

## 1. Reason for Amendment: S3 Evaluation Design Invariant

In the original test design for Scenario 3 (S3), status page fixtures were referenced using commit-pinned immutable URLs (`https://raw.githubusercontent.com/hypercybers99/cover-fixtures/<commit>/status-sN...`).

Because those URLs were pinned to specific immutable commit hashes:
1. The status page content could not change between `buy` and `settle`.
2. Purchasing a policy while the page reported an outage was refused by design (`event already in progress or status unclear at purchase`).
3. Purchasing while operational and settling against the exact same commit-pinned URL triggered the `PAGE_UNCHANGED` gate (`curr_nh16 == buy_nh16`), yielding `NO_PAY`.

As a result, no real credit-moving payout path (`PAY_100`, `PAY_50`, `PAY_25`) was triggered on the V2 deployment. This was an artifact of immutable test URLs, not contract logic.

## 2. Mutable Fixture Methodology

To evaluate genuine lifecycle status transitions, mutable fixture files are deployed to the `main` branch of `cover-fixtures` on GitHub (`https://raw.githubusercontent.com/hypercybers99/cover-fixtures/main/<file>`):

1. **Initial State (OPERATIONAL)**: Each mutable fixture file starts in the `OPERATIONAL` state (derived from `status-s0-operational.md`) with a unique HTML comment tag.
2. **Product Creation & Funding**: Products are registered with `min_full = 60`, `min_half = 30`, `premium_bps = 200` (2%), and funded by the underwriter.
3. **Policy Purchase**: The buyer purchases coverage (100 demo credits) while the fixture reports `OPERATIONAL`. The contract verifies operational status, deducts the premium, reserves coverage in the pool, and records `buy_norm_hash16`.
4. **Incident Injection**: A commit is pushed to `main` replacing the fixture content with the incident text.
5. **Cache-Free Verification & Cooling Period**: A verification script performs HTTP GET requests with cache-busting query parameter `?cb=<random>` (used for verification only, never in the contract policy URL). Settlement is only initiated after the new text is confirmed AND at least 6 minutes (360 seconds) have elapsed to ensure GitHub raw CDN cache invalidation.
6. **Settlement**: `settle(policy_id)` is invoked. The contract fetches the unparameterized `evidence_url`, extracts incident details, and executes payout.
7. **Failure Handling**: If CDN caching causes `settle` to return `PAGE_UNCHANGED`, the attempt is recorded as a caching failure, an additional wait is observed, and settlement is retried, preserving all receipts.

## 3. Pre-Registered Cases and Expected Outcomes

All policies purchased with `coverage = 100` demo credits, `min_full = 60`, `min_half = 30`:

| Case | Mutable Fixture File | Incident Type & Stated Duration | Pre-Registered Outcome | Expected Payout | Expected Final Policy Status |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Case 1 | `status-mutable-p1.md` | Major outage, 75 minutes | `PAY_100` | 100 demo credits (100%) | `PAID` |
| Case 2 | `status-mutable-p2.md` | Major outage, 35 minutes | `PAY_50` | 50 demo credits (50%) | `PAID` |
| Case 3 | `status-mutable-p3.md` | Major outage, 20 minutes | `NO_PAY` | 0 demo credits (0%) | `ACTIVE` |
| Case 4 | `status-mutable-p4.md` | Degraded performance, 90 minutes | `PAY_25` | 25 demo credits (25%) | `PAID` |
| Case 5 | `status-mutable-p5.md` | Major outage, no explicit minutes | `REVIEW` | 0 demo credits (0%) | `ACTIVE` |

App Service Layer Run:
- Mutable Fixture: `status-mutable-app.md`
- Incident: Major outage, 75 minutes
- Expected Outcome: `PAY_100` (100 demo credits payout), policy status transitions to `PAID`.

## 4. Post-PAID CoverGuard Gate Expectations

Following execution of a `PAID` settlement:
1. `is_covered(holder, policy_id)` MUST return `covered = false` with `reason = "PAID"`.
2. `is_covered_for(holder, policy_id, product_id, terms_hash, min_coverage)` MUST return `false`.
3. `attest(policy_id)` MUST be refused with the specific error: `not covered: PAID`.

## 5. Ledger Invariant

Across every lifecycle step, the total demo credits conservation invariant must hold:
`sum(balances) + sum(pool_balances) == total_minted` (2000 demo credits).

## 6. Prompt and Parser Baseline SHA256

- Extraction Prompt SHA256: `5a8c842c53e4329313d349afa6932672980dd1e8466af75118eeb8df010daa1d`
- Parse Extraction SHA256: `c44e054a7af6a9abb30fbc536895ce61532bf2edf016497d23a53ab094370978`

The extraction prompt and parser implementation in `CoverV2.py` are byte-identical to `Cover.py`. Robustness statistics are cited from the 60-run evaluation batch in V1; V2 executes 1 real on-chain run per test case.
