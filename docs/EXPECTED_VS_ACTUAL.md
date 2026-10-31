# Pre-Registered Expectations vs Actual Outcomes

This document records the empirical results of status page evaluations conducted on Studionet (Chain 61999), comparing the pre-registered predictions from `fixtures/EXPECTED.md` with observed behavior from empirical transactions executed against active `Cover` contract [`0x4d12d00d527869a6a6f95358A11589ecf3C347e3`](https://explorer-studio.genlayer.com/address/0x4d12d00d527869a6a6f95358A11589ecf3C347e3).

---

## Comparison Table

| Fixture Page | Pre-Registered Outcome | Empirical Settle / Model Result | Gate Fired | Match Status | Notes / Receipt Tx |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `status-s0-operational.md` | `NO_PAY` | `NO_PAY` | `PAGE_UNCHANGED` | `MATCH` | Settle Pd s0 (tx: `0x5eaeca207649e0079b9b70fac6bdcbed052a6b4fe24839879921c016ad1cee5e`). Inception hash matched current hash; zero payout without model invocation. |
| `status-s1-outage-75.md` | `PAY_100` | `PAY_100` | `JUDGED` | `MATCH` | Settle Pa s1 (tx: `0xd3b080ddcb88ab3d1a4365cb3f0924e506451fe764f0413219850c428ea8d395`). Outage 75 min >= 60 min. Policy Pa marked `PAID`, 100 credits disbursed. |
| `status-s2-outage-35.md` | `PAY_50` | `PAY_50` | `JUDGED` | `MATCH` | Settle Pb s2 (tx: `0xfe110b4523c9c7eccc3865a737c871167bbfc9b234177387dbb5f507dbe32198`). Outage 35 min >= 30 min half threshold. Policy Pb marked `PAID`, 50 credits disbursed. |
| `status-s3-outage-20.md` | `NO_PAY` | `NO_PAY` | `JUDGED` | `MATCH` | Settle Pd s3 (tx: `0x5561defaf8ee9fdadc1ba61d37de7fa5902679ca97d1deba4b692854fa983054`). Outage 20 min < 30 min threshold. Payout 0; Policy Pd remains `ACTIVE`. |
| `status-s4-degraded-90.md` | `PAY_25` | `PAY_25` | `JUDGED` | `MATCH` | Settle Pc s4 (tx: `0x802f3d3aa60cce8f22d0e45554c31b06b750d20921459bb30f021e520b7d0130`). Degraded 90 min >= 60 min. Policy Pc marked `PAID`, 25 credits disbursed. |
| `status-s5-operational-reformatted.html` | `NO_PAY` | `NO_PAY` | `JUDGED` | `MATCH` | Settle Pd s5 (tx: `0x0feb08c5220585f10390fcee90a4e93dabc4d5ee48d52463be3dbd23bc0c5a5e`). Cleaned HTML parsed as `OPERATIONAL`, 0 minutes. Payout 0. |
| `status-s6-injection.md` | `REVIEW` | `REVIEW` | `TRIPWIRE` | `MATCH` | Settle Pd s6 (tx: `0x0335bd4704b713b421abf1a95a6990ed7a9b3b5bf42794ed0e063349bc8516e5`). Injection pattern detected pre-LLM. Routed to `REVIEW` with zero payout. |
| `status-s7-no-duration.md` | `REVIEW` | `REVIEW` | `JUDGED` | `MATCH` | Settle Pd s7 (tx: `0x8ec2f35633ff26d029c7b624382863305a7572cfe1161cb1060c8e9c807b94fc`). Outage with 0 parsed duration safely routed to `REVIEW` by `decide()`. |
| `status-s8-already-down.md` | `USER_ERROR (BUY REFUSED)` | `USER_ERROR (BUY REFUSED)` | `BUY_GATE` | `MATCH` | Buy attempt (tx: `0x578ac20a937ea0e4c32d55e841aeb98de7275489fa9439f0270b3b62d576e947`). Reverted with UserError `event already in progress or status unclear at purchase`. |
| `status-s9-too-short.md` | `USER_ERROR (PAGE UNREADABLE)` | `UNDETERMINED / MAJORITY_DISAGREE` | `INPUT_GATE` | `MATCH` | Settle attempt (tx: `0xf175fdf1898ee6d224f1a65083c516866fbd4f279cd2f22b5a2aff77892c4dde`). Leader rolled back with UserError `page unreadable`; validator disagreement resulted in `UNDETERMINED`. Contract state preserved unchanged. |
