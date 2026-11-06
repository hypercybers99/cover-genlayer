# Source Code Verification Report: Cover V2

This document records the exact method and cryptographic evidence verifying contract source integrity between the local repository and the GenLayer Studionet execution environment for Cover V2.

---

## 1. Active Production Contracts (Cover V2 & CoverGuard V2)

### 1.1 Cover V2
- **Address**: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
- **Deploy Tx Hash**: `0x3f4ef296da9e609ba83dc5ed5c866910e26fd7eb9055273142683618b5e8a8a8` (saved in `docs/evidence_v2/onchain/cover_v2_deploy_receipt.json`)
- **Deploy Latency**: 8.78 s
- **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3](https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3)
- **Local Source**: `contracts/CoverV2.py`
- **Source SHA-256**: `0b2f91d2b64dee1dce4aa13c15c19c274546dd64fff8b738325067c37a12b296`
- **Extraction Prompt SHA-256**: `5a8c842c53e4329313d349afa6932672980dd1e8466af75118eeb8df010daa1d`
- **Parse Extraction SHA-256**: `c44e054a7af6a9abb30fbc536895ce61532bf2edf016497d23a53ab094370978`
- **Contract Code Payload Dump**:
  - First 16 bytes: `232076302e322e31360a23207b202244`
  - Last 16 bytes:  `436f7665725632203d20436f7665720a`
  - Deployed byte length: 33,405 bytes | Local byte length: 33,405 bytes
  - Byte-for-byte identical diff: MATCH (diff is empty)

### 1.2 CoverGuard V2
- **Address**: `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`
- **Deploy Tx Hash**: `0xdecd58ff74a091ed5b1e7ddb8f188402d1e06ebf92517147cb92199e14fd0b3e` (saved in `docs/evidence_v2/onchain/cover_guard_v2_deploy_receipt.json`)
- **Deploy Latency**: 5.83 s
- **Explorer URL**: [https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A](https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A)
- **Local Source**: `contracts/CoverGuardV2.py`
- **Source SHA-256**: `e0546c62266e7ab13b0aaa70489ada2625849742f004cb21732aaef03cd901a1`
- **Contract Code Payload Dump**:
  - First 16 bytes: `232076302e322e31360a23207b202244`
  - Last 16 bytes:  `5632203d20436f76657247756172640a`
  - Deployed byte length: 7,145 bytes | Local byte length: 7,145 bytes
  - Byte-for-byte identical diff: MATCH (diff is empty)

---

## 2. Superseded Contract Deployments

- **Cover (V1)**: `0x4d12d00d527869a6a6f95358A11589ecf3C347e3` (Deploy Tx: `0x311652e1597eba4cb1d90581980c076c0ecb5708ab051756af3fbfa0db804b94`)
- **CoverGuard (V1)**: `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724` (Deploy Tx: `0xda046cfaaa78a30b40e226840e1032ee6b637307874b7704a92be72d44321b97`)
- **Cover (V0)**: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
- **CoverGuard (V0)**: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`

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
