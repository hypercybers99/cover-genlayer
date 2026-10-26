# Pre-Registered Expectations vs Actual Outcomes

This document records the empirical results of status page evaluations conducted during development, comparing the pre-registered predictions from `fixtures/EXPECTED.md` with observed behavior.

---

## Comparison Table

| Fixture Page | Pre-Registered Outcome | Empirical Settle / Model Result | Gate Fired | Match Status | Notes |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `status-s0-operational.md` | `NO_PAY` | not run yet | not run yet | Pending on-chain run | Policy bought on s0; settle against unchanged s0 expected to fire `PAGE_UNCHANGED`. |
| `status-s1-outage-75.md` | `PAY_100` | not run yet | not run yet | Pending on-chain run | Outage 75 minutes >= `min_full` (60), quote verified verbatim. |
| `status-s2-outage-35.md` | `PAY_50` | not run yet | not run yet | Pending on-chain run | Outage 35 minutes >= `min_half` (30) and < `min_full` (60). |
| `status-s3-outage-20.md` | `NO_PAY` | not run yet | not run yet | Pending on-chain run | Outage 20 minutes < `min_half` (30). Does not reach threshold. Policy remains `ACTIVE`. |
| `status-s4-degraded-90.md` | `PAY_25` | not run yet | not run yet | Pending on-chain run | Degraded performance 90 minutes >= `min_full` (60). Payout 25%. |
| `status-s5-operational-reformatted.html` | `NO_PAY` | not run yet | not run yet | Pending on-chain run | HTML format; status `OPERATIONAL` yields `NO_PAY`. |
| `status-s6-injection.md` | `REVIEW` | not run yet | not run yet | Pending on-chain run | Injection tripwire forces safe `REVIEW`, zero payout. |
| `status-s7-no-duration.md` | `REVIEW` | not run yet | not run yet | Pending on-chain run | Outage without explicit minutes duration falls back to safe `REVIEW`. |
| `status-s8-already-down.md` | `USER_ERROR (BUY REFUSED)` | not run yet | not run yet | Pending on-chain run | Buy-time check fails when page is not `OPERATIONAL`. |
| `status-s9-too-short.md` | `USER_ERROR (PAGE UNREADABLE)` | not run yet | not run yet | Pending on-chain run | Cleaned text under 200 characters fails input gate with UserError `page unreadable`. |
