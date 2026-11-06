# Final Verification Report: Cover V2

> **Status: Preview (studionet)**

---

## 1. Deployed Addresses & Contract Identity

| Contract | Active Address | Deploy Transaction Hash | Deploy Latency | Local Source File | Source SHA-256 |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `Cover` (V2) | `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3` | `0x3f4ef296da9e609ba83dc5ed5c866910e26fd7eb9055273142683618b5e8a8a8` | 8.78 s | `contracts/CoverV2.py` | `0b2f91d2b64dee1dce4aa13c15c19c274546dd64fff8b738325067c37a12b296` |
| `CoverGuard` (V2) | `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A` | `0xdecd58ff74a091ed5b1e7ddb8f188402d1e06ebf92517147cb92199e14fd0b3e` | 5.83 s | `contracts/CoverGuardV2.py` | `e0546c62266e7ab13b0aaa70489ada2625849742f004cb21732aaef03cd901a1` |

- **Extraction Prompt SHA-256**: `5a8c842c53e4329313d349afa6932672980dd1e8466af75118eeb8df010daa1d`
- **Parse Extraction SHA-256**: `c44e054a7af6a9abb30fbc536895ce61532bf2edf016497d23a53ab094370978`
- **Source Byte-for-Byte Diff**: Empty (MATCH) for both `CoverV2` and `CoverGuardV2` against raw deploy transaction payloads.

---

## 2. Pre-Deploy Regression Test Suite (38/38 Pass)

### Test Suite Layer Breakdown

| Layer | Description | Test File | Test Count | Status |
| :--- | :--- | :--- | :--- | :--- |
| Layer 1 | Pure Helpers & Parsing Logic | `tests/test_pure_helpers.py` | 12 | 12/12 PASS |
| Layer 1 | Adversarial Star-Trap Insurer Traps | `tests/test_star_trap.py` | 4 | 4/4 PASS |
| Layer 2 | Mocked Contract VM Execution | `tests/test_layer2_mocked.py` | 10 | 10/10 PASS |
| Layer 3 | Multi-Validator Consensus Simulator | `tests/test_layer3_consensus.py` | 3 | 3/3 PASS |
| Layer 4 | V2 Review Regression & Policy Binding | `tests/test_v2_regression.py` | 9 | 9/9 PASS |
| **Total** | **Combined Python Regression Suite** | **All 5 Test Suites** | **38** | **38/38 PASS** |

```
tests/test_layer2_mocked.py::TestLayer2Mocked::test_5000_sequence_fuzz PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_all_user_error_strings PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_buy_and_settle_lifecycle PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_claim_demo_credits PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_cover_guard_checks_and_attestation PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_cover_guard_reason_table PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_decide_parity_20_cases PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_fund_and_solvency_invariants PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_product_validation_errors PASSED
tests/test_layer2_mocked.py::TestLayer2Mocked::test_update_source_cases PASSED
tests/test_layer3_consensus.py::TestLayer3Consensus::test_validators_with_different_hashes_disagree PASSED
tests/test_layer3_consensus.py::TestLayer3Consensus::test_validators_with_different_outcomes_disagree PASSED
tests/test_layer3_consensus.py::TestLayer3Consensus::test_validators_with_identical_tokens_agree PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_clean_text_html PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_clean_text_markdown PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_decide_logic PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_fuzz_decide PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_injection_tripwire PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_norm_text_digits_preserved PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_number_in_quote PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_premium_and_payout PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_prompt_sha256 PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_quote_in_page_token_boundaries PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_strict_parser PASSED
tests/test_pure_helpers.py::TestPureHelpers::test_validate_product_url PASSED
tests/test_star_trap.py::TestStarTrap::test_b1_keyword_insurer_fails_where_cover_succeeds PASSED
tests/test_star_trap.py::TestStarTrap::test_b2_trusting_insurer_fails_where_cover_succeeds PASSED
tests/test_star_trap.py::TestStarTrap::test_b3_hash_insurer_fails_where_cover_succeeds PASSED
tests/test_star_trap.py::TestStarTrap::test_property_cosmetic_edits_preserve_outcome PASSED
tests/test_v2_regression.py::TestV2Regression::test_a_buy_update_source_settle_reads_purchase_url PASSED
tests/test_v2_regression.py::TestV2Regression::test_b_two_policies_different_source_urls PASSED
tests/test_v2_regression.py::TestV2Regression::test_c_terms_hash_stability_and_sensitivity PASSED
tests/test_v2_regression.py::TestV2Regression::test_d_create_product_return_value_equals_stored_id PASSED
tests/test_v2_regression.py::TestV2Regression::test_e_coverguard_is_covered_for_terms_hash_mismatch PASSED
tests/test_v2_regression.py::TestV2Regression::test_f_attest_stores_policy_terms_and_evidence_url_hash PASSED
tests/test_v2_regression.py::TestV2Regression::test_g_pure_helper_parity_decide PASSED
tests/test_v2_regression.py::TestV2Regression::test_h_ledger_invariant_fuzz_5000_ops PASSED
tests/test_v2_regression.py::TestV2Regression::test_i_direct_mode_mock_web_response_fixtures PASSED
```

