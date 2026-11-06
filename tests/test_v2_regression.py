import unittest
import os
import sys
import json
import random
import hashlib

tests_dir = os.path.abspath(os.path.dirname(__file__))
root_dir = os.path.abspath(os.path.join(tests_dir, ".."))
sys.path.insert(0, tests_dir)
sys.path.insert(0, root_dir)

import genlayer
from genlayer import gl, WebResponse

# Import V1 contract & helpers
from contracts.Cover import (
    Cover as CoverV1,
    decide as decide_v1,
)

# Import V2 contract & helpers
from contracts.CoverV2 import (
    Cover as CoverV2,
    decide as decide_v2,
    build_terms_dict,
    compute_terms_hash,
    clean_text,
    norm_text,
    quote_in_page,
    number_in_quote,
    DECISION_RULE_V2,
    COVERAGE_TERM_V2,
)
from contracts.CoverGuardV2 import CoverGuard as CoverGuardV2


class TestV2Regression(unittest.TestCase):

    def setUp(self):
        self.fixtures_dir = os.path.join(root_dir, "fixtures", "pages")
        self.cover = CoverV2()
        self.cover_addr = "0x1111111111111111111111111111111111111111"
        self.guard = CoverGuardV2(self.cover_addr)
        gl.contract_registry[self.cover_addr] = self.cover

    def load_fixture(self, name: str) -> bytes:
        p = os.path.join(self.fixtures_dir, name)
        with open(p, "rb") as f:
            return f.read()

    # -----------------------------------------------------------------------
    # (a) Buy -> update_source -> settle: verifies policy reads its own purchase URL
    # -----------------------------------------------------------------------
    def test_a_buy_update_source_settle_reads_purchase_url(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product(
            "Nimbus Cloud",
            "https://status.nimbus.example/api/s0.md",
            60,
            30,
            1000,
        )
        self.cover.fund_product(pid, 500)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        # Buy under s0 (operational)
        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'

        pol_id = self.cover.buy(pid, 100)
        self.assertEqual(pol_id, "1")

        # Verify purchase-time URL on policy
        pol = json.loads(self.cover.get_policy(pol_id))
        self.assertEqual(pol["evidence_url"], "https://status.nimbus.example/api/s0.md")

        # Creator updates product source to s1
        gl.message.sender_address.as_hex = underwriter
        self.cover.update_source(pid, "https://status.nimbus.example/api/s1.md")
        prod = json.loads(self.cover.get_product(pid))
        self.assertEqual(prod["url"], "https://status.nimbus.example/api/s1.md")

        # Settle policy: inspect which URL is fetched
        urls_requested = []
        s1_bytes = self.load_fixture("status-s1-outage-75.md")

        def mock_web_get(url: str):
            urls_requested.append(url)
            return WebResponse(200, s1_bytes)

        gl.nondet.web.handler = mock_web_get
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'

        gl.message.sender_address.as_hex = buyer
        outcome = self.cover.settle(pol_id)
        self.assertEqual(outcome, "PAY_100")

        # Must have requested purchase URL (s0.md), NEVER product URL (s1.md)
        self.assertIn("https://status.nimbus.example/api/s0.md", urls_requested)
        self.assertNotIn("https://status.nimbus.example/api/s1.md", urls_requested)

        # Settlement record checks
        pol_after = json.loads(self.cover.get_policy(pol_id))
        sid = pol_after["settlement_id"]
        settle_rec = json.loads(self.cover.get_settlement(sid))
        self.assertEqual(settle_rec["url_used"], "https://status.nimbus.example/api/s0.md")
        self.assertEqual(settle_rec["evidence_url"], "https://status.nimbus.example/api/s0.md")
        self.assertEqual(settle_rec["payout"], "100")

    # -----------------------------------------------------------------------
    # (b) Two policies on one product: policy A at URL 1, policy B at URL 2
    # -----------------------------------------------------------------------
    def test_b_two_policies_different_source_urls(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product(
            "Multi-Source Product",
            "https://status.example.com/api/s0.md",
            60,
            30,
            1000,
        )
        self.cover.fund_product(pid, 800)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        # Buy Policy A at s0
        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        pol_a = self.cover.buy(pid, 100)

        # Update source to s5 (reformatted operational)
        gl.message.sender_address.as_hex = underwriter
        self.cover.update_source(pid, "https://status.example.com/api/s5.html")

        # Buy Policy B at s5
        gl.message.sender_address.as_hex = buyer
        s5_bytes = self.load_fixture("status-s5-operational-reformatted.html")
        gl.nondet.web.handler = lambda url: WebResponse(200, s5_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        pol_b = self.cover.buy(pid, 100)

        self.assertEqual(json.loads(self.cover.get_policy(pol_a))["evidence_url"], "https://status.example.com/api/s0.md")
        self.assertEqual(json.loads(self.cover.get_policy(pol_b))["evidence_url"], "https://status.example.com/api/s5.html")

        # Settle Policy A: verify it requests s0.md
        requested_a = []
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda u: (requested_a.append(u) or WebResponse(200, s1_bytes))
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        res_a = self.cover.settle(pol_a)
        self.assertEqual(res_a, "PAY_100")
        self.assertGreaterEqual(len(requested_a), 1)
        self.assertTrue(all(u == "https://status.example.com/api/s0.md" for u in requested_a))

        # Settle Policy B: verify it requests s5.html
        requested_b = []
        gl.nondet.web.handler = lambda u: (requested_b.append(u) or WebResponse(200, s1_bytes))
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        res_b = self.cover.settle(pol_b)
        self.assertEqual(res_b, "PAY_100")
        self.assertGreaterEqual(len(requested_b), 1)
        self.assertTrue(all(u == "https://status.example.com/api/s5.html" for u in requested_b))

    # -----------------------------------------------------------------------
    # (c) Terms hash stability: deterministic hashing and sensitivity
    # -----------------------------------------------------------------------
    def test_c_terms_hash_stability_and_sensitivity(self):
        base_dict = build_terms_dict("status.example.com", "/api/", 60, 30, 1000)
        base_hash = compute_terms_hash(base_dict)
        self.assertEqual(len(base_hash), 64)

        # Exact repeat produces identical hash
        base_dict2 = build_terms_dict("status.example.com", "/api/", 60, 30, 1000)
        self.assertEqual(compute_terms_hash(base_dict2), base_hash)

        # Altering min_full alters hash
        d_mf = build_terms_dict("status.example.com", "/api/", 120, 30, 1000)
        self.assertNotEqual(compute_terms_hash(d_mf), base_hash)

        # Altering min_half alters hash
        d_mh = build_terms_dict("status.example.com", "/api/", 60, 45, 1000)
        self.assertNotEqual(compute_terms_hash(d_mh), base_hash)

        # Altering premium_bps alters hash
        d_bps = build_terms_dict("status.example.com", "/api/", 60, 30, 500)
        self.assertNotEqual(compute_terms_hash(d_bps), base_hash)

        # Altering host alters hash
        d_host = build_terms_dict("status2.example.com", "/api/", 60, 30, 1000)
        self.assertNotEqual(compute_terms_hash(d_host), base_hash)

        # Altering dir_path alters hash
        d_dir = build_terms_dict("status.example.com", "/v2/", 60, 30, 1000)
        self.assertNotEqual(compute_terms_hash(d_dir), base_hash)

    # -----------------------------------------------------------------------
    # (d) create_product return value equals stored ID on back-to-back creations
    # -----------------------------------------------------------------------
    def test_d_create_product_return_value_equals_stored_id(self):
        gl.message.sender_address.as_hex = "0x1111111111111111111111111111111111111111"
        self.cover.claim_demo_credits()

        pid1 = self.cover.create_product("Product One", "https://status1.example.com/api/", 60, 30, 1000)
        self.assertEqual(pid1, "1")
        prod1 = json.loads(self.cover.get_product("1"))
        self.assertEqual(prod1["id"], pid1)
        self.assertEqual(prod1["name"], "Product One")

        pid2 = self.cover.create_product("Product Two", "https://status2.example.com/api/", 120, 60, 1500)
        self.assertEqual(pid2, "2")
        prod2 = json.loads(self.cover.get_product("2"))
        self.assertEqual(prod2["id"], pid2)
        self.assertEqual(prod2["name"], "Product Two")

    # -----------------------------------------------------------------------
    # (e) is_covered_for: returns False when terms_hash does not match
    # -----------------------------------------------------------------------
    def test_e_coverguard_is_covered_for_terms_hash_mismatch(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Guard Product", "https://status.guard.example/api/", 60, 30, 1000)
        self.cover.fund_product(pid, 500)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        pol_id = self.cover.buy(pid, 100)

        pol = json.loads(self.cover.get_policy(pol_id))
        correct_terms_hash = pol["terms_hash"]

        # Valid call with correct terms_hash returns True
        self.assertTrue(self.guard.is_covered_for(buyer, pol_id, pid, correct_terms_hash, 100))

        # Tampered / different terms_hash returns False
        fake_terms_hash = "f" * 64
        self.assertFalse(self.guard.is_covered_for(buyer, pol_id, pid, fake_terms_hash, 100))

        # Wrong product ID returns False
        self.assertFalse(self.guard.is_covered_for(buyer, pol_id, "999", correct_terms_hash, 100))

        # Wrong holder returns False
        self.assertFalse(self.guard.is_covered_for("0x9999999999999999999999999999999999999999", pol_id, pid, correct_terms_hash, 100))

        # Requesting more coverage than policy has returns False
        self.assertFalse(self.guard.is_covered_for(buyer, pol_id, pid, correct_terms_hash, 200))

    # -----------------------------------------------------------------------
    # (f) attest: stores policy's terms_hash and evidence_url_hash
    # -----------------------------------------------------------------------
    def test_f_attest_stores_policy_terms_and_evidence_url_hash(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Attest Product", "https://status.attest.example/api/s0.md", 60, 30, 1000)
        self.cover.fund_product(pid, 500)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        pol_id = self.cover.buy(pid, 100)

        # Attest call
        aid = self.guard.attest(pol_id)
        self.assertEqual(aid, "1")

        att_rec = json.loads(self.guard.get_attestation(aid))
        pol = json.loads(self.cover.get_policy(pol_id))

        self.assertEqual(att_rec["policy_id"], pol_id)
        self.assertEqual(att_rec["product_id"], pid)
        self.assertEqual(att_rec["terms_hash"], pol["terms_hash"])
        expected_url_hash = hashlib.sha256("https://status.attest.example/api/s0.md".encode("utf-8")).hexdigest()
        self.assertEqual(att_rec["evidence_url_hash"], expected_url_hash)

    # -----------------------------------------------------------------------
    # (g) Pure helper parity: table-driven comparison across 16 combinations
    # -----------------------------------------------------------------------
    def test_g_pure_helper_parity_decide(self):
        statuses = ["OPERATIONAL", "DEGRADED", "OUTAGE", "UNCLEAR"]
        minutes_list = [0, 20, 60, 120]
        min_full = 60
        min_half = 30
        quote_ok = True
        tripwire = False

        count = 0
        for st in statuses:
            for m in minutes_list:
                res_v1 = decide_v1(st, m, min_full, min_half, quote_ok, tripwire)
                res_v2 = decide_v2(st, m, min_full, min_half, quote_ok, tripwire)
                self.assertEqual(
                    res_v1,
                    res_v2,
                    f"Discrepancy at status={st}, minutes={m}: V1={res_v1}, V2={res_v2}",
                )
                count += 1
        self.assertEqual(count, 16)

    # -----------------------------------------------------------------------
    # (h) Ledger invariant fuzz: 5000 random operations maintaining sum == total_minted
    # -----------------------------------------------------------------------
    def test_h_ledger_invariant_fuzz_5000_ops(self):
        random.seed(1337)
        accounts = [
            f"0x{i:040x}" for i in range(1, 6)
        ]
        # Claim credits for all accounts
        for acc in accounts:
            gl.message.sender_address.as_hex = acc
            self.cover.claim_demo_credits()

        # Deterministic web mock
        s0_bytes = self.load_fixture("status-s0-operational.md")
        s1_bytes = self.load_fixture("status-s1-outage-75.md")

        def mock_web_get(url: str):
            return WebResponse(200, s0_bytes)

        gl.nondet.web.handler = mock_web_get
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'

        def check_invariant():
            bal_sum = sum(int(self.cover.balance_of(a)) for a in accounts)
            pool_sum = sum(int(json.loads(p)["pool_balance"]) for p in self.cover.products.values())
            total_minted = int(self.cover.meta.get("total_minted", "0"))
            self.assertEqual(
                bal_sum + pool_sum,
                total_minted,
                f"Ledger invariant broken: balances={bal_sum}, pools={pool_sum}, total={total_minted}",
            )

        check_invariant()

        active_pids = []
        active_pols = []

        for step in range(5000):
            acc = random.choice(accounts)
            gl.message.sender_address.as_hex = acc
            action = random.choice(["create", "fund", "withdraw", "buy", "settle", "cancel"])

            try:
                if action == "create" or not active_pids:
                    pid = self.cover.create_product(
                        f"Prod-{step}",
                        f"https://status.example.com/api/p{step}.md",
                        60,
                        30,
                        random.randint(500, 2000),
                    )
                    active_pids.append(pid)

                elif action == "fund":
                    pid = random.choice(active_pids)
                    bal = int(self.cover.balance_of(acc))
                    if bal > 10:
                        amt = random.randint(1, min(bal, 50))
                        self.cover.fund_product(pid, amt)

                elif action == "withdraw":
                    pid = random.choice(active_pids)
                    prod = json.loads(self.cover.get_product(pid))
                    if prod["creator"] == acc:
                        free = int(prod["pool_balance"]) - int(prod["reserved"])
                        if free > 0:
                            amt = random.randint(1, min(free, 50))
                            self.cover.withdraw_unreserved(pid, amt)

                elif action == "buy":
                    pid = random.choice(active_pids)
                    prod = json.loads(self.cover.get_product(pid))
                    free = int(prod["pool_balance"]) - int(prod["reserved"])
                    bal = int(self.cover.balance_of(acc))
                    if free >= 50 and bal >= 10:
                        cov = min(free, 50)
                        pol_id = self.cover.buy(pid, cov)
                        active_pols.append(pol_id)

                elif action == "cancel" and active_pols:
                    pol_id = random.choice(active_pols)
                    pol = json.loads(self.cover.get_policy(pol_id))
                    if pol["holder"] == acc and pol["status"] == "ACTIVE":
                        self.cover.cancel(pol_id)

                elif action == "settle" and active_pols:
                    pol_id = random.choice(active_pols)
                    pol = json.loads(self.cover.get_policy(pol_id))
                    if pol["status"] == "ACTIVE":
                        # Alternate between s0 and s1
                        if step % 2 == 0:
                            gl.nondet.web.handler = lambda u: WebResponse(200, s1_bytes)
                            gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
                        else:
                            gl.nondet.web.handler = lambda u: WebResponse(200, s0_bytes)
                            gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
                        try:
                            self.cover.settle(pol_id)
                        except gl.vm.UserError:
                            pass
            except gl.vm.UserError:
                pass

            if (step + 1) % 500 == 0:
                check_invariant()

        check_invariant()

    # -----------------------------------------------------------------------
    # (i) Direct Mode mock web response tests on the 10 canonical fixtures
    # -----------------------------------------------------------------------
    def test_i_direct_mode_mock_web_response_fixtures(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Fixture Product", "https://status.fixture.example/api/", 60, 30, 1000)
        self.cover.fund_product(pid, 900)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        s0_bytes = self.load_fixture("status-s0-operational.md")

        def buy_policy():
            gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
            gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
            return self.cover.buy(pid, 100)

        # 1. status-s0-operational.md -> PAGE_UNCHANGED -> NO_PAY
        pol1 = buy_policy()
        res0 = self.cover.settle(pol1)
        self.assertEqual(res0, "NO_PAY")

        # 2. status-s1-outage-75.md -> PAY_100
        pol2 = buy_policy()
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s1_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        res1 = self.cover.settle(pol2)
        self.assertEqual(res1, "PAY_100")

        # 3. status-s2-outage-35.md -> PAY_50
        pol3 = buy_policy()
        s2_bytes = self.load_fixture("status-s2-outage-35.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s2_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 35, "quote": "Status: Major outage. Duration: 35 minutes."}'
        res2 = self.cover.settle(pol3)
        self.assertEqual(res2, "PAY_50")

        # 4. status-s3-outage-20.md -> NO_PAY (<30 min)
        pol4 = buy_policy()
        s3_bytes = self.load_fixture("status-s3-outage-20.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s3_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 20, "quote": "Status: Major outage. Duration: 20 minutes."}'
        res3 = self.cover.settle(pol4)
        self.assertEqual(res3, "NO_PAY")

        # 5. status-s4-degraded-90.md -> PAY_25
        pol5 = buy_policy()
        s4_bytes = self.load_fixture("status-s4-degraded-90.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s4_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "DEGRADED", "minutes": 90, "quote": "Status: Degraded performance. Duration: 90 minutes."}'
        res4 = self.cover.settle(pol5)
        self.assertEqual(res4, "PAY_25")

        # 6. status-s5-operational-reformatted.html -> NO_PAY
        pol6 = buy_policy()
        s5_bytes = self.load_fixture("status-s5-operational-reformatted.html")
        gl.nondet.web.handler = lambda url: WebResponse(200, s5_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        res5 = self.cover.settle(pol6)
        self.assertEqual(res5, "NO_PAY")

        # 7. status-s6-injection.md -> REVIEW (tripwire)
        pol7 = buy_policy()
        s6_bytes = self.load_fixture("status-s6-injection.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s6_bytes)
        res6 = self.cover.settle(pol7)
        self.assertEqual(res6, "REVIEW")

        # 8. status-s7-no-duration.md -> REVIEW (0 min with outage)
        pol8 = buy_policy()
        s7_bytes = self.load_fixture("status-s7-no-duration.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s7_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 0, "quote": "Status: Major outage. Duration: ongoing"}'
        res7 = self.cover.settle(pol8)
        self.assertEqual(res7, "REVIEW")

        # 9. status-s8-already-down.md -> buy refused
        s8_bytes = self.load_fixture("status-s8-already-down.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s8_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 15, "quote": "Status: Outage ongoing 15 minutes."}'
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.buy(pid, 100)
        self.assertEqual(str(cm.exception), "event already in progress or status unclear at purchase")

        # 10. status-s9-too-short.md -> page unreadable (<200 chars)
        s9_bytes = self.load_fixture("status-s9-too-short.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s9_bytes)
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.buy(pid, 100)
        self.assertEqual(str(cm.exception), "page unreadable")


if __name__ == "__main__":
    unittest.main()
