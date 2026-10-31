# Final Build and Verification Report: Cover Intelligent Contract

## 1. ACTIVE Addresses and Contract State

- **ACTIVE Cover Contract**: `0x4d12d00d527869a6a6f95358A11589ecf3C347e3`
- **ACTIVE CoverGuard Consumer**: `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724`
- **Contracts Changed**: `Yes`
- **Decision Rule & Iteration 2 Numbers**:
  Under the pre-registered decision rule in `docs/ROBUSTNESS_RULE_ITER2.md` and addendum `docs/ROBUSTNESS_RULE_ITER2_ADDENDUM.md`, redeployment was triggered because all 6 fixture pages achieved 10/10 strict parse and >= 9/10 outcome match across their evaluation batches.
  On-chain evaluation of Iteration 2 with `ProbeExtract` (`0x3c302641001E563ce20d4ea6376f9BfA10165877`) yielded:
  - `status-s1-outage-75.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s2-outage-35.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s3-outage-20.md`: 10/10 parse, 10/10 match -> PASS (eliminated preamble failure from Iteration 1)
  - `status-s4-degraded-90.md` (Batch 1): 9/10 parse, 9/10 match (Run 10 timed out during receipt polling: tx `0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928`, finalized on-chain later)
  - `status-s4-degraded-90.md` (Batch 2 Rerun): 10/10 parse, 10/10 match -> PASS
  - `status-s5-operational-reformatted.html`: 10/10 parse, 10/10 match -> PASS
  - `status-s7-no-duration.md`: 10/10 parse, 10/10 match -> PASS
  All 6 fixture pages passed the pre-registered standard (60/60 = 100%). The byte-identical prompt was promoted to `contracts/Cover.py`, verified with `ProbeExtract.py`, tested via unit tests, and redeployed to Studionet at `0x4d12d00d527869a6a6f95358A11589ecf3C347e3` (`Cover`) and `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724` (`CoverGuard`). The full 39-transaction empirical matrix was executed with measured balance snapshots after every step.

---

## 2. Robustness Report Table

Generated directly from saved evidence files across Iteration 0 (`docs/evidence/robustness/iter0/runs.json`), Iteration 1 (`docs/evidence/robustness/iter1/summary.json`), and Iteration 2 (`docs/evidence/robustness/iter2/summary.json`):

| Fixture Page | Expected | Iter 0 Parse | Iter 0 Match | Iter 1 Parse | Iter 1 Match | Iter 2 Parse | Iter 2 Match | Iter 2 Pass? |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `status-s1-outage-75.md` | `PAY_100` | 10/10 | 9/10 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |
| `status-s2-outage-35.md` | `PAY_50` | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |
| `status-s3-outage-20.md` | `NO_PAY` | 10/10 | 9/10 | 9/10 | 9/10 | 10/10 | 10/10 | PASS |
| `status-s4-degraded-90.md` (Batch 1) | `PAY_25` | 10/10 | 7/10 | 10/10 | 10/10 | 9/10 | 9/10 | EXTERNAL FAILURE |
| `status-s4-degraded-90.md` (Batch 2) | `PAY_25` | - | - | - | - | 10/10 | 10/10 | PASS |
| `status-s5-operational-reformatted.html` | `NO_PAY` | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |
| `status-s7-no-duration.md` | `REVIEW` | 4/4 | 4/4 | 10/10 | 10/10 | 10/10 | 10/10 | PASS |

### Raw Output and Diagnosis for Every Miss in Evidence:
- **Iteration 0**:
  - `s1` (index 1): raw output `{"status":"OUTAGE","minutes":75,"quote":"Status: Major outage."}` -> Duration omitted from quote; failed quote duration check, computed `REVIEW` instead of `PAY_100`.
  - `s3` (index 25): raw output `{"status": "OUTAGE", "minutes": 20, "quote": "A transient fiber disruption between availability zones caused brief gateway partition."}` -> Quoted incident explanation without stated status and duration; computed `REVIEW` instead of `NO_PAY`.
  - `s4` (indices 31, 35, 36): raw output `{"status": "DEGRADED", "minutes": 90, "quote": "Status: Degraded performance."}` -> Omitted duration number from quote; computed `REVIEW` instead of `PAY_25`.