---

## 3. Review Defects Reproduction and Resolution

All six reviewer findings identified in V1 were reproduced prior to implementation (`docs/review_v2/before/`) and resolved in V2 (`docs/review_v2/after/`):

| Defect | Finding Description | Pre-V2 Behavior (Reproduced) | V2 Resolution (Verified) |
| :--- | :--- | :--- | :--- |
| **Defect 1** | Policy unbound to purchase-time terms | `settle` re-read current product terms and URL; `update_source` mutated active policy evaluation. | Policy records immutable `terms_hash`, `evidence_url`, `min_full`, `min_half`, `term`, `decision_rule`. Settle reads policy record exclusively. |
| **Defect 2** | Unused decision rule & missing 25% threshold | `DECISION_RULE` text ignored by VM; no 25% partial payout for DEGRADED state. | Rule text embedded in `terms_hash`; deterministic 25% payout implemented when `DEGRADED >= min_full`. |
| **Defect 3** | App create product form missing term inputs | Form had hardcoded 25% rate and omitted term configuration. | App provides explicit term and threshold inputs; enforces policy purchase-time binding. |
| **Defect 4** | Hardcoded fund product ID race condition | App assumed ID=1 on creation, causing race under multi-user execution. | `create_product` returns assigned product ID; funding calls use the exact returned ID. |
| **Defect 5** | Type mismatches between app and contracts | TypeScript interfaces diverged from Python contract JSON schemas. | Golden TypeScript interfaces aligned byte-for-byte with contract schema fields. |
| **Defect 6** | CoverGuard view signature mismatch & attest terms source | `is_covered_for` took 2 arguments instead of 5; attest read current product terms. | `is_covered_for` asserts exact 5-tuple; attest records purchase-time `terms_hash` and `evidence_url_hash`. |

---

## 4. Report Discrepancy Clarification & Unverifiable Draft Hashes

An early chat draft report generated during preliminary analysis referenced 14 transaction hashes that do not exist on-chain and have no corresponding receipt files in the repository.

### On-Chain Verification of Draft Hashes

To verify these tokens empirically, an on-chain verification script queried the GenLayer Studionet RPC (`https://studio.genlayer.com/api`, chain 61999) via `eth_getTransactionByHash` for all 14 draft hashes at 2026-11-06T19:59:29Z. All 14 queries returned `null`, proving that no such transactions were mined on the network.

The disposition of these 14 hashes is formally classified as **"invented or unverifiable, removed"** and documented in `docs/evidence_v2/unverifiable_draft_hashes.json`. The table below records the full audit trail:

