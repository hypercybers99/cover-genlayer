# Cover: Parametric Dependency Cover on GenLayer Studionet

> **Status: Preview (studionet)**

Cover is an intelligent contract on GenLayer that provides algorithmic, oracle-free parametric cover for software dependencies that publish their operational health on public web pages.

An underwriter creates a **PRODUCT** defining a status page URL, duration thresholds, and a premium rate, and funds the product payout pool with credits. A buyer purchases a **POLICY** by paying an upfront premium for coverage. When a service disruption occurs, anyone can trigger `settle`. Independent GenLayer validators fetch the status page, extract the status and incident duration using an on-chain LLM, verify the extracted quote character-by-character against the raw web text using deterministic Python logic, apply payout thresholds, and distribute credits directly from the pool.

In Cover V2, each policy permanently binds to its purchase-time coverage term, settlement rules, thresholds, and evidence source URL upon `buy`. Product source updates affect only policies bought afterwards.

---

## 1. The Pitch & Mechanism

- **Algorithmic Settlement**: No claims adjusters, claim forms, or trusted third-party oracle daemons. Settlement is permissionlessly callable by any account.
- **Quote-Verified Extraction**: Model predictions must be backed by a verbatim quote located at token boundaries in the fetched page, containing the exact duration integer. Fabricated quotes or hallucinated durations safely fail to `REVIEW` with zero payout.
- **Strict Consensus Primitive**: Validators compare a single canonical consensus token:
  $$\text{Consensus Token} = \langle\text{OUTCOME}\rangle \mid \langle\text{norm\_hash16}\rangle$$
  where `OUTCOME` $\in \{\text{PAY\_100}, \text{PAY\_50}, \text{PAY\_25}, \text{NO\_PAY}, \text{REVIEW}\}$ and `norm_hash16` is the first 16 hex characters of $\text{SHA256}(\text{norm\_text}(\text{page}))$.
- **Purchase-Time Term Binding**: Every policy records immutable purchase-time terms: `terms_hash`, `evidence_url`, `min_full`, `min_half`, `decision_rule`, `term`, `coverage`, `premium`. Settle reads strictly policy-bound values. The `terms_hash` covers the decision rule, host, directory, min_full, min_half, premium_bps, and term; the exact status URL is bound separately in `evidence_url` and in each attestation's `evidence_url_hash`. Because `terms_hash` canonicalizes the host and directory path rather than the specific filename, Policies 1 and 2 share the identical `terms_hash` while each binding their distinct purchase-time `evidence_url` and distinct attestation `evidence_url_hash`.
- **Credits Only**: All accounting is conducted using an internal credit ledger. No real currency, ERC-20 tokens, or native GEN tokens are locked.

---

## 2. Why GenLayer

Traditional blockchains (like Ethereum) cannot fetch arbitrary public HTTP web pages without centralized oracle servers. Moreover, extracting duration numbers and incident status from unstructured natural language text requires machine intelligence.

A centralized web scraper creates a single point of failure and makes the operator the sole judge of claims. On GenLayer, independent validator nodes each fetch the provider's status page directly and must reach majority agreement on the outcome token.

---

## 3. Non-Goals & Limitations

1. **Credits Only**: No real money or regulated insurance.
2. **Explicit Coverage Term**: The term is explicitly `"OPEN_UNTIL_SETTLED_OR_CANCELLED"`. There is no on-chain clock or automated expiration timestamp.
3. **Explicit Minutes Duration**: Status pages must state an explicit integer duration in minutes for a single incident block. Pages requiring JavaScript execution or reporting only clock timestamps fail safe to `REVIEW` or UserError.
4. **Provider-Written Pages**: Cover evaluates what the provider admits on their status page; it does not independently test network sockets.
5. **Fictional Fixtures**: Test fixtures utilize fictional provider "Nimbus Cloud" (`status.nimbus.example`).

---

## 4. Repository Structure

- `contracts/CoverV2.py`: Core V2 intelligent contract (products, policies, settlements, credit ledger).
- `contracts/CoverGuardV2.py`: Consumer V2 contract performing synchronous cross-contract view checks and attestations.
- `contracts/Cover.py`: Superseded V1 contract (kept for history).
- `contracts/CoverGuard.py`: Superseded V1 contract (kept for history).
- `fixtures/pages/`: Reference status page fixtures for Nimbus Cloud.
- `docs/`:
  - `ADDRESS_REGISTRY.md`: Complete deployment history and active contract addresses.
  - `DESIGN.md`: Architecture, consensus token design, and security invariants.
  - `LIMITATIONS.md`: Comprehensive constraint documentation.
  - `INTEGRATION.md`: Frontend developer reference with exact schemas and receipt rules.
  - `VERIFICATION.md`: Cryptographic source verification report.
  - `ERROR_CODES.md`: Complete catalog of UserError strings.
  - `EXPECTED_V2.md`: Pre-registered expected values and outcomes for V2 on-chain scenarios.
  - `REVIEW_V2_PLAN.md`: Full architectural specification for reviewer fixes.
- `tests/`: 38 unit and regression tests covering pure helpers, star trap comparisons, mock lifecycle, consensus agreement, and V2 pre-deploy properties (a-i).
- `scripts/`: Deployment, verification, facts reporting, and evidence extraction scripts.

---

## 5. Deployed Contracts on Studionet

- **Network**: GenLayer Studionet (Chain ID: 61999)
- **RPC Endpoint**: `https://studio.genlayer.com/api`
- **ACTIVE Cover Contract (V2)**: [`0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`](https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3)
- **ACTIVE CoverGuard Consumer (V2)**: [`0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`](https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A)
- **Address Registry**: See [`docs/ADDRESS_REGISTRY.md`](docs/ADDRESS_REGISTRY.md) for full deployment history and transaction hashes.
- **Fixtures Repository**: [https://github.com/hypercybers99/cover-fixtures](https://github.com/hypercybers99/cover-fixtures) (Pinned Commit: `92c69bc636517656b9e7ee031a503adfb2d26bb4`)

### How to Verify Deployed Source
To verify that deployed contracts match the local source code byte-for-byte, fetch the deployment transaction via RPC and compare the base64-decoded `contract_code` against `contracts/CoverV2.py` and `contracts/CoverGuardV2.py`:
```bash
node -e "
const fs = require('fs');
async function verify(txHash, localFile) {
  const res = await fetch('https://studio.genlayer.com/api', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jsonrpc: '2.0', method: 'eth_getTransactionByHash', params: [txHash], id: 1 })
  });
  const data = await res.json();
  const deployedBuf = Buffer.from(data.result.data.contract_code, 'base64');
  const localBuf = Buffer.from(fs.readFileSync(localFile, 'utf8').replace(/\r\n/g, '\n'), 'utf8');
  console.log(localFile, 'match:', deployedBuf.equals(localBuf), 'length:', deployedBuf.length);
}
verify('0x3f4ef296da9e609ba83dc5ed5c866910e26fd7eb9055273142683618b5e8a8a8', 'contracts/CoverV2.py');
verify('0xdecd58ff74a091ed5b1e7ddb8f188402d1e06ebf92517147cb92199e14fd0b3e', 'contracts/CoverGuardV2.py');
"
```

---

## 6. How to Run Tests

### Running Unit & Regression Tests (38 Tests)
```bash
pytest -v
```

### Running Extraction Prompt & Parser SHA Verification
```bash
python scripts/verify_extraction_sha.py
```

---

## License
MIT License. Copyright (c) 2026 Hyper.
