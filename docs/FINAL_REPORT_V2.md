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

## 3. On-Chain Empirical Transactions (Studionet Chain 61999)

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

## 4. Empirical Balance Snapshots & Conservation Invariant

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

## 5. Reviewer Alignments Verified

1. **Purchase-Time Term Binding**:
   - Policy 1 `evidence_url`: `https://raw.githubusercontent.com/hypercybers99/cover-fixtures/92c69bc636517656b9e7ee031a503adfb2d26bb4/status-s0-operational.md`
   - Policy 2 `evidence_url`: `https://raw.githubusercontent.com/hypercybers99/cover-fixtures/92c69bc636517656b9e7ee031a503adfb2d26bb4/status-s5-operational-reformatted.html`
   - Policy 1 terms hash: `8368347393c32f3c9e6df4813844cbcfad194ebecba975144f6d05175912c8f1`
   - Policy 2 terms hash: `8368347393c32f3c9e6df4813844cbcfad194ebecba975144f6d05175912c8f1`
   - Settle on Policy 1 after product update evaluated purchase-time URL `status-s0-operational.md`, triggering `PAGE_UNCHANGED -> NO_PAY`.
2. **Buy Inception Gate on Updated Source**:
   - Calling `buy` when Product 1 was updated to `status-s1-outage-75.md` reverted with UserError `event already in progress or status unclear at purchase` (tx: `0x845382206c135e4a7834ec0c5cd71b923970d93e862e2ddb7e0ce517dfdc0a22`).
3. **Explicit Coverage Term**:
   - Policy 1 and Policy 2 `term`: `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`.
4. **Deterministic Decision Rule**:
   - `decision_rule`: `"OUTAGE >= min_full minutes: 100% | OUTAGE >= min_half: 50% | DEGRADED >= min_full: 25% | otherwise 0%; unreadable or unclear: REVIEW"`
5. **CoverGuard Signatures & Policy-Bound Attestation**:
   - `is_covered_for(0x7283b82Dc3efd92119937Ac44a68D28fB933D4Bf, "1", "1", 8368347393c32f3c9e6df4813844cbcfad194ebecba975144f6d05175912c8f1, 100)`: `true`
   - `is_covered_for(0x7283b82Dc3efd92119937Ac44a68D28fB933D4Bf, "1", "1", 0000000000000000000000000000000000000000000000000000000000000000, 100)`: `false`
   - Attestation 1: `attester`: `0x7283b82dc3efd92119937ac44a68d28fb933d4bf`, `policy_id`: `1`, `terms_hash`: `8368347393c32f3c9e6df4813844cbcfad194ebecba975144f6d05175912c8f1`, `evidence_url_hash`: `c7edfdeac26d29fc33e4462b85e849a398ef1ef4ba69f21b57d8f900cac35742`
   - Attestation on cancelled Policy 3 reverted with UserError (tx: `0x12e6102efef94f0cf6837384e887c8285909e93a5867528f80e94fb6e08799a8`).