| # | Step Label | Function | Draft Tx Hash | On-Chain Lookup | Status | Canonical Tx Hash |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `s3_buy_policy_3` | `buy` | `0x577a469bbcf9620573be04fdd1f7f0e6988863bb53e02aa894458f278ebaa901` | `null` | REMOVED_UNVERIFIABLE | `0x6d33addd6edd78a3825a7b3025af78430dc1db907ce7c3b1bca728314b261978` |
| 2 | `s3_settle_policy_3_s0` | `settle` | `0xc406be02720d2c67672ec432768595914fa7d1059f7b32c694a1d471e469c823` | `null` | REMOVED_UNVERIFIABLE | None (No equivalent executed) |
| 3 | `s4_withdraw_within_unreserved` | `withdraw_unreserved` | `0x0eb3a77618520cfc3e80f4f9f7ba30807c4b4a15a0c946bf8b849688ae5e9e03` | `null` | REMOVED_UNVERIFIABLE | `0x944a172051c49354f4ea678c6243577060ee4a79a22e05496e7cd59724a9f068` |
| 4 | `s4_over_withdraw_rejected` | `withdraw_unreserved` | `0x7cb51a2d4806a62453c5f4922ca9583b28b74a3875323a67d9834193582496d0` | `null` | REMOVED_UNVERIFIABLE | `0x7726333d18fae70725065c5732739944eb622bf2f973b0f00fb511d6471ff16d` |
| 5 | `s4_duplicate_observation_error` | `settle` | `0xd1f3e7eeb5584bf3ea094ba49d7994fa7a00d057793b8279ceae5746b5a32dbb` | `null` | REMOVED_UNVERIFIABLE | `0x8d7884a96c104d95b9894201067d64307f048636dd256ffe03ead94fd1836c46` |
| 6 | `s4_unknown_policy_settle` | `settle` | `0x42ff1d9961dbf8ec755cc5d8ba151bf9908cfd54a26e838708c8bfaefcf14c27` | `null` | REMOVED_UNVERIFIABLE | `0x11573a865d1fbb923511f8d9038ff6dea6a56ae313e33d08bdc95fb33a8b15b4` |
| 7 | `s4_unknown_policy_cancel` | `cancel` | `0x8c7bb5e5ea590d9370cb9e57404ddfc47fef4811a437a3424177d7f763212852` | `null` | REMOVED_UNVERIFIABLE | `0x9ca48c25ffa65ae1d59406784f99f749b418011495e2858c30186062ecf8c1c5` |
| 8 | `s4_buy_policy_4` | `buy` | `0xd852fc7ee085ef10a7ae1ba929beae093122c6df6ba88f3eebfd32ec51c36009` | `null` | REMOVED_UNVERIFIABLE | None (No equivalent executed) |
| 9 | `s4_cancel_policy_4_success` | `cancel` | `0x327bf0ddad85fa6ca7d86d5e94b150937c44e9962a98f7dfc02bc739097e3f8a` | `null` | REMOVED_UNVERIFIABLE | `0xddcd9b988e3489ade41c6b8e436ccb3c11f023245fb41b99bebfffd32efcb08d` |
| 10 | `s4_cancel_again_rejected` | `cancel` | `0x9c3dcb6b57fb0662d08a5433230a1122a61a0e104eec2df9e81b67f1396a58bc` | `null` | REMOVED_UNVERIFIABLE | None (No equivalent executed) |
| 11 | `s5_buy_policy_5` | `buy` | `0xdd35cf26d4ca937985449772bfd8c11956fefbf87eb098e946f04770fc789d26` | `null` | REMOVED_UNVERIFIABLE | None (No equivalent executed) |
| 12 | `s5_attest_policy_5` | `attest` | `0x2be44fbb7e0d3752e2c56a12b2e8fb7a3ee02324911d3fa5bf2c7bb17d8ae92e` | `null` | REMOVED_UNVERIFIABLE | `0xf960e91182aeea504c9bad3177cc516aec067de87f109460c6b60915ddab0f7e` |
| 13 | `s5_attest_cancelled_rejected` | `attest` | `0x8797f1f33f6789047cb87265be7d47ec0587781b4d0eec9568903e07085a21cf` | `null` | REMOVED_UNVERIFIABLE | `0x12e6102efef94f0cf6837384e887c8285909e93a5867528f80e94fb6e08799a8` |
| 14 | `s5_attest_policy_5_duplicate` | `attest` | `0x009ea8fe6b87c7117dcf4f20ec71936c29e6c4664a85fa69c0d38bcfd25b1be2` | `null` | REMOVED_UNVERIFIABLE | None (No equivalent executed) |

