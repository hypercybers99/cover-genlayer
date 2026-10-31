# Final Build and Verification Report: Cover Intelligent Contract

## 1. ACTIVE Addresses and Contract State

- **ACTIVE Cover Contract**: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
- **ACTIVE CoverGuard Consumer**: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`
- **Contracts Changed**: `No`
- **Decision Rule & Iteration 2 Numbers**:
  Under the pre-registered decision rule in `docs/ROBUSTNESS_RULE_ITER2.md`, redeployment required all 6 fixture pages to achieve 10/10 strict parse and >= 9/10 outcome match.
  On-chain evaluation of Iteration 2 with `ProbeExtract` (`0x3c302641001E563ce20d4ea6376f9BfA10165877`) yielded:
  - `status-s1-outage-75.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s2-outage-35.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s3-outage-20.md`: 10/10 parse, 10/10 match -> PASS (eliminated preamble failure from Iteration 1)
  - `status-s4-degraded-90.md`: 9/10 parse, 9/10 match -> FAIL (Run 10 timed out due to Studionet network consensus stall: tx `0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928` stuck in `PROPOSING / NO_MAJORITY`)
  - `status-s5-operational-reformatted.html`: not measured (network stall prevented completing batch)
  - `status-s7-no-duration.md`: not measured (network stall prevented completing batch)
  Because the pre-registered pass rule was not met across all pages, no redeployment was executed. The active deployment remains on the fully verified Iteration 1 pair (`0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd` and `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`), whose complete 39-step transaction matrix and source code fidelity are proven.

---

## 2. Robustness Report Table

Generated directly from saved evidence files across Iteration 0 (`docs/evidence/robustness/iter0/runs.json`), Iteration 1 (`docs/evidence/robustness/iter1/summary.json`), and Iteration 2 (`docs/evidence/robustness/iter2/summary.json`):

| Fixture Page | Expected | Iter 0 Parse | Iter 0 Match | Iter 1 Parse | Iter 1 Match | Iter 2 Parse | Iter 2 Match | Iter 2 Pass? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `status-s1-outage-75.md` | `PAY_100` | 10/10 | 9/10 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |
| `status-s2-outage-35.md` | `PAY_50` | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |
| `status-s3-outage-20.md` | `NO_PAY` | 10/10 | 9/10 | 9/10 | 9/10 | 10/10 | 10/10 | PASS |
| `status-s4-degraded-90.md` | `PAY_25` | 10/10 | 7/10 | 10/10 | 10/10 | 9/10 | 9/10 | FAIL |
| `status-s5-operational-reformatted.html` | `NO_PAY` | 10/10 | 10/10 | 10/10 | 10/10 | not measured | not measured | FAIL |
| `status-s7-no-duration.md` | `REVIEW` | 4/4 | 4/4 | 10/10 | 10/10 | not measured | not measured | FAIL |

### Raw Output and Diagnosis for Every Miss in Evidence:
- **Iteration 0**:
  - `s1` (index 1): raw output `{"status":"OUTAGE","minutes":75,"quote":"Status: Major outage."}` -> Duration omitted from quote; failed quote duration check, computed `REVIEW` instead of `PAY_100`.
  - `s3` (index 25): raw output `{"status": "OUTAGE", "minutes": 20, "quote": "A transient fiber disruption between availability zones caused brief gateway partition."}` -> Quoted incident explanation without stated status and duration; computed `REVIEW` instead of `NO_PAY`.
  - `s4` (indices 31, 35, 36): raw output `{"status": "DEGRADED", "minutes": 90, "quote": "Status: Degraded performance."}` -> Omitted duration number from quote; computed `REVIEW` instead of `PAY_25`.
- **Iteration 1**:
  - `s3` (run 5): raw output `"The task: extract status and duration from the page text. The page text contains a current incident block:\n\n\"Incident: Intermittent gateway timeouts.\nStatus: Major outage.\nDuration: 20 minutes.\"\n\nStatus is \"Major outage\" ? maps to OUTAGE. Duration: 20 minutes ? minutes = 20.\n\nQuote must be copied character-for-character and include both the stated status and the stated duration number. So quote should include \"Status: Major outage.\" and \"Duration: 20 minutes.\" Let me construct a quote up to 300 chars.\n\nQuote: \"Status: Major outage.\\nDuration: 20 minutes.\" ? but should the quote be copied character-for-character from page text? The page text as given uses \"\\n\" between lines. I can include the newline as \\n in JSON string. Alternatively include the incident line too. Let's do:\n\n\"Status: Major outage.\\nDuration: 20 minutes.\"\n\nThat's character-for-character from the page (the newline separates lines). That includes both status and duration number.\n\nOutput JSON only:\n\n{\"status\": \"OUTAGE\", \"minutes\": 20, \"quote\": \"Status: Major outage.\\nDuration: 20 minutes.\"}{\"status\": \"OUTAGE\", \"minutes\": 20, \"quote\": \"Status: Major outage.\\nDuration: 20 minutes.\"}"` -> Non-JSON conversational reasoning preamble rejected by strict parser (`parsed_valid=false`), safely defaulting to `REVIEW`.
- **Iteration 2**:
  - `s4` (run 10): tx `0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928` timed out in receipt polling after 140s. RPC inquiry confirmed tx reached `PROPOSING / NO_MAJORITY` due to Studionet network validator stall. Preserved as external failure record.

---

## 3. Decoded Error Table and UNDETERMINED Diagnosis

### Decoded User Errors (from Leader Receipts):

| Action | Tx Hash | status_name | result_name | Leader Result | Decoded User Error String |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `buy_refused_s8` | `0x0b9a8da907ceb716e470812ea58991227165309c0f5d14bab5dff22e29a1c7e0` | ACCEPTED | MAJORITY_AGREE | ERROR | `event already in progress or status unclear at purchase` |
| `settle_Pd_duplicate_observation` | `0x407f195d936281afc075f98630364c028008bd5f06fd059c3f330949549278fc` | ACCEPTED | MAJORITY_AGREE | ERROR | `duplicate observation: 8` |
| `settle_404_error` | `0x943863525e44c8a927be4d9dc978126e4ce8bbf190449a6232196a55c17294a1` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | `HTTP status not 200: 404` |
| `settle_s9_too_short` | `0xdbaa2adc7afbf50dcab27d429eb9a7c20d74cf31092c44f0529411da707d06e7` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | `page unreadable` |
| `update_source_mismatch` | `0x7e5d94cc7b58998639f0d318bb70ee0bdff5e078a746ca3b040f3f36f87570b4` | ACCEPTED | MAJORITY_AGREE | ERROR | `host or directory mismatch on update_source` |
| `withdraw_over_unreserved` | `0x396571b5ecd24203250a6581365276e5be9d0233c8d551767f637e2cdd396f04` | ACCEPTED | MAJORITY_AGREE | ERROR | `withdraw exceeds unreserved` |
| `guard_attest_Pa_paid_error` | `0xf426d1a4294681ef640557d23d5e6d1f597563854b6fa993fe459d3f4c13775e` | ACCEPTED | MAJORITY_AGREE | ERROR | `not covered: PAID` |

### UNDETERMINED Consensus Diagnosis:
Inspection of the raw consensus payloads for `settle_404_error` and `settle_s9_too_short`:
- In both cases, the leader node correctly fetched the page inside `gl.vm.run_nondet` and raised the expected UserError (`HTTP status not 200: 404` and `page unreadable`).
- In both cases, the consensus receipt contains votes: `{ '0x9c182d...': 'disagree', '0xcab45e...': 'disagree', '0xe06a34...': 'disagree', ... }`.
- Inspection of validator receipts reveals that Validator 1 executed identically and raised the exact same error (`result: { status: 'rollback', payload: 'HTTP status not 200: 404' }` / `payload: 'page unreadable'`), but voted `disagree` against the leader proposal.
- In GenLayer consensus architecture, whenever a transaction terminates in `UNDETERMINED` or consensus disagreement, no state transition occurs. Contract balances, policy records, and pool reserves remain identical before and after the transaction.

---

## 4. Empirical Evidence Matrix & Per-Step Balances

All 39 transactions executed against `Cover` (`0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`) and `CoverGuard` (`0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`):

| Step | Action | Tx Hash | status_name | result_name | leader_result | Stored Gate | Stored Outcome | Underwriter | Buyer | Pool | Reserved | Total Minted |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `claim_demo_credits_underwriter` | `0x73ab2a99...ac0c22c0` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 1000 | 0 | 0 | 0 | 1000 |
| 2 | `claim_demo_credits_buyer` | `0x5bb3e792...7a4d8624` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 1000 | 1000 | 0 | 0 | 2000 |
| 3 | `create_product` | `0xe850f3cb...d54ddfa1` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 1000 | 1000 | 0 | 0 | 2000 |
| 4 | `fund_product` | `0x26473854...8beef277` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1000 | 600 | 0 | 2000 |
| 5 | `buy_policy_Pa` | `0xe327c2d6...e21229a2` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 990 | 610 | 100 | 2000 |
| 6 | `buy_policy_Pb` | `0x8c821f18...3ce1eb5b` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 980 | 620 | 200 | 2000 |
| 7 | `buy_policy_Pc` | `0xb454d391...120ea0dc` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 970 | 630 | 300 | 2000 |
| 8 | `buy_policy_Pd` | `0x79155320...f809badb` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 9 | `update_source_s8` | `0x2d43b11a...874d0d7c` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 10 | `buy_refused_s8` | `0x0b9a8da9...29a1c7e0` | ACCEPTED | MAJORITY_AGREE | ERROR | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 11 | `update_source_s0` | `0x0a5b8afb...531e5984` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 12 | `guard_attest_Pa_before` | `0xbbe012ee...28fc878b` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 13 | `update_source_s1` | `0x9f021772...32dd839d` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 960 | 640 | 400 | 2000 |
| 14 | `settle_Pa_s1_PAY_100` | `0x33143d04...39d0ce21` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | PAY_100 | 400 | 1060 | 540 | 300 | 2000 |
| 15 | `update_source_s2` | `0x64a2d268...f31f2c32` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1060 | 540 | 300 | 2000 |
| 16 | `settle_Pb_s2_PAY_50` | `0xa290a989...d625fd17` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | PAY_50 | 400 | 1110 | 490 | 200 | 2000 |
| 17 | `update_source_s4` | `0xe3ec2527...b514c524` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1110 | 490 | 200 | 2000 |
| 18 | `settle_Pc_s4_PAY_25` | `0x7ceac640...7a8a8367` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | PAY_25 | 400 | 1135 | 465 | 100 | 2000 |
| 19 | `update_source_s3` | `0xc31d21cd...830544f7` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 20 | `settle_Pd_s3_NO_PAY` | `0x24bbe917...b3d3e9fd` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | NO_PAY | 400 | 1135 | 465 | 100 | 2000 |
| 21 | `update_source_s5` | `0x921ed5e5...777a331d` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 22 | `settle_Pd_s5_NO_PAY` | `0x04dd63bf...28d6b5ec` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | NO_PAY | 400 | 1135 | 465 | 100 | 2000 |
| 23 | `update_source_s6` | `0x78e1b70d...f64a2d55` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 24 | `settle_Pd_s6_REVIEW_tripwire` | `0x81efa427...a0e95873` | ACCEPTED | MAJORITY_AGREE | SUCCESS | TRIPWIRE | REVIEW | 400 | 1135 | 465 | 100 | 2000 |
| 25 | `update_source_s7` | `0xf0ad2084...325cfe94` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 26 | `settle_Pd_s7_REVIEW_no_duration` | `0xa7f8dbe0...6a798fc2` | ACCEPTED | MAJORITY_AGREE | SUCCESS | JUDGED | REVIEW | 400 | 1135 | 465 | 100 | 2000 |
| 27 | `update_source_s0_again` | `0x42b1fa05...65e95774` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 28 | `settle_Pd_s0_PAGE_UNCHANGED` | `0xb5f21ae4...f13e832c` | ACCEPTED | MAJORITY_AGREE | SUCCESS | PAGE_UNCHANGED | NO_PAY | 400 | 1135 | 465 | 100 | 2000 |
| 29 | `settle_Pd_duplicate_observation` | `0x407f195d...549278fc` | ACCEPTED | MAJORITY_AGREE | ERROR | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 30 | `update_source_404` | `0x0dd8ed2d...510fc205` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 31 | `settle_404_error` | `0x94386352...c17294a1` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 32 | `update_source_s9` | `0x7db67faf...8b34f2dc` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 33 | `settle_s9_too_short` | `0xdbaa2adc...707d06e7` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 34 | `update_source_mismatch` | `0x7e5d94cc...f87570b4` | ACCEPTED | MAJORITY_AGREE | ERROR | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 35 | `restore_source_s0` | `0x9f2dd2a8...b4359d70` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 100 | 2000 |
| 36 | `cancel_policy_Pd` | `0xc939f7a8...e3d3434f` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 400 | 1135 | 465 | 0 | 2000 |
| 37 | `withdraw_unreserved` | `0xc0ff8250...3848c1c8` | ACCEPTED | MAJORITY_AGREE | SUCCESS | n/a | n/a | 450 | 1135 | 415 | 0 | 2000 |
| 38 | `withdraw_over_unreserved` | `0x396571b5...dd396f04` | ACCEPTED | MAJORITY_AGREE | ERROR | n/a | n/a | 450 | 1135 | 415 | 0 | 2000 |
| 39 | `guard_attest_Pa_paid_error` | `0xf426d1a4...4c13775e` | ACCEPTED | MAJORITY_AGREE | ERROR | n/a | n/a | 450 | 1135 | 415 | 0 | 2000 |

### Ledger and Solvency Invariants:
- **Global Conservation**: `Underwriter (450) + Buyer (1135) + Pool (415) == 2000 == total_minted` across every step.
- **Product Solvency**: `reserved (0) <= pool_balance (415)` holds at every step.
- **Reserved Coverage Equality**: `reserved == sum(coverage of ACTIVE policies)` holds at every step (`400` during active policies, `0` post settlement and cancellation).
- **CoverGuard Cross-Contract Invariant**:
  - Before Settlement: `is_covered("1")` returned `{"coverage": "100", "covered": "true", "policy_status": "ACTIVE", "reason": "OK"}`.
  - After Settlement: `is_covered("1")` returned `{"coverage": "100", "covered": "false", "policy_status": "PAID", "reason": "PAID"}`.
  - `attest("1")` reverted with UserError `not covered: PAID`.

---

## 5. Deployment Evidence & Source Verification

- **`Cover`**:
  - Address: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
  - Deploy Tx: `0xa1716bdbd49effa2e7bb7d2330ea8cb3f1162c5020cb921f980335255a3b7492`
  - Source SHA-256: `33e8661c77e8042cc6bf1166e4bde8293e0948e1215d2e39721d6a8fb844e8b0`
  - Deployed First 16 Bytes: `232076302e322e31360a23207b202244`
  - Deployed Last 16 Bytes: `6f72733d28222c222c20223a2229290a`
  - Length: 32,953 bytes | Binary diff against `contracts/Cover.py`: Empty (exact match)
- **`CoverGuard`**:
  - Address: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`
  - Deploy Tx: `0xa7ece9780281e84f6d118de02b14a62cbe9abe9d73b5068521fa36d85f7ee101`
  - Source SHA-256: `b2682e9e48b67a0ac95148b25d0e10694fad671359144d2b79368f8b921f7d53`
  - Deployed First 16 Bytes: `232076302e322e31360a23207b202244`
  - Deployed Last 16 Bytes: `202020202072657475726e206169640a`
  - Length: 6,771 bytes | Binary diff against `contracts/CoverGuard.py`: Empty (exact match)

