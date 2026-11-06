# Cover V2 Migration Progress

## Status
- Plan, defect reproductions, and expected docs committed
- CoverV2 and CoverGuardV2 contracts authored and extraction hashes verified

## Defect Checklist
- [x] Defect 1: Policy unbound to terms, source mutation affects settlement, no explicit term
- [x] Defect 2: rule_text unused in decide, no 25% threshold
- [ ] Defect 3: CreateProductPage 25% input dropped, threshold labels
- [ ] Defect 4: Hardcoded fundProduct('1'), next_product - 1 race
- [ ] Defect 5: Type mismatches between app and contract outputs
- [x] Defect 6: CoverGuard view argument mismatch and attest terms_hash source

## Plan & Expected Docs
- [x] docs/REVIEW_V2_PLAN.md
- [x] docs/EXPECTED_V2.md

## Part A: Contracts V2
- [x] contracts/CoverV2.py
- [x] contracts/CoverGuardV2.py
- [x] Extraction prompt & parse_extraction sha256 equality verification
- [ ] Pre-deploy unit & regression tests (a-i)
- [ ] Deploy V2 pair to Studionet
- [ ] On-chain S1-S5 empirical execution
- [ ] Docs & Address Registry update
- [ ] CI run verification & tag cover-v2

## Part B: App V2
- [ ] Sync deployments and V2 sources
- [ ] Create product flow update (no rule_text, no 25% input, generated rule text)
- [ ] Receipt return value handling for fundProduct
- [ ] Golden files capture & TypeScript types alignment
- [ ] Policy page, product page, and Guard page alignment
- [ ] App regression tests & audits
- [ ] App E2E chain execution & GitHub Pages deployment
- [ ] Tag cover-app-v2 & final reports