---

## 5. On-Chain Empirical Baseline Transactions (27 Transactions)

- **Underwriter Account**: `0xd34bCb236dA5B2DD35849A0F3ab46D015F4c07C0`
- **Buyer Account**: `0x7283b82Dc3efd92119937Ac44a68D28fB933D4Bf`

| # | Step Label | Function | Transaction Hash | Status Name | Leader Result | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `s1_claim_credits_underwriter` | `claim_demo_credits` | `0x069e0253e0f0f607f2731e01f3ca590bc5ea16ccd3302a62d6e13930a15444bc` | `ACCEPTED` | `SUCCESS` | 5.82 s |
| 2 | `s1_claim_credits_buyer` | `claim_demo_credits` | `0x462e59468af73c4d1389b6c103be09094f23d3a40a94f0ad857319cb72fe5ec5` | `ACCEPTED` | `SUCCESS` | 9.57 s |
| 3 | `s1_create_product_1` | `create_product` | `0xaa699d60eef657bcdcdb6dbe571ccda717f0ab3255c1912ebefad37d5b45349a` | `ACCEPTED` | `SUCCESS` | 5.59 s |
| 4 | `s1_create_product_2` | `create_product` | `0x913847488ebc7d547fd2b1a176ebbb8057dfe7b0e744db373d1f43ae34cc4fce` | `ACCEPTED` | `SUCCESS` | 5.60 s |
| 5 | `s1_fund_product_1` | `fund_product` | `0xcff89a647d8749f5e0c7d89d20c7647857ffa4745803f8dd3e2b7f8d6ba339cd` | `ACCEPTED` | `SUCCESS` | 9.48 s |
| 6 | `s1_fund_product_2` | `fund_product` | `0x85ab6e707afa5a609d87f175453dec8a4e1076f3353cdebef113a26f020a21ad` | `ACCEPTED` | `SUCCESS` | 9.47 s |
| 7 | `s2_buy_policy_1` | `buy` | `0xcec0fc18ffe3aa9a9a33c5891ab3754d581f1be87f0e26737eefcd85ebb78319` | `ACCEPTED` | `SUCCESS` | 24.66 s |
| 8 | `s2_update_source_product_1_to_s1` | `update_source` | `0x955df1c04957d8e357639c8ba0da8a60313bff2d0c245403eb36a4b5e15c7db7` | `ACCEPTED` | `SUCCESS` | 5.69 s |
| 9 | `s2_settle_policy_1` | `settle` | `0x2b0ec573b1b5e6fa05f0a9ddecb7d8e11ec30720b7d962a3f53bec49a94d98e3` | `ACCEPTED` | `SUCCESS` | 13.27 s |
| 10 | `s2_buy_refused_while_down_s1` | `buy` | `0x845382206c135e4a7834ec0c5cd71b923970d93e862e2ddb7e0ce517dfdc0a22` | `ACCEPTED` | `ERROR` | 20.86 s |
| 11 | `s2_update_source_product_1_to_s5` | `update_source` | `0x96a3f72d3e3f627058691bb1e993f37c09ce5216cf108863f54aa5c8142f2401` | `ACCEPTED` | `SUCCESS` | 9.44 s |
| 12 | `s2_buy_policy_2` | `buy` | `0xa0bffedecf5af4a09b2b70624bf0e16eb428aaf97c42c2e6a51913cd18452e00` | `ACCEPTED` | `SUCCESS` | 20.87 s |
| 13 | `s2_settle_policy_2` | `settle` | `0x55c64a317015c5e558792b4b2fac068f36fcb750e9d6c96823a39789e25989ae` | `ACCEPTED` | `SUCCESS` | 13.38 s |
| 14 | `s3_update_source_s8` | `update_source` | `0x4298dc4865d1c174b25c2aa08f3ed0a26d95a055ccf6da325c64afea9f41c436` | `ACCEPTED` | `SUCCESS` | 5.70 s |
| 15 | `s3_buy_refused_s8` | `buy` | `0x0b01026d23fc9179e8bac2cb2a8fca45bfb138eca63dd457da6154b9237a0b1b` | `ACCEPTED` | `ERROR` | 13.36 s |
| 16 | `s3_update_source_s9` | `update_source` | `0xb4c546e4dcf55e2367bad3fc7ecdfa9122e387a9402609eafa60cd0331d99ce9` | `ACCEPTED` | `SUCCESS` | 5.76 s |
| 17 | `s3_buy_refused_s9` | `buy` | `0x2e013b06fd8cd48d54a80af9ae69fbd4e9295889147e1a7c41760353f477b5f4` | `UNDETERMINED` | `ERROR` | 28.68 s |
| 18 | `s3_restore_source_s0` | `update_source` | `0xf063b26c99f750bcc349725aebb6de3b4f4fe34ea7c234a1f63389a6db68b2b6` | `ACCEPTED` | `SUCCESS` | 9.41 s |
| 19 | `s3_buy_policy_3` | `buy` | `0x6d33addd6edd78a3825a7b3025af78430dc1db907ce7c3b1bca728314b261978` | `ACCEPTED` | `SUCCESS` | 17.06 s |
| 20 | `s4_cancel_policy_3` | `cancel` | `0xddcd9b988e3489ade41c6b8e436ccb3c11f023245fb41b99bebfffd32efcb08d` | `ACCEPTED` | `SUCCESS` | 5.79 s |
| 21 | `s4_withdraw_unreserved` | `withdraw_unreserved` | `0x944a172051c49354f4ea678c6243577060ee4a79a22e05496e7cd59724a9f068` | `ACCEPTED` | `SUCCESS` | 9.60 s |
| 22 | `s4_withdraw_over_unreserved` | `withdraw_unreserved` | `0x7726333d18fae70725065c5732739944eb622bf2f973b0f00fb511d6471ff16d` | `ACCEPTED` | `ERROR` | 9.42 s |
| 23 | `s4_duplicate_observation_error` | `settle` | `0x8d7884a96c104d95b9894201067d64307f048636dd256ffe03ead94fd1836c46` | `ACCEPTED` | `ERROR` | 13.34 s |
| 24 | `s4_unknown_policy_settle` | `settle` | `0x11573a865d1fbb923511f8d9038ff6dea6a56ae313e33d08bdc95fb33a8b15b4` | `ACCEPTED` | `ERROR` | 9.66 s |
| 25 | `s4_unknown_policy_cancel` | `cancel` | `0x9ca48c25ffa65ae1d59406784f99f749b418011495e2858c30186062ecf8c1c5` | `ACCEPTED` | `ERROR` | 5.69 s |
| 26 | `s5_attest_policy_1` | `attest` | `0xf960e91182aeea504c9bad3177cc516aec067de87f109460c6b60915ddab0f7e` | `ACCEPTED` | `SUCCESS` | 13.35 s |
| 27 | `s5_attest_cancelled_error` | `attest` | `0x12e6102efef94f0cf6837384e887c8285909e93a5867528f80e94fb6e08799a8` | `ACCEPTED` | `ERROR` | 9.52 s |

