# Integration Guide: Cover & CoverGuard V2

This guide provides frontend and smart contract developers with the technical specification for integrating with `Cover` (V2) and `CoverGuard` (V2) on GenLayer Studionet.

---

## 1. Network & Active Contract Addresses

- **Network**: GenLayer Studionet
- **Chain ID**: 61999
- **RPC Endpoint**: `https://studio.genlayer.com/api`
- **Client SDK**: `genlayer-js@^1.1.8`
- **Active Contracts**:
  - **`Cover` (V2)**: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
    - Explorer: [https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3](https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3)
  - **`CoverGuard` (V2)**: `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`
    - Explorer: [https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A](https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A)

---

## 2. Public Methods: `Cover` (V2)

### Writes
1. `claim_demo_credits() -> str`:
   - Claims 1,000 demo credits (one claim per address).
2. `create_product(name: str, url: str, min_full: int, min_half: int, premium_bps: int) -> str`:
   - Creates a cover product with deterministic terms hash and explicit term `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`.
   - Returns string `product_id`.
3. `fund_product(product_id: str, amount: int) -> None`:
   - Underwriter deposits credits into the product payout pool.
4. `withdraw_unreserved(product_id: str, amount: int) -> None`:
   - Creator withdraws unreserved credits from the pool (`amount <= pool_balance - reserved`).
5. `update_source(product_id: str, new_url: str) -> None`:
   - Updates target status page URL for future policies (host and directory path must match immutable product terms).
   - Does NOT alter evidence source for existing policies.
6. `buy(product_id: str, coverage: int) -> str`:
   - Purchases cover policy. Copies purchase-time terms, thresholds, and evidence URL permanently into policy record.
   - Returns string `policy_id`.
7. `settle(policy_id: str) -> str`:
   - Evaluates policy against strictly its purchase-time evidence URL and thresholds.
   - Returns string `outcome` (`PAY_100`, `PAY_50`, `PAY_25`, `NO_PAY`, `REVIEW`).
8. `cancel(policy_id: str) -> None`:
   - Holder cancels active policy. Reserved pool coverage is released to free liquidity; premium stays in pool.

### Views
- `balance_of(addr: str) -> str`: Decimal string credit balance.
- `get_product(product_id: str) -> str`: JSON product record.
- `list_products(limit: int = 10) -> list[str]`: Bounded list of product JSON records (limit <= 20).
- `get_policy(policy_id: str) -> str`: JSON policy record.
- `list_policies_by_holder(addr: str, limit: int = 10) -> list[str]`.
- `list_policies_by_product(product_id: str, limit: int = 10) -> list[str]`.
- `get_settlement(settlement_id: str) -> str`: JSON settlement record.
- `pool_health(product_id: str) -> str`: Returns `{"pool_balance", "reserved", "free", "coverage_ratio_bps"}`.
- `quote_premium(coverage: int, premium_bps: int) -> str`: Pure premium calculation.
- `get_stats() -> str`: Platform counts (`total_minted`, `next_product`, `next_policy`, `next_settlement`).
- `get_limits() -> str`: Contract parameters and thresholds.

---

## 3. Public Methods: `CoverGuard` (V2)

### Views
1. `is_covered(holder: str, policy_id: str) -> str`:
   - Returns JSON: `{"covered": "true"|"false", "reason": "OK"|"NOT_HOLDER"|"NO_POLICY"|"PAID"|"CANCELLED"|"POOL_SHORT", "policy_status": "ACTIVE"|"PAID"|"CANCELLED", "coverage": "...", "product_id": "...", "terms_hash": "..."}`.
2. `is_covered_for(holder: str, policy_id: str, product_id: str, terms_hash: str, min_coverage: int) -> bool`:
   - Verifies holder, policy status is `"ACTIVE"`, `product_id` matches, policy coverage >= `min_coverage`, pool solvency >= coverage, and policy purchase-time `terms_hash` matches provided hash.
   - Returns boolean `true` or `false`.
3. `get_attestation(attestation_id: str) -> str`:
   - Returns JSON attestation record containing `id`, `attester`, `policy_id`, `product_id`, `coverage`, `terms_hash`, and `evidence_url_hash`.
4. `list_attestations(addr: str, limit: int = 10) -> list[str]`:
   - Returns list of JSON attestation records for address.

### Writes
1. `attest(policy_id: str) -> str`:
   - Attests active coverage for caller. Binds to policy purchase-time `terms_hash` and SHA-256 hash of policy `evidence_url`.
   - Returns string `attestation_id`.

---

## 4. Code Sample: Verification via `CoverGuard`

```javascript
import { createClient, chains } from "genlayer-js";

const COVER_GUARD_ADDRESS = "0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A";

async function verifyCoverage(client, holderAddress, policyId, productId, termsHash, minCoverage) {
  const isCovered = await client.readContract({
    address: COVER_GUARD_ADDRESS,
    functionName: "is_covered_for",
    args: [
      holderAddress,
      String(policyId).trim(),
      String(productId).trim(),
      termsHash,
      Number(minCoverage),
    ],
  });

  return Boolean(isCovered);
}
```

---

## 5. Receipt Verification Rule

A write transaction is successful **only if**:
```javascript
const isSuccess = (
  (receipt.status_name === "ACCEPTED" || receipt.status_name === "FINALIZED") &&
  receipt.result_name === "MAJORITY_AGREE" &&
  receipt.consensus_data?.leader_receipt?.[0]?.execution_result === "SUCCESS"
);
```
