# Address Registry: Cover & CoverGuard

This document records the official deployment addresses for all contract pairs and test probes deployed on GenLayer Studionet (Chain ID: 61999, RPC: `https://studio.genlayer.com/api`).

---

## 1. ACTIVE Production Deployment (Cover V2 & CoverGuard V2)

The currently active contract pair binds each policy permanently to its purchase-time terms, settlement rules, thresholds, and evidence source URL, eliminates unused inputs, and implements policy-bound CoverGuard views and attestations.

- **`Cover` (V2)**:
  - **Address**: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
  - **Deploy Tx**: `0x3f4ef296da9e609ba83dc5ed5c866910e26fd7eb9055273142683618b5e8a8a8`
  - **Deploy Latency**: 8.78 s
  - **Source SHA-256**: `0b2f91d2b64dee1dce4aa13c15c19c274546dd64fff8b738325067c37a12b296`
  - **Extraction Prompt SHA-256**: `5a8c842c53e4329313d349afa6932672980dd1e8466af75118eeb8df010daa1d`
  - **Parse Extraction SHA-256**: `c44e054a7af6a9abb30fbc536895ce61532bf2edf016497d23a53ab094370978`
  - **Source Match**: Byte-for-byte identical match with empty diff (`contracts/CoverV2.py`).
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3](https://explorer-studio.genlayer.com/address/0x3d2698cED9292689f68b401e888fbA1d18CBfdE3)

- **`CoverGuard` (V2)**:
  - **Address**: `0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A`
  - **Deploy Tx**: `0xdecd58ff74a091ed5b1e7ddb8f188402d1e06ebf92517147cb92199e14fd0b3e`
  - **Deploy Latency**: 5.83 s
  - **Source SHA-256**: `e0546c62266e7ab13b0aaa70489ada2625849742f004cb21732aaef03cd901a1`
  - **Source Match**: Byte-for-byte identical match with empty diff (`contracts/CoverGuardV2.py`).
  - **Bound Cover Address**: `0x3d2698cED9292689f68b401e888fbA1d18CBfdE3`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A](https://explorer-studio.genlayer.com/address/0xfEebb7147Dd65b5EbEa7C6634ed4549B45993A1A)

---

## 2. Superseded Deployments

### 2.1 V1 Deployment (Milestone 4 - Iteration 2 Prompt)
Superseded by V2 following reviewer alignment on purchase-time term binding and CoverGuard signature alignment. Kept for audit history.

- **`Cover` (V1)**:
  - **Address**: `0x4d12d00d527869a6a6f95358A11589ecf3C347e3`
  - **Deploy Tx**: `0x311652e1597eba4cb1d90581980c076c0ecb5708ab051756af3fbfa0db804b94`
  - **Deploy Latency**: 10.62 s
  - **Source SHA-256**: `a1f8ceb89f55db9aa6fe55fb60f4783643212eb127e9c2f76b59266c921d89cc`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x4d12d00d527869a6a6f95358A11589ecf3C347e3](https://explorer-studio.genlayer.com/address/0x4d12d00d527869a6a6f95358A11589ecf3C347e3)

- **`CoverGuard` (V1)**:
  - **Address**: `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724`
  - **Deploy Tx**: `0xda046cfaaa78a30b40e226840e1032ee6b637307874b7704a92be72d44321b97`
  - **Deploy Latency**: 9.53 s
  - **Source SHA-256**: `b2682e9e48b67a0ac95148b25d0e10694fad671359144d2b79368f8b921f7d53`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724](https://explorer-studio.genlayer.com/address/0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724)

### 2.2 V0 Initial Milestone 4 Deployment (Iteration 1 Prompt)
- **`Cover`**: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
- **`CoverGuard`**: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`

---

## 3. Robustness Test Probes

- **`ProbeExtract` (Iteration 2 Prompt)**:
  - **Address**: `0x3c302641001E563ce20d4ea6376f9BfA10165877`
  - **Deploy Tx**: `0x7ccc660aafa6ab436beeaf4112437afb0fa697468722028286a8016be90d082d`
  - **Prompt SHA-256**: `90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x3c302641001E563ce20d4ea6376f9BfA10165877](https://explorer-studio.genlayer.com/address/0x3c302641001E563ce20d4ea6376f9BfA10165877)

- **`ProbeExtract` (Iteration 1 Prompt)**:
  - **Address**: `0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745`
  - **Deploy Tx**: `0x2ccd7793c97cd1f2438ad3a3ade4a4dbba07d01f47ff9e9f2bcba497005b2509`
  - **Prompt SHA-256**: `4d7d1ad1b041fe391182f20abc4e50487deed4cc2d580cb51041efd45d1fbe41`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745](https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745)

- **`Probe` (Milestone 0 Protocol Probe)**:
  - **Address**: `0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31](https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31)