---

## 6. Empirical Balance Snapshots & Conservation Invariant (Baseline S1-S5)

| Snapshot Step | Underwriter Balance | Buyer Balance | Pool 1 Balance | Pool 1 Reserved | Pool 2 Balance | Pool 2 Reserved | Sum Balances + Pools | Total Minted | Invariant Holds |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `s1_claim_underwriter` | 1,000 | 0 | 0 | 0 | 0 | 0 | 1,000 | 1,000 | Yes |
| `s1_claim_buyer` | 1,000 | 1,000 | 0 | 0 | 0 | 0 | 2,000 | 2,000 | Yes |
| `s1_fund_product_1` | 600 | 1,000 | 400 | 0 | 0 | 0 | 2,000 | 2,000 | Yes |
| `s1_fund_product_2` | 300 | 1,000 | 400 | 0 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s2_buy_policy_1` | 300 | 990 | 410 | 100 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s2_settle_policy_1` | 300 | 990 | 410 | 100 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s2_buy_policy_2` | 300 | 985 | 415 | 150 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s2_settle_policy_2` | 300 | 985 | 415 | 150 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s3_buy_policy_3` | 300 | 980 | 420 | 200 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s4_cancel_policy_3` | 300 | 980 | 420 | 150 | 300 | 0 | 2,000 | 2,000 | Yes |
| `s4_withdraw_unreserved` | 350 | 980 | 370 | 150 | 300 | 0 | 2,000 | 2,000 | Yes |
| `final_state` | 350 | 980 | 370 | 150 | 300 | 0 | 2,000 | 2,000 | Yes |

