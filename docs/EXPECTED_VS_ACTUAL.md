# Pre-Registered Expectations vs Actual Outcomes

This document records the empirical results of status page evaluations conducted on Studionet (Chain 61999), comparing the pre-registered predictions from `fixtures/EXPECTED.md` with observed behavior from empirical transactions executed against `Cover` (`0x41f8c399e2709333AEAD1F8Ac0B1E5248eC288Bd`).

---

## Comparison Table

| Fixture Page | Pre-Registered Outcome | Empirical Settle / Model Result | Gate Fired | Match Status | Notes / Receipt Tx |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `status-s0-operational.md` | `NO_PAY` | `NO_PAY` | `PAGE_UNCHANGED` | `MATCH` | Settle 8 (tx: `0xb5f21ae4eedd97d8c792c1a7bdc7402212be9604ce692ba224842f63f13e832c`). Inception hash matched current hash; zero payout without model invocation. |
| `status-s1-outage-75.md` | `PAY_100` | `PAY_100` | `JUDGED` | `MATCH` | Settle 1 (tx: `0x33143d04a0b302ffe13c292adfe16b84ec013cf051c5142aaa21f89339d0ce21`). Outage 75 min >= 60 min. Policy Pa marked `PAID`, 100 credits disbursed. |
| `status-s2-outage-35.md` | `PAY_50` | `PAY_50` | `JUDGED` | `MATCH` | Settle 2 (tx: `0xa290a9894e003d55e013d1a82300179fc919781b35c5fbb3aae1f79ad625fd17`). Outage 35 min >= 30 min half threshold. Policy Pb marked `PAID`, 50 credits disbursed. |
| `status-s3-outage-20.md` | `NO_PAY` | `NO_PAY` | `JUDGED` | `MATCH` | Settle 4 (tx: `0x24bbe91782cffe184f597cc94c14631ad939fd014ce4795d14f9a8a5b3d3e9fd`). Outage 20 min < 30 min threshold. Payout 0; Policy Pd remains `ACTIVE`. |
| `status-s4-degraded-90.md` | `PAY_25` | `PAY_25` | `JUDGED` | `MATCH` | Settle 3 (tx: `0x7ceac64048ee4f5dde3f6cfef680de85ebf47faef365af074cbb85727a8a8367`). Degraded 90 min >= 60 min. Policy Pc marked `PAID`, 25 credits disbursed. |
| `status-s5-operational-reformatted.html` | `NO_PAY` | `NO_PAY` | `JUDGED` | `MATCH` | Settle 5 (tx: `0x04dd63bfb3d15ebb3b922e5dcc257b7807f37b132888dfb51154a49328d6b5ec`). Cleaned HTML parsed as `OPERATIONAL`, 0 minutes. Payout 0. |
| `status-s6-injection.md` | `REVIEW` | `REVIEW` | `TRIPWIRE` | `MATCH` | Settle 6 (tx: `0x81efa427ca0942d5762165a8dc7c70027fe09a92483850b2ef472213a0e95873`). Injection pattern detected pre-LLM. Routed to `REVIEW` with zero payout. |
| `status-s7-no-duration.md` | `REVIEW` | `REVIEW` | `JUDGED` | `MATCH` | Settle 7 (tx: `0xa7f8dbe0629cd3870c4615e273d311c261bc9db0b8969d212b43f13f6a798fc2`). Outage with 0 parsed duration safely routed to `REVIEW` by `decide()`. |
| `status-s8-already-down.md` | `USER_ERROR (BUY REFUSED)` | `USER_ERROR (BUY REFUSED)` | `BUY_GATE` | `MATCH` | Buy attempt (tx: `0x0b9a8da907ceb716e470812ea58991227165309c0f5d14bab5dff22e29a1c7e0`). Reverted with UserError `event already in progress or status unclear at purchase`. |
| `status-s9-too-short.md` | `USER_ERROR (PAGE UNREADABLE)` | `UNDETERMINED / MAJORITY_DISAGREE` | `INPUT_GATE` | `MATCH` | Settle attempt (tx: `0xdbaa2adc7afbf50dcab27d429eb9a7c20d74cf31092c44f0529411da707d06e7`). Leader rolled back with `page unreadable`; validator disagreement resulted in `UNDETERMINED`. Contract state preserved unchanged. |
