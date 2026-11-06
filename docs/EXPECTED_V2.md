# EXPECTED_V2: Pre-Registered On-Chain Expectations for Cover V2

This document records the exact expected values for each on-chain test scenario (S1–S5) on GenLayer Studionet prior to any deployment or test execution.

---

## Scenario S1: Product Creation and Isolated Pool Funding
- **Setup**: Two throwaway accounts: Creator and Buyer. Both claim demo credits (1,000 CR each).
- **Product A Creation**:
  - Name: `"Cover V2 Cloud Alpha"`
  - Source URL: `https://raw.githubusercontent.com/hypercybers99/cover-genlayer/cover-v1-final/fixtures/status-s0-operational.md`
  - Thresholds: min_full = 60 min, min_half = 30 min, premium_bps = 1000 (10.00%)
  - Expected returned product ID: `1` (or next sequential ID)
  - Expected `get_product(id)` return value: record with matching name, url, host, dir_path, terms_hash, pool_balance = 0, reserved = 0
- **Product B Creation**:
  - Name: `"Cover V2 DB Beta"`
  - Source URL: `https://raw.githubusercontent.com/hypercybers99/cover-genlayer/cover-v1-final/fixtures/status-s0-operational.md`
  - Thresholds: min_full = 120 min, min_half = 60 min, premium_bps = 1500 (15.00%)
  - Expected returned product ID: `2` (or sequential)
- **Funding Product A**:
  - Deposit: 300 CR from Creator
  - Expected Creator balance: 700 CR (-300 CR)
  - Expected Product A pool: balance = 300 CR, reserved = 0 CR, free = 300 CR
- **Funding Product B**:
  - Deposit: 200 CR from Creator
  - Expected Creator balance: 500 CR (-200 CR)
  - Expected Product B pool: balance = 200 CR, reserved = 0 CR, free = 200 CR
  - Expected Product A pool: unchanged (300 CR) -> pool isolation verified

---

## Scenario S2: Purchase-Time URL Binding & Source Mutation Settle
- **Action 1**: Buyer purchases Policy 1 on Product A with coverage = 100 CR.
  - Quoted premium: `quote_premium(100, 1000)` = 10 CR.
  - Page at purchase: `status-s0-operational.md` (OPERATIONAL).
  - Expected Buyer balance: 990 CR (-10 CR).
  - Expected Policy 1 record:
    - `evidence_url`: `.../status-s0-operational.md`
    - `coverage`: 100 CR
    - `premium`: 10 CR
    - `status`: `"ACTIVE"`
    - `terms_hash`: matches Product A purchase-time terms hash
    - `term`: `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`
  - Expected Product A pool: balance = 310 CR (+10 CR), reserved = 100 CR (+100 CR), free = 210 CR.
- **Action 2**: Creator updates source URL of Product A:
  - New URL: `https://raw.githubusercontent.com/hypercybers99/cover-genlayer/cover-v1-final/fixtures/status-s1-outage-75.md`
  - Expected Product A record: `url` updated to s1, `source_history` contains [s0, s1], `seq` = 2.
  - Expected Policy 1 record: `evidence_url` STILL points to `s0-operational.md` (unchanged).
- **Action 3**: Buyer settles Policy 1:
  - Settle reads Policy 1's bound `evidence_url` (`s0-operational.md`).
  - Expected outcome: `"NO_PAY"`.
  - Expected Policy 1 status: `"ACTIVE"` (attempts incremented to 1).
  - Expected Buyer payout: 0 CR.
  - Expected Product A pool: balance = 310 CR, reserved = 100 CR.
- **Action 4**: Buyer purchases Policy 2 on Product A with coverage = 50 CR.
  - Page at purchase: `status-s1-outage-75.md` is NOT operational!
  - Wait: Purchase gate checks that service is OPERATIONAL. If page has outage, buy is REFUSED with `"event already in progress or status unclear at purchase"`.
  - Therefore, to test purchase under new source: Creator temporarily points Product A to operational fixture with different query/filename, or Creator updates to operational-2 (`status-s5-operational-reformatted.html`), Buyer buys Policy 2, Creator then updates source to `status-s1-outage-75.md`, or settle Policy 2 against s1.
  - Alternatively: Creator sets source to `status-s1-outage-75.md` after purchase of Policy 2.
  - Expected outcome for outage 75 min (min_full 60 min): `"PAY_100"`.
  - Payout: 100% of coverage = 50 CR.
  - Expected Policy 2 status: `"PAID"`.
  - Expected Policy 2 `payout`: `"50"`.
  - Expected Policy 2 `settlement_id`: non-empty string.