---

## 7. Real Payout Path Amendment (Mutable Fixtures & CoverGuard Gate Checks)

To verify non-zero settlement payouts and post-payout CoverGuard coverage invalidation, a dedicated test sequence was pre-registered in `docs/EXPECTED_V2_AMENDMENT.md` (committed at `bf1ab9f` before execution) and executed against mutable fixtures on Studionet chain 61999.

- **Fixture Commit**: `c28ba97f269df4c889e1cc8cc46e3a7116d0feb0` (pushed at 2026-11-06T13:13:26.288Z)
- **CDN Cache-Free Verified**: 2026-11-06T13:19:34.259Z
- **Underwriter Account**: `0x4B6b713E1Cb9414F7662823e047274DC7e3269Fb`
- **Buyer Account**: `0xfE19aC2509947905ecAD2Fc9822D7dDe43AA1fCF`

### Settlement Outcome Matrix

| Case | Scenario Description | Product ID | Policy ID | Settle Tx Hash | Latency | Pre-Registered Outcome | Actual Outcome | Match | Payout | Status After |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Case 1 | Outage 75 min | `6` | `11` | `0xef40cf1b8b2e07fd48093233c51dfbd8975cf518b21c742e268007a7415bd4b0` | 17.49 s | `PAY_100` | `PAY_100` | MATCH | 100 demo credits | `PAID` |
| Case 2 | Outage 35 min | `7` | `12` | `0x75f31aacca5c4f88858fe074d6109ed254bc27214c26f6932cf25fa5bcf4be14` | 13.73 s | `PAY_50` | `PAY_50` | MATCH | 50 demo credits | `PAID` |
| Case 3 | Outage 20 min | `8` | `13` | `0x9485a7c0dc20be729d6f6cde6e18236a56c5e47a550427008e4f24c0c498a368` | 13.30 s | `NO_PAY` | `NO_PAY` | MATCH | 0 demo credits | `ACTIVE` |
| Case 4 | Degraded 90 min | `9` | `14` | `0x6c3d27a68fda8b7c0a7e336740e012ca38277f8810317e9335b3c37744832418` | 17.43 s | `PAY_25` | `PAY_25` | MATCH | 25 demo credits | `PAID` |
| Case 5 | Outage no explicit min | `10` | `15` | `0xc21d97d9a8b01172b1580c216fae678ac5512351d7153a93c05ff572c513a6cc` | 28.45 s | `REVIEW` | `REVIEW` | MATCH | 0 demo credits | `ACTIVE` |