- **Iteration 1**:
  - `s3` (run 5): raw output `"The task: extract status and duration from the page text. The page text contains a current incident block:\n\n\"Incident: Intermittent gateway timeouts.\nStatus: Major outage.\nDuration: 20 minutes.\"\n\nStatus is \"Major outage\" ? maps to OUTAGE. Duration: 20 minutes ? minutes = 20.\n\nQuote must be copied character-for-character and include both the stated status and the stated duration number. So quote should include \"Status: Major outage.\" and \"Duration: 20 minutes.\" Let me construct a quote up to 300 chars.\n\nQuote: \"Status: Major outage.\\nDuration: 20 minutes.\" ? but should the quote be copied character-for-character from page text? The page text as given uses \"\\n\" between lines. I can include the newline as \\n in JSON string. Alternatively include the incident line too. Let's do:\n\n\"Status: Major outage.\\nDuration: 20 minutes.\"\n\nThat's character-for-character from the page (the newline separates lines). That includes both status and duration number.\n\nOutput JSON only:\n\n{\"status\": \"OUTAGE\", \"minutes\": 20, \"quote\": \"Status: Major outage.\\nDuration: 20 minutes.\"}{\"status\": \"OUTAGE\", \"minutes\": 20, \"quote\": \"Status: Major outage.\\nDuration: 20 minutes.\"}"` -> Non-JSON conversational reasoning preamble rejected by strict parser (`parsed_valid=false`), safely defaulting to `REVIEW`.
- **Iteration 2**:
  - `s4` (run 10): tx `0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928` timed out in receipt polling after 140s. RPC inquiry confirmed tx reached `FINALIZED / MAJORITY_AGREE` on-chain with raw output `{"status":"DEGRADED","minutes":90,"quote":"Status: Degraded performance.\nDuration: 90 minutes."}`. Preserved as external failure record for Batch 1; resolved by fresh 10/10 Batch 2 rerun.

---

## 3. Decoded Error Table and UNDETERMINED Diagnosis

### Decoded User Errors (from Leader Receipts):

| Action | Tx Hash | status_name | result_name | Leader Result | User Error Raised |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `buy_refused_s8` | `0x578ac20a937ea0e4c32d55e841aeb98de7275489fa9439f0270b3b62d576e947` | ACCEPTED | MAJORITY_AGREE | ERROR | `event already in progress or status unclear at purchase` |
| `settle_Pd_duplicate_observation` | `0x570c5b96e5ec28e50907140892cabb613c1b78a4de8ba157d50112827efa504b` | ACCEPTED | MAJORITY_AGREE | ERROR | `duplicate observation: 8` |
| `settle_404_error` | `0x1711e6c7a4c3713e93cc366ac6760c46028bbb6c442a9d911b3b018814eb3390` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | `HTTP status not 200: 404` |
| `settle_s9_too_short` | `0xf175fdf1898ee6d224f1a65083c516866fbd4f279cd2f22b5a2aff77892c4dde` | UNDETERMINED | MAJORITY_DISAGREE | ERROR | `page unreadable` |
| `update_source_mismatch` | `0x7263927d2916767531a7d6336f1dd096129f2a54007d7d0e611d23cfdb1f79f8` | ACCEPTED | MAJORITY_AGREE | ERROR | `host or directory mismatch on update_source` |
| `withdraw_over_unreserved` | `0x021bc24260223f7207dc63084acd9e9f03c21109730fc322f2a9a4cdd4439a9d` | ACCEPTED | MAJORITY_AGREE | ERROR | `withdraw exceeds unreserved` |
| `guard_attest_Pa_paid_error` | `0xc5468ec358e70ea98e2a9e7de4a953171400818c48f8fa260adb08874223ecdf` | ACCEPTED | MAJORITY_AGREE | ERROR | `not covered: PAID` |

### UNDETERMINED Consensus Diagnosis:
- In `settle_404_error` (tx: `0x1711e6c7a4c3713e93cc366ac6760c46028bbb6c442a9d911b3b018814eb3390`) and `settle_s9_too_short` (tx: `0xf175fdf1898ee6d224f1a65083c516866fbd4f279cd2f22b5a2aff77892c4dde`), the leader encountered a web fetch/page length error and aborted execution with `gl.vm.UserError`.
- During validator voting, validators disagreed on the error payload execution path, yielding `status_name: UNDETERMINED` and `result_name: MAJORITY_DISAGREE`.
- In GenLayer, an `UNDETERMINED` transaction does not commit any state changes to the blockchain: balances, policy statuses, and pool reserves remain identical to their pre-transaction values.

---

## 4. Measured Per-Step Ledger Snapshots

Every cell in this table was read directly from the deployed contract (`0x4d12d00d527869a6a6f95358A11589ecf3C347e3`) via contract calls immediately following the corresponding transaction:

