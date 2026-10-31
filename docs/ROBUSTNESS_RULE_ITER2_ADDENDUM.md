# Pre-Registered Robustness Plan Addendum: Iteration 2 Completion

This addendum formalizes the completion plan for **Prompt Iteration 2** robustness testing of `ProbeExtract` (`0x3c302641001E563ce20d4ea6376f9BfA10165877`) on GenLayer Studionet (Chain ID 61999).

In accordance with Section 1 of Prompt 7d and Rule 9 of the project brief, this document is committed to git **BEFORE** executing any fresh runs.

---

## 1. Context & Status of Iteration 2 Runs

- **Prompt SHA-256**: `90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1` (unchanged).
- **Completed Batches**:
  - `status-s1-outage-75.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s2-outage-35.md`: 10/10 parse, 10/10 match -> PASS
  - `status-s3-outage-20.md`: 10/10 parse, 10/10 match -> PASS (eliminated conversational preamble from Iteration 1)
- **Status of s4 (Batch 1)**:
  - During initial execution, Run 10 timed out during receipt polling after 140s. The transaction (`0x36fb8f2155d0028815a020ec6abffb0556628ad202b94233c9c95ef8e38b0928`) was delayed in Studionet validator voting, but subsequently reached `FINALIZED / MAJORITY_AGREE`. Its on-chain storage output was verified as `{"status":"DEGRADED","minutes":90,"quote":"Status: Degraded performance.\nDuration: 90 minutes."}`.
  - Under the strict real-time receipt polling rule, this timeout counts as an external failure attempt, giving Batch 1 9/10 in real-time execution.
  - Per Prompt 7d requirements, a fresh operational rerun batch of 10 runs (`s4_rerun`) will be executed with zero prompt changes.
  - Both Batch 1 and Batch 2 (rerun) will be recorded and displayed in the robustness table, with the fresh complete batch serving as the evidence of record for s4.
- **Unfinished Pages (s5 and s7)**:
  - Pages `status-s5-operational-reformatted.html` and `status-s7-no-duration.md` will receive their full 10 fresh runs each under the identical prompt, strict parser, and >= 7s transaction pacing.

---

## 2. Pre-Registered Rule Note

In `docs/ROBUSTNESS_RULE_ITER2.md`, the only edit made after initial registration was replacing the word "live" with "empirical" in step 6 of the decision rule to comply with repository banned word constraints. No semantic change or criteria modification was made. That file remains immutable.

---

## 3. Decision Rule Execution

Once all 6 fixture pages have their full 10-run evidence of record:
- **If all 6 pages pass (10/10 parse and >= 9/10 match)**:
  1. Apply the byte-identical prompt text to `contracts/Cover.py`.
  2. Prove SHA-256 equality with `contracts/ProbeExtract.py`.
  3. Update the prompt-hash unit test in `tests/test_layer2_mocked.py` and run full tests (`python -m unittest discover -s tests -p 'test_*.py'`).
  4. Deploy a NEW contract pair (`Cover` + `CoverGuard`) from LF source files.
  5. Record the superseded pair in `docs/ADDRESS_REGISTRY.md`.
  6. Save raw deploy receipts and extracted source code under `docs/evidence/source/` (verifying byte-for-byte empty diff).
  7. Re-run the full 39-step transaction matrix on the new addresses with real per-step balance and health readback snapshots.
- **If any page fails**:
  1. No third iteration is permitted.
  2. The current deployed pair (`0x41f8c3...` and `0x85C0F6...`) remains active.
  3. The final numbers are recorded plainly in README, LIMITATIONS, and the final report.