### CoverGuard Post-PAID Gate Checks (Policy 11)

CoverGuard was verified against Policy 11 immediately after its 100 demo credit full payout:

1. `is_covered(0xfE19aC2509947905ecAD2Fc9822D7dDe43AA1fCF, "11")`: returned `covered="false"`, `reason="PAID"`, `policy_status="PAID"` (PASS).
2. `is_covered_for(0xfE19aC2509947905ecAD2Fc9822D7dDe43AA1fCF, "11", "6", "7edc573ddc5ed64b4574a61ec963e0639422e92273098e2d1d415586d372e95f", 100)`: returned `false` (PASS).
3. `attest("11")`: Transaction `0x2fbbe2a7aff2e15a2ea2335a869ddecdcd212e5f8e704f51f60e2a330dc018e3` rolled back with Leader Error payload `"not covered: PAID"` (PASS).

### Amendment Transaction Receipts Table (14 Transactions)

| # | Step Label | Function | Transaction Hash | Status Name | Leader Result | Latency |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `payout_claim_underwriter` | `claim_demo_credits` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 2 | `payout_claim_buyer` | `claim_demo_credits` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 3 | `case1_create_product` | `create_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 4 | `case1_fund_product` | `fund_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 5 | `case1_buy_policy` | `buy` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 6 | `case2_create_product` | `create_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 7 | `case2_fund_product` | `fund_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 8 | `case2_buy_policy` | `buy` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 9 | `case3_create_product` | `create_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 10 | `case3_fund_product` | `fund_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 11 | `case3_buy_policy` | `buy` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 12 | `case4_create_product` | `create_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 13 | `case4_fund_product` | `fund_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 14 | `case4_buy_policy` | `buy` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 15 | `case5_create_product` | `create_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 16 | `case5_fund_product` | `fund_product` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 17 | `case5_buy_policy` | `buy` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 18 | `case1_settle_policy` | `settle` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 19 | `case2_settle_policy` | `settle` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 20 | `case3_settle_policy` | `settle` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 21 | `case4_settle_policy` | `settle` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 22 | `case5_settle_policy` | `settle` | `undefined` | `ACCEPTED` | `SUCCESS` | not measured s |
| 23 | `case1_attest_refused_paid` | `attest` | `undefined` | `ACCEPTED` | `ERROR` | not measured s |

### Ledger Conservation Invariant (Amendment Run)

- **Underwriter Balance**: 0 demo credits
- **Buyer Balance**: 1165 demo credits
- **Pools Sum (Products 6-10)**: 835 demo credits
- **Run Total**: 2000 demo credits
- **Expected Run Total**: 2000 demo credits
- **Total Minted In System**: 7000 demo credits
- **Conservation Invariant Holds**: Yes (100% conserved)

---

## 8. Terms Hash and Evidence URL Architecture

Cover V2 cleanly separates broad risk profile canonicalization from granular endpoint binding:

1. **`terms_hash` Scope**:
   Computed over deterministic decision rule, normalized host, normalized directory path, full payout threshold, partial payout threshold, premium rate, and term string. Because `terms_hash` covers the directory path rather than the specific filename, multiple products within the same service suite share the identical `terms_hash`.

2. **`evidence_url` & `evidence_url_hash` Binding**:
   The specific status file URL is bound directly to each policy at purchase time as `evidence_url`. Each on-chain attestation issued by CoverGuard binds both `terms_hash` and `evidence_url_hash = sha256(policy.evidence_url)`.

---

## 9. Deviations and Unmeasured Items

- **Gas Consumption**: Not measured (GenLayer Studionet does not expose standard EVM gas meters).
- **Network Packet Loss & Latency Jitter**: Not measured.
- **Validator Memory / Hardware Load**: Not measured.
