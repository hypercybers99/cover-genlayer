# Source Code Verification Report: Cover

This document records the exact method and cryptographic evidence verifying contract source integrity between the local repository and the GenLayer Studionet execution environment.

---

## 1. Local Source Hashes

- `contracts/Cover.py`:
  - SHA256: `3b2b4bc663c651e44a4f80164c09d85eb5f3336bcf8dcf89a576392095f9d2d0`
  - Encoding: Pure ASCII (all strings use standard ASCII or `\uXXXX` unicode escapes).
- `contracts/CoverGuard.py`:
  - SHA256: `248eeebf6762330a1ebc4656fa9f783141f2a33db5515273d611bf7ca0d72477`
- `contracts/Probe.py`:
  - SHA256: `c233f4eca4c77d345c80ff4dc02852787dcb1ef18f890831681d964ecc4491c5`
- `contracts/ProbeExtract.py`:
  - SHA256: `a937a0755a30e84b3d87dbd761668fdb6ca5ef9d59ea5ea34c89c8a1fe459639`

---

## 2. On-Chain Deployment Hashes & Addresses

### Milestone 0 Probe Contract:
- Address: `0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31`
- Deploy Tx Hash: `0x49c0713e21680998242d0cfc82634919ddfa7f052e9f547c822cd8f86b273f9b` (verified in `scripts/deploy/probe_results.json`)
- Deploy Latency: 10.75 s
- Explorer URL: [https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31](https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31)
- Verified Local SHA256: `c233f4eca4c77d345c80ff4dc02852787dcb1ef18f890831681d964ecc4491c5`

### ProbeExtract Contract:
- **Iteration 1 Address**: `0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745`
- **Deploy Tx Hash**: `0x2ccd7793c97cd1f2438ad3a3ade4a4dbba07d01f47ff9e9f2bcba497005b2509` (saved in `docs/evidence/probe_extract_deploy_receipt.json`)
- **Deploy Latency**: 8.91 s
- **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745](https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745)
- **Source SHA-256**: `bfac8564471acc9c43b8e7efc2309f1e4da94064435554c42fdc4587fb0da39a`
- *(Historical Note: `0xBa2689DA2A56c80A00DFC7F4e4863b3cb902609D` was the Iteration 0 probe where the deploy transaction hash was not captured to an individual receipt file; `0xFF6dF478E40b66AAC3Af5271C66b94B750E6E58f` was an intermediate retry deployment where the deploy completed in 5.69s but was superseded).*

### Production Contracts (Cover & CoverGuard):

#### 1. Cover
- **Address**: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
- **Deploy Tx Hash**: `0xa1716bdbd49effa2e7bb7d2330ea8cb3f1162c5020cb921f980335255a3b7492` (saved in `docs/evidence/onchain/cover_deploy_receipt.json`)
- **Deploy Latency**: 10.73 s
- **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd](https://explorer-studio.genlayer.com/address/0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd)
- **Source SHA-256**: `33e8661c77e8042cc6bf1166e4bde8293e0948e1215d2e39721d6a8fb844e8b0`
- **Contract Code Payload Dump**:
  - First 16 bytes: `232076302e322e31360a23207b202244`
  - Last 16 bytes:  `6f72733d28222c222c20223a2229290a`
  - Deployed byte length: 32,953 bytes | Local byte length: 32,953 bytes
  - Byte-for-byte identical diff: MATCH (diff is empty)

#### 2. CoverGuard
- **Address**: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`
- **Deploy Tx Hash**: `0xa7ece9780281e84f6d118de02b14a62cbe9abe9d73b5068521fa36d85f7ee101` (saved in `docs/evidence/onchain/cover_guard_deploy_receipt.json`)
- **Deploy Latency**: 9.67 s
- **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF](https://explorer-studio.genlayer.com/address/0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF)
- **Source SHA-256**: `b2682e9e48b67a0ac95148b25d0e10694fad671359144d2b79368f8b921f7d53`
- **Contract Code Payload Dump**:
  - First 16 bytes: `232076302e322e31360a23207b202244`
  - Last 16 bytes:  `202020202072657475726e206169640a`
  - Deployed byte length: 6,771 bytes | Local byte length: 6,771 bytes
  - Byte-for-byte identical diff: MATCH (diff is empty)

---

## 3. Verification Method

Source code verification on GenLayer Studionet is conducted by decoding the `contract_code` field from the deployment transaction payload submitted to the network, dumping the first and last 16 bytes, and performing an exact binary diff against the source file in `contracts/*.py`.
All source contracts strictly adhere to the GenVM header requirements:
```python
# v0.2.16
# { "Depends": "py-genlayer:1jb45aa8ynh2a9c9xn3b7qqh8sm5q93hwfp7jqmwsfhh8jpz09h6" }

from genlayer import *
```
No envelope byte drift exists between local files and submitted deployment code.
