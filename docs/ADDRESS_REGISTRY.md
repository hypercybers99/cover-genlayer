# Address Registry: Cover & CoverGuard

This document records the official deployment addresses for all contract pairs and test probes deployed on GenLayer Studionet (Chain ID: 61999, RPC: `https://studio.genlayer.com/api`).

---

## 1. ACTIVE Production Deployment (Milestone 4 - Iteration 2 Prompt)

The currently active and fully verified contract pair is built with the Iteration 2 extraction prompt (SHA-256: `90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1`), which demonstrated 60/60 (100%) parse and match across all 6 fixture pages on Studionet and completed the entire 39-transaction empirical matrix with real per-step balance readbacks.

- **`Cover`**:
  - **Address**: `0x4d12d00d527869a6a6f95358A11589ecf3C347e3`
  - **Deploy Tx**: `0x311652e1597eba4cb1d90581980c076c0ecb5708ab051756af3fbfa0db804b94`
  - **Deploy Latency**: 10.62 s
  - **Source SHA-256**: `a1f8ceb89f55db9aa6fe55fb60f4783643212eb127e9c2f76b59266c921d89cc`
  - **Source Match**: Byte-for-byte identical match with empty diff (`contracts/Cover.py`).
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x4d12d00d527869a6a6f95358A11589ecf3C347e3](https://explorer-studio.genlayer.com/address/0x4d12d00d527869a6a6f95358A11589ecf3C347e3)

- **`CoverGuard`**:
  - **Address**: `0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724`
  - **Deploy Tx**: `0xda046cfaaa78a30b40e226840e1032ee6b637307874b7704a92be72d44321b97`
  - **Deploy Latency**: 9.53 s
  - **Source SHA-256**: `b2682e9e48b67a0ac95148b25d0e10694fad671359144d2b79368f8b921f7d53`
  - **Source Match**: Byte-for-byte identical match with empty diff (`contracts/CoverGuard.py`).
  - **Bound Cover Address**: `0x4d12d00d527869a6a6f95358A11589ecf3C347e3`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724](https://explorer-studio.genlayer.com/address/0x6Ad8554F4Ca7eA3681c6a06b822B0d5c59993724)

---

## 2. Superseded Deployment (Milestone 4 - Iteration 1 Prompt)

This pair was deployed during initial Milestone 4 validation using the Iteration 1 prompt (SHA-256: `4d7d1ad1b041fe391182f20abc4e50487deed4cc2d580cb51041efd45d1fbe41`). It was superseded following the successful completion and full pass of Prompt Iteration 2.

- **`Cover`**:
  - **Address**: `0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`
  - **Deploy Tx**: `0xa1716bdbd49effa2e7bb7d2330ea8cb3f1162c5020cb921f980335255a3b7492`
  - **Deploy Latency**: 10.73 s
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd](https://explorer-studio.genlayer.com/address/0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd)

- **`CoverGuard`**:
  - **Address**: `0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF`
  - **Deploy Tx**: `0xa7ece9780281e84f6d118de02b14a62cbe9abe9d73b5068521fa36d85f7ee101`
  - **Deploy Latency**: 9.67 s
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF](https://explorer-studio.genlayer.com/address/0x85C0F67F1Cd82aBcCfABb289E6c215c78D17b3eF)

---

## 3. Robustness Test Probes

- **`ProbeExtract` (Iteration 2 Prompt)**:
  - **Address**: `0x3c302641001E563ce20d4ea6376f9BfA10165877`
  - **Deploy Tx**: `0x7ccc660aafa6ab436beeaf4112437afb0fa697468722028286a8016be90d082d`
  - **Deploy Latency**: 10.05 s
  - **Prompt SHA-256**: `90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1`
  - **Source SHA-256**: `18e078b5800e2e0176145968c3358167705d0cd527f9a35df46859f00e2ef88e`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x3c302641001E563ce20d4ea6376f9BfA10165877](https://explorer-studio.genlayer.com/address/0x3c302641001E563ce20d4ea6376f9BfA10165877)

- **`ProbeExtract` (Iteration 1 Prompt)**:
  - **Address**: `0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745`
  - **Deploy Tx**: `0x2ccd7793c97cd1f2438ad3a3ade4a4dbba07d01f47ff9e9f2bcba497005b2509`
  - **Deploy Latency**: 8.91 s
  - **Prompt SHA-256**: `4d7d1ad1b041fe391182f20abc4e50487deed4cc2d580cb51041efd45d1fbe41`
  - **Source SHA-256**: `bfac8564471acc9c43b8e7efc2309f1e4da94064435554c42fdc4587fb0da39a`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745](https://explorer-studio.genlayer.com/address/0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745)

- **`Probe` (Milestone 0 Protocol Probe)**:
  - **Address**: `0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31`
  - **Deploy Tx**: `0x49c0713e21680998242d0cfc82634919ddfa7f052e9f547c822cd8f86b273f9b`
  - **Deploy Latency**: 10.75 s
  - **Source SHA-256**: `c233f4eca4c77d345c80ff4dc02852787dcb1ef18f890831681d964ecc4491c5`
  - **Explorer URL**: [https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31](https://explorer-studio.genlayer.com/address/0xa4a7a596246b0bcBfbeB05ae31922cD43fc68C31)
