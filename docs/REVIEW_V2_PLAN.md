# REVIEW_V2_PLAN: Cover & CoverGuard V2 Intelligent Contracts

## 1. Executive Summary & Design Goals
This plan pre-registers the architectural, interface, and behavioral changes for the V2 contracts (`contracts/CoverV2.py` and `contracts/CoverGuardV2.py`).
The goals are:
1. **Purchase-Time Term Binding**: Bind every policy permanently to the coverage term, settlement rules, thresholds, and evidence URL in effect at purchase time. Product source updates must never alter existing policy settlement conditions.
2. **Deterministic Generated Rules**: Remove free-text `rule_text`. Replace it with a canonical constant string `DECISION_RULE_V2` parameterized by thresholds.
3. **Explicit Coverage Term**: Declare explicit term `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`.
4. **Complete Output Schemas**: Align policy, settlement, and pool health records so all fields consumed by frontend clients and consumers are first-class, verified contract outputs.
5. **CoverGuard Integration Correctness**: Enforce 5-parameter view checks against purchase-time terms hashes, and store policy-bound terms in attestations.

---

## 2. Frozen Contract Specifications

### 2.1 Constants
- `DECISION_RULE_V2 = "OUTAGE >= min_full minutes: 100% | OUTAGE >= min_half: 50% | DEGRADED >= min_full: 25% | otherwise 0%; unreadable or unclear: REVIEW"`
- `COVERAGE_TERM_V2 = "OPEN_UNTIL_SETTLED_OR_CANCELLED"`

### 2.2 Terms Hash Formulation
Terms hash is computed as the SHA-256 hex digest of the canonical JSON (sorted keys, compact separators `(",", ":")`) of the terms dictionary:
```json
{
  "decision_rule": "OUTAGE >= min_full minutes: 100% | OUTAGE >= min_half: 50% | DEGRADED >= min_full: 25% | otherwise 0%; unreadable or unclear: REVIEW",
  "dir_path": "/status",
  "host": "status.example.com",
  "min_full": "60",
  "min_half": "30",
  "premium_bps": "1000",
  "term": "OPEN_UNTIL_SETTLED_OR_CANCELLED"
}
```

### 2.3 Methods & Signatures

#### `create_product(name: str, url: str, min_full: int, min_half: int, premium_bps: int) -> str`
- Drops `rule_text` parameter.
- Computes `decision_rule` and `terms_hash`.
- Validates name (3-60 ASCII), URL (strict HTTPS, no port/userinfo/fragment/IP), thresholds (2 <= min_full <= 10080, 1 <= min_half < min_full), premium_bps (100-5000).
- Returns product ID (`pid`) as string.

#### `buy(product_id: str, coverage: int) -> str`
- Verifies pool free capital >= coverage, balance >= premium.
- Executes non-deterministic operational gate check on `prod["url"]`.
- Copies purchase-time terms into `pol_record`:
  - `terms_hash`: `prod["terms_hash"]`
  - `decision_rule`: `prod["decision_rule"]`
  - `evidence_url`: `prod["url"]`
  - `min_full`: `prod["min_full"]`
  - `min_half`: `prod["min_half"]`
  - `premium_bps`: `prod["premium_bps"]`
  - `term`: `prod["term"]`
  - `product_id`: `pid`
  - `coverage`: `str(coverage)`
  - `premium`: `str(premium)`
  - `buy_norm_hash16`: `nh16`
  - `status`: `"ACTIVE"`
  - `paid_amount`: `"0"`
  - `payout`: `"0"`
  - `settlement_id`: `""`
  - `cancel_refund`: `"0"`
  - `attempts`: `"0"`
  - `seq`: `"1"`
- Returns policy ID (`pol_id`) as string.

#### `settle(policy_id: str) -> str`
- Fetches `pol = json.loads(self.policies[pol_id])`.
- Reads `prod_url = pol["evidence_url"]`, `min_full = int(pol["min_full"])`, `min_half = int(pol["min_half"])`.
- Fetches and extracts status page. Evaluates deterministic `decide(status, minutes, min_full, min_half, q_ok, tripwire)`.
- Updates policy:
  - If `PAY_100`, `PAY_50`, or `PAY_25`: `pol["status"] = "PAID"`, `pol["paid_amount"] = str(payout)`, `pol["payout"] = str(payout)`, `pol["settlement_id"] = sid`. Releases reserved liquidity, credits holder balance.
  - If `NO_PAY`: `pol["attempts"]` incremented.
