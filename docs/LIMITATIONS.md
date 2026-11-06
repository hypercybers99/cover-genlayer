# Cover Limitations

This document is maintained as part of Step 0 and updated across development milestones.
It records design trade-offs, scope boundaries, and operational constraints of the Cover intelligent contract.

---

## 1. Credit Ledger Model (No Real Money)
- **Credits Only**: All balances, premiums, pool reserves, and settlement payouts are recorded on an internal contract ledger.
- **No Token Locks**: No ERC-20, native GEN tokens, or real assets are escrowed, transferred, or locked by the contract.
- **Not Regulated Insurance**: Cover is a computational experiment demonstrating multi-validator parametric settlement on GenLayer. It does not constitute an insurance policy, warranty, or financial product.

## 2. Status Page Constraints and Trust Model
- **Provider-Authored Data**: Cover evaluates the public status page authored by the dependency provider. Cover verifies whether the provider *admitted* an outage in text; it does not independently probe the provider's infrastructure or network ports.
- **Single Incident Block with Explicit Minutes**: The contract parser is designed to extract an explicit integer duration stated in minutes (e.g. "Duration: 75 minutes") for a single current incident. Status pages that only report ISO timestamps, clock times (e.g. "10:15 UTC to 11:30 UTC"), or multi-incident tables without duration fail safe to `REVIEW` with zero payout.
- **JavaScript and Dynamic Rendering Unsupported**: GenLayer validators fetch raw HTTP responses via `gl.nondet.web.get`. Pages that require client-side JavaScript execution (SPAs), authentication cookies, CAPTCHAs, or headless browsers are unsupported and will trigger fetch/length UserErrors.
- **English-First Language Task**: Incident extraction prompts are formatted in English. Non-English status pages may produce unparseable responses or tripwires, triggering safe `REVIEW`.

## 3. Policy Lifecycle and Timing Boundaries
- **No On-Chain Clock**: GenVM on studionet does not expose a real-time block timestamp. Consequently, Cover policies do not have an automated expiration timestamp or waiting period; the explicit term is `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`.
- **Buy-Time Gate Protection**: Protection against retroactive claims (buying cover during an ongoing incident) is enforced by the buy-time validator check, which reads the current status page and refuses purchase if status is not `OPERATIONAL`.
- **Page-Changed Gate**: If `settle` is called when the page text has the exact same normalized hash as recorded at purchase time (`buy_norm_hash16`), Cover immediately resolves to `NO_PAY` without invoking the LLM.
- **No Premium Refund on Cancellation**: If a policyholder invokes `cancel`, the policy enters `CANCELLED` status and unreserves coverage, but the upfront premium is retained in the underwriter pool (`cancel_refund = "0"`).
- **Multiple Settlement Attempts**: A settlement yielding `NO_PAY` or `REVIEW` leaves the policy in `ACTIVE` status so that genuine subsequent outages can be settled. However, repeated identical observations (same policy ID and normalized page hash) are rejected with a duplicate observation UserError.

## 4. Underwriter Privileges and Scope of update_source
- **Source URL Updates Apply Only to Future Policies**: In Cover V2, calling `update_source` updates the product's living status feed for policies bought *after* the update. Existing policies remain permanently bound to their purchase-time evidence URL and thresholds.
- **Host and Directory Matching**: New URLs passed to `update_source` must share the exact hostname and directory path validated at product creation time. Every settlement records both `evidence_url` and `url_used` mirroring the policy-bound URL.

## 5. Model Variance and Consensus Threshold
- **Multi-Validator Majority Consensus**: Non-deterministic execution runs across independent GenLayer validators. By comparing only the strict consensus token `<OUTCOME>|<norm_hash16>`, validators remain unaffected by minor differences in leader-extracted quotes or explanation phrasing.
- **Conservative Fail-Safe**: Any model hallucination, unparseable output, duplicate JSON keys, or injection trigger safely collapses to `REVIEW` (zero payout, policy remains active).

## 6. Empirical Robustness Limitations (Iteration 1 & Iteration 2)
- **Occasional LLM Chain-of-Thought / Prose Output**: In empirical testing across 60 on-chain runs on Studionet (Iteration 1), 59 runs (98.3%) parsed strictly as JSON and matched the pre-registered target outcome. On fixture `status-s3-outage-20.md`, 1 out of 10 runs (Run 5) outputted conversational chain-of-thought text before appending JSON.
- **Fail-Safe Operation**: When this occurred, the strict schema parser rejected the non-JSON preamble (`valid = false`), and the deterministic contract logic safely defaulted to `REVIEW` with zero payout. While this maintains complete fund safety (no erroneous payout), `status-s3-outage-20.md` missed the pre-registered 10/10 strict parse threshold (achieving 9/10 parse, 9/10 outcome match).
- **Prompt Iteration 2 Results**: Iteration 2 added explicit framing instructions (`"Your whole response must be the JSON object and nothing else: the first character is { and the last is }."`). Evaluated on-chain with `ProbeExtract` (`0x3c302641001E563ce20d4ea6376f9BfA10165877`), `status-s3-outage-20.md` achieved 10/10 parse and 10/10 match, eliminating conversational preamble. However, on `s4`, Run 10 timed out due to network consensus stalling (`PROPOSING / NO_MAJORITY`), leaving `s4` at 9/10. Because the pre-registered rule required 10/10 on every page, the active deployment remains on the proven Iteration 1 pair.

## 7. Web Fetch Consensus Behavior on Missing or Short Pages
- **Missing or Too-Short Pages End UNDETERMINED**: When `settle` is invoked against an HTTP 404 URL or a page with fewer than 200 cleaned characters (`status-s9-too-short.md`), GenLayer validator nodes independently execute `gl.nondet.web.get` inside the nondet block. Because the leader node raises an error rollback within the nondet block, validator consensus resolves as `UNDETERMINED / MAJORITY_DISAGREE` with `leader_result = ERROR`.
- **Contract State Invariant**: In GenLayer, transactions resulting in `UNDETERMINED` or consensus disagreement cause no state transition on-chain. Contract storage, policy status, balances, and pool reserves remain completely unchanged before and after the call.