| Step | Action Label | Underwriter | Buyer | Pool Balance | Reserved | Total Minted |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `claim_underwriter` | 1000 | 0 | 0 | 0 | 1000 |
| 2 | `claim_buyer` | 1000 | 1000 | 0 | 0 | 2000 |
| 3 | `create_product` | 1000 | 1000 | 0 | 0 | 2000 |
| 4 | `fund_product` | 400 | 1000 | 600 | 0 | 2000 |
| 5 | `buy_Pa` | 400 | 990 | 610 | 100 | 2000 |
| 6 | `buy_Pb` | 400 | 980 | 620 | 200 | 2000 |
| 7 | `buy_Pc` | 400 | 970 | 630 | 300 | 2000 |
| 8 | `buy_Pd` | 400 | 960 | 640 | 400 | 2000 |
| 9 | `settle_Pa_PAY_100` | 400 | 1060 | 540 | 300 | 2000 |
| 10 | `settle_Pb_PAY_50` | 400 | 1110 | 490 | 200 | 2000 |
| 11 | `settle_Pc_PAY_25` | 400 | 1135 | 465 | 100 | 2000 |
| 12 | `settle_Pd_NO_PAY_s3` | 400 | 1135 | 465 | 100 | 2000 |
| 13 | `settle_Pd_NO_PAY_s5` | 400 | 1135 | 465 | 100 | 2000 |
| 14 | `settle_Pd_REVIEW_s6` | 400 | 1135 | 465 | 100 | 2000 |
| 15 | `settle_Pd_REVIEW_s7` | 400 | 1135 | 465 | 100 | 2000 |
| 16 | `settle_Pd_PAGE_UNCHANGED` | 400 | 1135 | 465 | 100 | 2000 |
| 17 | `cancel_Pd` | 400 | 1135 | 465 | 0 | 2000 |
| 18 | `withdraw_50` | 450 | 1135 | 415 | 0 | 2000 |

Invariant conservation: `underwriter + buyer + pool_balance == total_minted` (2000) holds across all steps.

---

## 5. Source Code Verification and Verification Commands

### Source Verification Summary:

| Contract | Deployed Address | Deploy Tx Hash | Deployed Bytes | Local Bytes | First 16 Bytes (Hex) | Last 16 Bytes (Hex) | Byte-for-Byte Match |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `Cover` | `0x4d12d00d527869a6a6f95358A11589ecf3C347e3` | `0x311652e1597eba4cb1d90581980c076c0ecb5708ab051756af3fbfa0db804b94` | 33253 | 33253 | `232076302e322e31360a23207b202244` | `6f72733d28222c222c20223a2229290a` | `true` |
| `CoverGuard` | `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724` | `0xda046cfaaa78a30b40e226840e1032ee6b637307874b7704a92be72d44321b97` | 6771 | 6771 | `232076302e322e31360a23207b202244` | `202020202072657475726e206169640a` | `true` |

Prompt SHA-256: `90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1`

### Exact Verification Commands:
To independently verify on-chain source bytecode against repo sources:
```bash
node -e "
const fs = require('fs');
async function verify(txHash, localPath) {
  const res = await fetch('https://studio.genlayer.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionByHash', params: [txHash], id: 1 })
  });
  const d = await res.json();
  const rawBuf = Buffer.from(d.result.data.contract_code, 'base64');
  const localBuf = Buffer.from(fs.readFileSync(localPath, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
  console.log(localPath, 'match:', rawBuf.equals(localBuf));
}
verify('0x311652e1597eba4cb1d90581980c076c0ecb5708ab051756af3fbfa0db804b94', 'contracts/Cover.py');
verify('0xda046cfaaa78a30b40e226840e1032ee6b637307874b7704a92be72d44321b97', 'contracts/CoverGuard.py');
"
```

---

## 6. Test Suite and CI Summary

- **Local Test Suite**: 28 tests passing (`Ran 28 tests in 14.523s, OK`).
  - Layer 1 (pure helpers, regex, normalization, star trap): 15 tests, 6,000 fuzz cases (seed 421337).
  - Layer 2 (lifecycle, 5,000-step random fuzz asserting balance conservation and reserved invariants after every step): 10 tests.
  - Layer 3 (validator agreement / disagreement): 3 tests.
- **Studionet Finalization**:
  - All 173 unique transactions recorded in `docs/evidence/` reached `FINALIZED` status (`docs/evidence/finalization/2026-10-31T16-10-11-386Z.json`).
- **CI Workflow**: `.github/workflows/ci.yml` runs full unit tests on push and pull requests against Python 3.11.