- Writes settlement record:
  - `id`: `sid`
  - `policy_id`: `pol_id`
  - `product_id`: `pol["product_id"]`
  - `terms_hash`: `pol["terms_hash"]`
  - `evidence_url`: `pol["evidence_url"]`
  - `url_used`: `pol["evidence_url"]`
  - `coverage`: `pol["coverage"]`
  - `payout`: `str(payout)`
  - `status`: `st`
  - `minutes`: `str(m)`
  - `quote`: `q`
  - `outcome`: `outcome`
  - `gate`: `gate`
  - `tripwire`: `tripwire`
- Returns settlement ID (`sid`).

#### `update_source(product_id: str, new_url: str) -> None`
- Validates `new_url` matches `prod["host"]` and `prod["dir_path"]`.
- Updates `prod["url"] = new_url`, appends to `prod["source_history"]`, increments `prod["seq"]`.
- Does NOT alter any existing policies.

#### `CoverGuardV2` Views and Writes
- `is_covered(holder: str, policy_id: str) -> str`:
  Returns JSON: `{"covered": "true"|"false", "reason": "...", "policy_status": "...", "coverage": "...", "product_id": "...", "terms_hash": "..."}`.
- `is_covered_for(holder: str, policy_id: str, product_id: str, terms_hash: str, min_coverage: int) -> bool`:
  Asserts `pol["terms_hash"] == terms_hash` (purchase-time match), `pol["product_id"] == product_id`, `pol["status"] == "ACTIVE"`, `int(pol["coverage"]) >= min_coverage`.
- `attest(policy_id: str) -> str`:
  Verifies active coverage via `is_covered`.
  Stores: `schema_version`, `id`, `attester`, `policy_id`, `product_id`, `coverage`, `terms_hash` (from `pol["terms_hash"]`), `evidence_url_hash` (SHA256 hex of `pol["evidence_url"]`).

---

## 3. Unit and Regression Test Plan (Pre-Deploy)
1. **Test (a)**: Buy policy on Product A -> `update_source` on Product A -> `settle` policy. Settle reads purchase-time URL.
2. **Test (b)**: Two policies bought on same product separated by `update_source`. Policy 1 retains source 1; Policy 2 retains source 2.
3. **Test (c)**: Canonical terms hash stability. Modifying any field (host, dir_path, min_full, min_half, premium_bps, rule, term) changes hash.
4. **Test (d)**: `create_product` returns product ID equal to stored record ID across back-to-back creations.
5. **Test (e)**: `CoverGuard.is_covered_for` returns `False` when passed a mismatched terms hash.
6. **Test (f)**: `CoverGuard.attest` stores policy-bound terms hash and evidence URL hash.
7. **Test (g)**: Table-driven parity test of `decide()` across all status and duration combinations vs V1 implementation.
8. **Test (h)**: Ledger invariant fuzz test (5000 random operations) verifying conservation of credits.
9. **Test (i)**: Direct Mode tests executing mock web responses against contract logic.

---

## 4. On-Chain Scenario Plan (S1 - S5)
- **S1 (Dual Product Creation & Separate Pools)**:
  Create Product A and Product B. Verify returned IDs match `get_product` reads. Fund A with 300 CR and B with 200 CR. Verify pool segregation.
- **S2 (Purchase-Time URL Binding & Settle Parity)**:
  Buy Policy 1 on A (pointing to operational fixture). Update source of A to outage fixture. Settle Policy 1: must evaluate operational fixture -> NO_PAY. Buy Policy 2 on A: must copy outage fixture. Settle Policy 2 -> PAY_100.
- **S3 (Six Fixture Evaluation on Fresh Policies)**:
  Evaluate the 6 canonical status fixtures:
  - s1 (75 min outage): PAY_100
  - s2 (35 min outage): PAY_50
  - s3 (20 min outage): NO_PAY
  - s4 (90 min degraded): PAY_25
  - s5 (operational reformatted): NO_PAY
  - s7 (no duration outage): REVIEW
- **S4 (Lifecycle Edge Cases)**:
  Cancel active policy (verifying 0 CR refund and reserve release). Withdraw unreserved pool balance. Verify duplicate observation rejection. Verify unknown policy UserError.
- **S5 (CoverGuard Consumer Verification)**:
  Query `is_covered` on active policy. Query `is_covered_for` with correct policy terms hash (`true`) and corrupted hash (`false`). Execute `attest(policy_id)` and verify on-chain attestation record.