---

## Scenario S3: Six Canonical Status Fixtures Empirical Settle
Each fixture evaluated on a fresh policy:
1. `status-s1-outage-75.md` (75 min outage >= min_full 60):
   - Expected outcome: `"PAY_100"`
   - Expected payout: 100% of coverage
   - Policy status: `"PAID"`
2. `status-s2-outage-35.md` (35 min outage: min_half 30 <= 35 < min_full 60):
   - Expected outcome: `"PAY_50"`
   - Expected payout: 50% of coverage
   - Policy status: `"PAID"`
3. `status-s3-outage-20.md` (20 min outage < min_half 30):
   - Expected outcome: `"NO_PAY"`
   - Expected payout: 0 CR
   - Policy status: `"ACTIVE"`
4. `status-s4-degraded-90.md` (90 min degraded >= min_full 60):
   - Expected outcome: `"PAY_25"`
   - Expected payout: 25% of coverage
   - Policy status: `"PAID"`
5. `status-s5-operational-reformatted.html` (operational):
   - Expected outcome: `"NO_PAY"`
   - Expected payout: 0 CR
   - Policy status: `"ACTIVE"`
6. `status-s7-no-duration.md` (outage with no duration in minutes):
   - Expected outcome: `"REVIEW"`
   - Expected payout: 0 CR
   - Policy status: `"ACTIVE"`

---

## Scenario S4: Lifecycle Edge Cases
1. **Cancel Policy**:
   - Holder cancels active policy.
   - Expected refund: 0 CR (premium non-refundable).
   - Expected pool reserved liquidity: released by policy coverage amount.
   - Expected policy status: `"CANCELLED"`.
   - Expected policy `cancel_refund`: `"0"`.
2. **Withdraw Unreserved**:
   - Creator calls `withdraw_unreserved` for unreserved credits.
   - Expected Creator balance: increases by withdrawn amount.
   - Expected pool balance: decreases by withdrawn amount.
   - Overdraw attempt (> free balance): raises UserError `"withdraw exceeds unreserved"`.
3. **Duplicate Observation**:
   - Settle called twice on identical page content without changes.
   - Expected error: raises UserError `"duplicate observation: ..."`
4. **Unknown Policy**:
   - Settle or cancel called on non-existent policy ID (e.g. `"99999"`).
   - Expected error: raises UserError `"unknown policy"`.

---

## Scenario S5: CoverGuard V2 Consumer Verification
1. **`is_covered(holder, policy_id)`**:
   - Active policy: returns `{"covered": "true", "reason": "OK", "policy_status": "ACTIVE", "coverage": "...", "product_id": "...", "terms_hash": "..."}`.
   - Paid policy: returns `{"covered": "false", "reason": "PAID", ...}`.
   - Cancelled policy: returns `{"covered": "false", "reason": "CANCELLED", ...}`.
   - Unknown policy: returns `{"covered": "false", "reason": "NO_POLICY", ...}`.
2. **`is_covered_for(holder, policy_id, product_id, terms_hash, min_coverage)`**:
   - Matching policy terms_hash, product_id, min_coverage <= coverage: returns `True`.
   - Mismatched terms_hash: returns `False`.
   - Min coverage > policy coverage: returns `False`.
   - Wrong holder address: returns `False`.
3. **`attest(policy_id)`**:
   - Holder calls `attest(policy_id)`.
   - Returns attestation ID (`aid`).
   - Expected attestation record:
     - `schema_version`: `"1"`
     - `id`: `aid`
     - `attester`: holder address
     - `policy_id`: policy ID
     - `product_id`: product ID
     - `coverage`: policy coverage
     - `terms_hash`: policy purchase-time terms hash
     - `evidence_url_hash`: SHA-256 hex digest of policy evidence URL