---

## 6. Finalization Summary, Tests, Scans, CI, and Git State

### Finalization Summary (from `docs/evidence/finalization/2026-10-31T09-13-12-565Z.json`):
- Total Transaction Hashes Checked: 143
- Counts by status_name:
  - `FINALIZED`: 141
  - `PROPOSING`: 1 (tx `0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928`)
  - `ACCEPTED`: 1 (tx `0x5a07cdac46358fcf915dc845d43720c3ce7c98ecc99cc13e87375883d6e42bcc`)

### Layered Test Suite Execution:
```text
............................
----------------------------------------------------------------------
Ran 28 tests in 12.111s

OK

Fuzzing decide with seed: 421337
```
- Total Tests: 28 passing (100% pass rate).
- Invariant fuzzing: 5,000 steps of random lifecycle mutations verifying credit conservation, solvency, and reserved coverage equality after every step.
- Helper fuzzing: 6,000 fuzz cases (seed `421337`).

### Repository Scans:
- Banned Words Scan: 0 occurrences of forbidden words across all codebase files.
- Pure ASCII Verification: All Python contracts contain only ASCII bytes (range 0-127).

---

## 7. Non-Measured Features and Deviations

1. **Iteration 2 Pages `s5` and `s7`**:
   Marked plainly as `not measured` because Studionet network consensus stalled on transaction proposals during the `s4` Run 10 evaluation, preventing fresh transaction inclusion.
2. **Deterministic Time Expiration**:
   GenVM on Studionet provides no on-chain block timestamp; automated policy time expiration is not measured and was deliberately excluded in accordance with the project brief.
