import unittest
import os
import sys
import json
import random

tests_dir = os.path.abspath(os.path.dirname(__file__))
root_dir = os.path.abspath(os.path.join(tests_dir, ".."))
sys.path.insert(0, tests_dir)
sys.path.insert(0, root_dir)

import genlayer
from genlayer import gl, WebResponse
from contracts.Cover import (
    Cover,
    clean_text,
    norm_text,
    quote_in_page,
    number_in_quote,
    decide,
    parse_extraction,
    validate_product_url,
)
from contracts.CoverGuard import CoverGuard


class TestLayer2Mocked(unittest.TestCase):

    def setUp(self):
        self.fixtures_dir = os.path.join(root_dir, "fixtures", "pages")
        self.cover = Cover()
        self.guard = CoverGuard("0x1111111111111111111111111111111111111111")
        gl.contract_registry["0x1111111111111111111111111111111111111111"] = self.cover

    def load_fixture(self, name: str) -> bytes:
        p = os.path.join(self.fixtures_dir, name)
        with open(p, "rb") as f:
            return f.read()

    def test_claim_demo_credits(self):
        gl.message.sender_address.as_hex = "0x2222222222222222222222222222222222222222"
        self.assertEqual(self.cover.balance_of("0x2222222222222222222222222222222222222222"), "0")
        self.cover.claim_demo_credits()
        self.assertEqual(self.cover.balance_of("0x2222222222222222222222222222222222222222"), "1000")

        # Second claim fails
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.claim_demo_credits()
        self.assertEqual(str(cm.exception), "already claimed demo credits")

    def test_product_validation_errors(self):
        gl.message.sender_address.as_hex = "0x1111111111111111111111111111111111111111"

        # Bad name
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("ab", "https://status.nimbus.example/status.md", "major outage lasting 60 min", 60, 30, 1000)
        self.assertEqual(str(cm.exception), "bad name")

        # Bad rule text
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Nimbus", "https://status.nimbus.example/status.md", "short", 60, 30, 1000)
        self.assertEqual(str(cm.exception), "bad rule text")

        # Bad thresholds
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Nimbus", "https://status.nimbus.example/status.md", "major outage lasting 60 min", 30, 60, 1000)
        self.assertEqual(str(cm.exception), "bad thresholds")

        # Bad premium rate
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Nimbus", "https://status.nimbus.example/status.md", "major outage lasting 60 min", 60, 30, 50)
        self.assertEqual(str(cm.exception), "bad premium rate")

    def test_fund_and_solvency_invariants(self):
        gl.message.sender_address.as_hex = "0x3333333333333333333333333333333333333333"
        self.cover.claim_demo_credits()

        pid = self.cover.create_product("Nimbus Cover", "https://status.nimbus.example/status.md", "major outage lasting 60 min", 60, 30, 1000)

        # Fund product
        self.cover.fund_product(pid, 500)
        self.assertEqual(self.cover.balance_of("0x3333333333333333333333333333333333333333"), "500")

        health = json.loads(self.cover.pool_health(pid))
        self.assertEqual(health["pool_balance"], "500")
        self.assertEqual(health["reserved"], "0")
        self.assertEqual(health["free"], "500")

        # Withdraw unreserved
        self.cover.withdraw_unreserved(pid, 200)
        self.assertEqual(self.cover.balance_of("0x3333333333333333333333333333333333333333"), "700")

        # Over-withdraw fails
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.withdraw_unreserved(pid, 400)
        self.assertEqual(str(cm.exception), "withdraw exceeds unreserved")

    def test_buy_and_settle_lifecycle(self):
        underwriter = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        buyer = "0xbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Nimbus Cover", "https://status.nimbus.example/status.md", "major outage lasting 60 min", 60, 30, 1000)
        self.cover.fund_product(pid, 500)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        # Mock web to return s0 (operational)
        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'

        # Buy policy for 100 coverage (premium 10)
        pol_id = self.cover.buy(pid, 100)
        self.assertEqual(pol_id, "1")
        self.assertEqual(self.cover.balance_of(buyer), "990")

        # Pool balance increased by premium (500 + 10 = 510), reserved is 100
        health = json.loads(self.cover.pool_health(pid))
        self.assertEqual(health["pool_balance"], "510")
        self.assertEqual(health["reserved"], "100")
        self.assertEqual(health["free"], "410")

        # Test PAGE_UNCHANGED gate on immediate settle
        outcome = self.cover.settle(pol_id)
        self.assertEqual(outcome, "NO_PAY")

        # Duplicate observation error on repeat
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertTrue(str(cm.exception).startswith("duplicate observation:"))

        # Settle on s1 (75 minutes outage -> PAY_100)
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s1_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'

        outcome_s1 = self.cover.settle(pol_id)
        self.assertEqual(outcome_s1, "PAY_100")

        # Verify buyer received 100 payout (990 + 100 = 1090)
        self.assertEqual(self.cover.balance_of(buyer), "1090")
        # Policy is PAID
        pol = json.loads(self.cover.get_policy(pol_id))
        self.assertEqual(pol["status"], "PAID")
        self.assertEqual(pol["paid_amount"], "100")

        # Settling again fails with "policy not active"
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "policy not active")

    def test_cover_guard_checks_and_attestation(self):
        underwriter = "0xcccccccccccccccccccccccccccccccccccccccc"
        holder = "0xdddddddddddddddddddddddddddddddddddddddd"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Nimbus", "https://status.nimbus.example/status.md", "rule text 60 min outage", 60, 30, 1000)
        self.cover.fund_product(pid, 500)

        gl.message.sender_address.as_hex = holder
        self.cover.claim_demo_credits()

        # Buy policy
        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational. No incident in progress."}'
        pol_id = self.cover.buy(pid, 100)

        # Check CoverGuard is_covered
        covered_raw = self.guard.is_covered(holder, pol_id)
        covered_data = json.loads(covered_raw)
        self.assertEqual(covered_data["covered"], "true")
        self.assertEqual(covered_data["reason"], "OK")

        # Attest succeeds
        gl.message.sender_address.as_hex = holder
        aid = self.guard.attest(pol_id)
        self.assertEqual(aid, "1")

        att_raw = self.guard.get_attestation(aid)
        att = json.loads(att_raw)
        self.assertEqual(att["policy_id"], pol_id)
        self.assertEqual(att["attester"], holder)

        # Settle payout -> policy enters PAID
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s1_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        self.cover.settle(pol_id)

        # Now is_covered returns false with reason PAID
        covered_raw_paid = self.guard.is_covered(holder, pol_id)
        covered_paid_data = json.loads(covered_raw_paid)
        self.assertEqual(covered_paid_data["covered"], "false")
        self.assertEqual(covered_paid_data["reason"], "PAID")

        # Attest now fails with UserError
        with self.assertRaises(gl.vm.UserError) as cm:
            self.guard.attest(pol_id)
        self.assertEqual(str(cm.exception), "not covered: PAID")

    def test_decide_parity_20_cases(self):
        """Parity test of 25 cases verifying decide and pure helper logic."""
        cases = [
            # (status, minutes, min_full, min_half, quote_ok, tripwire, expected)
            ("UNCLEAR", 100, 60, 30, True, False, "REVIEW"),
            ("OUTAGE", 100, 60, 30, False, False, "REVIEW"),
            ("OUTAGE", 100, 60, 30, True, True, "REVIEW"),
            ("OPERATIONAL", 0, 60, 30, True, False, "NO_PAY"),
            ("OPERATIONAL", 100, 60, 30, True, False, "NO_PAY"),
            ("OUTAGE", 0, 60, 30, True, False, "REVIEW"),
            ("DEGRADED", 0, 60, 30, True, False, "REVIEW"),
            ("OUTAGE", 75, 60, 30, True, False, "PAY_100"),
            ("OUTAGE", 60, 60, 30, True, False, "PAY_100"),
            ("OUTAGE", 59, 60, 30, True, False, "PAY_50"),
            ("OUTAGE", 35, 60, 30, True, False, "PAY_50"),
            ("OUTAGE", 30, 60, 30, True, False, "PAY_50"),
            ("OUTAGE", 29, 60, 30, True, False, "NO_PAY"),
            ("OUTAGE", 20, 60, 30, True, False, "NO_PAY"),
            ("OUTAGE", 1, 60, 30, True, False, "NO_PAY"),
            ("DEGRADED", 90, 60, 30, True, False, "PAY_25"),
            ("DEGRADED", 60, 60, 30, True, False, "PAY_25"),
            ("DEGRADED", 59, 60, 30, True, False, "NO_PAY"),
            ("DEGRADED", 10, 60, 30, True, False, "NO_PAY"),
            ("DEGRADED", 1, 60, 30, True, False, "NO_PAY"),
            ("UNCLEAR", 100, 60, 30, True, False, "REVIEW"),
            ("OUTAGE", -5, 60, 30, True, False, "REVIEW"),
            ("DEGRADED", -1, 60, 30, True, False, "REVIEW"),
            ("OUTAGE", 10000, 60, 30, True, False, "PAY_100"),
            ("DEGRADED", 10000, 60, 30, True, False, "PAY_25"),
        ]
        self.assertGreaterEqual(len(cases), 20)
        for st, m, mf, mh, qok, tw, exp in cases:
            res = decide(st, m, mf, mh, qok, tw)
            self.assertEqual(res, exp, f"Failed on case: {st}, {m}, {mf}, {mh}, {qok}, {tw} -> got {res}, expected {exp}")

        # Pure helper tests
        self.assertTrue(quote_in_page("Duration: 75 minutes.", "Status: Outage.\nDuration: 75 minutes.\nIncident active."))
        self.assertFalse(quote_in_page("short", "Short text."))  # <8 chars rejected
        self.assertFalse(quote_in_page("Not on the page at all", "Status: Outage."))
        self.assertTrue(number_in_quote("Duration: 75 minutes.", 75))
        self.assertFalse(number_in_quote("Duration: 75 minutes.", 50))
        self.assertFalse(number_in_quote("Duration: 175 minutes.", 75))  # Exact token check
        self.assertFalse(number_in_quote("Duration: negative minutes.", -1))

        # HTML cleaning
        html_input = b"<html><head><script>alert(1);</script><style>body{color:red}</style></head><body><h1>Status</h1><p>Operational</p></body></html>"
        cleaned_html = clean_text(html_input)
        self.assertNotIn("alert", cleaned_html)
        self.assertNotIn("color:red", cleaned_html)
        self.assertIn("Status", cleaned_html)
        self.assertIn("Operational", cleaned_html)

        # Markdown cleaning
        md_input = b"# Status Heading\n- Item 1\n```python\nprint(1)\n```\n[link](http://example.com) **bold** text"
        cleaned_md = clean_text(md_input)
        self.assertNotIn("```", cleaned_md)
        self.assertNotIn("http://example.com", cleaned_md)
        self.assertIn("bold text", cleaned_md)

        # Extraction parsing
        v, s, m, q = parse_extraction('{"status": "OUTAGE", "minutes": 75, "quote": "Incident 75"}')
        self.assertTrue(v)
        self.assertEqual(s, "OUTAGE")
        self.assertEqual(m, 75)
        self.assertEqual(q, "Incident 75")

        v, _, _, _ = parse_extraction('{"status": "OUTAGE", "minutes": 75, "quote": "Q", "extra": 1}')
        self.assertFalse(v)  # Extra key rejected
        v, _, _, _ = parse_extraction('{"status": "OUTAGE", "minutes": 75}')
        self.assertFalse(v)  # Missing key rejected
        v, _, _, _ = parse_extraction('{"status": "INVALID", "minutes": 75, "quote": "Q"}')
        self.assertFalse(v)  # Invalid status enum rejected

    def test_all_user_error_strings(self):
        """Asserts the exact text of every UserError cataloged in docs/ERROR_CODES.md."""
        u1 = "0x1010101010101010101010101010101010101010"
        u2 = "0x2020202020202020202020202020202020202020"

        # 1. already claimed demo credits
        gl.message.sender_address.as_hex = u1
        self.cover.claim_demo_credits()
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.claim_demo_credits()
        self.assertEqual(str(cm.exception), "already claimed demo credits")

        # 2. Strict URL errors
        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("")
        self.assertEqual(str(cm.exception), "bad URL: length must be between 1 and 300 characters")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://example.com/" + ("a" * 300))
        self.assertEqual(str(cm.exception), "bad URL: length must be between 1 and 300 characters")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://example.com/status\u2603.html")
        self.assertEqual(str(cm.exception), "bad URL: must be pure ASCII")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("http://example.com/status.md")
        self.assertEqual(str(cm.exception), "bad URL: scheme must be https")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://user:pass@example.com/status.md")
        self.assertEqual(str(cm.exception), "bad URL: userinfo not allowed")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://example.com/status.md#incident")
        self.assertEqual(str(cm.exception), "bad URL: fragment not allowed")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https:///status.md")
        self.assertEqual(str(cm.exception), "bad URL: missing host")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://127.0.0.1/status.md")
        self.assertEqual(str(cm.exception), "bad URL: IP literals not allowed")

        with self.assertRaises(gl.vm.UserError) as cm:
            validate_product_url("https://example.com:8080/status.md")
        self.assertEqual(str(cm.exception), "bad URL: port must be 443 or omitted")

        # 3. Product creation errors
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("ab", "https://status.example.com/status.md", "plain words rule description 60 min", 60, 30, 1000)
        self.assertEqual(str(cm.exception), "bad name")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Product", "https://status.example.com/status.md", "short", 60, 30, 1000)
        self.assertEqual(str(cm.exception), "bad rule text")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Product", "https://status.example.com/status.md", "plain words rule description 60 min", 30, 60, 1000)
        self.assertEqual(str(cm.exception), "bad thresholds")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.create_product("Product", "https://status.example.com/status.md", "plain words rule description 60 min", 60, 30, 50)
        self.assertEqual(str(cm.exception), "bad premium rate")

        # Valid product
        pid = self.cover.create_product("Valid Product", "https://status.example.com/status.md", "plain words rule description 60 min", 60, 30, 1000)

        # 4. Product ownership / unknown product errors
        gl.message.sender_address.as_hex = u2
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.update_source(pid, "https://status.example.com/status_v2.md")
        self.assertEqual(str(cm.exception), "not creator")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.update_source("999", "https://status.example.com/status_v2.md")
        self.assertEqual(str(cm.exception), "unknown product")

        # 5. Balance & Amount errors
        gl.message.sender_address.as_hex = u1
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.fund_product(pid, 2000)
        self.assertEqual(str(cm.exception), "insufficient balance")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.fund_product(pid, 0)
        self.assertEqual(str(cm.exception), "bad amount")

        self.cover.fund_product(pid, 500)

        # 6. Policy purchase & pool solvency errors
        gl.message.sender_address.as_hex = u2
        self.cover.claim_demo_credits()

        # Coverage amount bounds
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.buy(pid, 5)
        self.assertEqual(str(cm.exception), "bad amount")

        # Pool cannot cover coverage > free pool balance
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.buy(pid, 600)
        self.assertEqual(str(cm.exception), "pool cannot cover this coverage")

        # Buy refusal when status is ongoing outage/degraded (s8)
        s8_bytes = self.load_fixture("status-s8-already-down.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s8_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 120, "quote": "Status: Outage."}'
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.buy(pid, 100)
        self.assertEqual(str(cm.exception), "event already in progress or status unclear at purchase")

        # Buy success on s0
        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational."}'
        pol_id = self.cover.buy(pid, 100)

        # 7. Policy ownership & cancellation errors
        gl.message.sender_address.as_hex = u1  # not holder
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.cancel(pol_id)
        self.assertEqual(str(cm.exception), "not holder")

        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.cancel("999")
        self.assertEqual(str(cm.exception), "unknown policy")

        # Creator withdraw exceeds unreserved
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.withdraw_unreserved(pid, 500)
        self.assertEqual(str(cm.exception), "withdraw exceeds unreserved")

        # 8. Settlement pipeline errors
        # Source unreachable
        def raise_net_err(url):
            raise Exception("connection timeout")
        gl.nondet.web.handler = raise_net_err
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "source unreachable")

        # HTTP status not 200: 404
        gl.nondet.web.handler = lambda url: WebResponse(404, b"Not Found")
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "HTTP status not 200: 404")

        # Page too large (>400KB)
        gl.nondet.web.handler = lambda url: WebResponse(200, b"A" * 400001)
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "page too large")

        # Page unreadable (<200 chars)
        gl.nondet.web.handler = lambda url: WebResponse(200, b"Short body")
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "page unreadable")

        # Settle once on operational -> NO_PAY
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational."}'
        self.cover.settle(pol_id)

        # Duplicate observation error on repeat
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertTrue(str(cm.exception).startswith("duplicate observation:"))

        # Settle on outage -> enters PAID
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s1_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        self.cover.settle(pol_id)

        # Policy not active
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.settle(pol_id)
        self.assertEqual(str(cm.exception), "policy not active")

        # Unknown settlement
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.get_settlement("999")
        self.assertEqual(str(cm.exception), "unknown settlement")

        # Unknown attestation
        with self.assertRaises(gl.vm.UserError) as cm:
            self.guard.get_attestation("999")
        self.assertEqual(str(cm.exception), "unknown attestation")

    def test_update_source_cases(self):
        """Tests host and directory mismatch logic for update_source."""
        creator = "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
        gl.message.sender_address.as_hex = creator
        self.cover.claim_demo_credits()
        pid = self.cover.create_product(
            "Nimbus Service",
            "https://status.nimbus.example/incidents/status.md",
            "outage rule description 60 min",
            60,
            30,
            1000,
        )

        # Valid update within same host & directory
        self.cover.update_source(pid, "https://status.nimbus.example/incidents/current_status.md")
        prod = json.loads(self.cover.get_product(pid))
        self.assertEqual(prod["url"], "https://status.nimbus.example/incidents/current_status.md")

        # Host mismatch fails
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.update_source(pid, "https://status.evil.example/incidents/status.md")
        self.assertEqual(str(cm.exception), "host or directory mismatch on update_source")

        # Directory mismatch fails
        with self.assertRaises(gl.vm.UserError) as cm:
            self.cover.update_source(pid, "https://status.nimbus.example/other_dir/status.md")
        self.assertEqual(str(cm.exception), "host or directory mismatch on update_source")

    def test_cover_guard_reason_table(self):
        """Verifies full reason table for CoverGuard: OK, NO_POLICY, NOT_HOLDER, PAID, CANCELLED, POOL_SHORT."""
        underwriter = "0x3030303030303030303030303030303030303030"
        buyer = "0x4040404040404040404040404040404040404040"
        other = "0x5050505050505050505050505050505050505050"

        gl.message.sender_address.as_hex = underwriter
        self.cover.claim_demo_credits()
        pid = self.cover.create_product("Guard Product", "https://status.guard.example/status.md", "plain words rule description 60 min", 60, 30, 1000)
        self.cover.fund_product(pid, 200)

        gl.message.sender_address.as_hex = buyer
        self.cover.claim_demo_credits()

        s0_bytes = self.load_fixture("status-s0-operational.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational."}'
        pol1 = self.cover.buy(pid, 50)
        pol2 = self.cover.buy(pid, 50)

        # 1. OK
        res = json.loads(self.guard.is_covered(buyer, pol1))
        self.assertEqual(res["covered"], "true")
        self.assertEqual(res["reason"], "OK")

        # 2. NO_POLICY
        res = json.loads(self.guard.is_covered(buyer, "999"))
        self.assertEqual(res["covered"], "false")
        self.assertEqual(res["reason"], "NO_POLICY")

        # 3. NOT_HOLDER
        res = json.loads(self.guard.is_covered(other, pol1))
        self.assertEqual(res["covered"], "false")
        self.assertEqual(res["reason"], "NOT_HOLDER")

        # 4. CANCELLED
        self.cover.cancel(pol2)
        res = json.loads(self.guard.is_covered(buyer, pol2))
        self.assertEqual(res["covered"], "false")
        self.assertEqual(res["reason"], "CANCELLED")

        # 5. PAID
        s1_bytes = self.load_fixture("status-s1-outage-75.md")
        gl.nondet.web.handler = lambda url: WebResponse(200, s1_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OUTAGE", "minutes": 75, "quote": "Status: Major outage. Duration: 75 minutes."}'
        self.cover.settle(pol1)
        res = json.loads(self.guard.is_covered(buyer, pol1))
        self.assertEqual(res["covered"], "false")
        self.assertEqual(res["reason"], "PAID")

        # 6. POOL_SHORT
        gl.nondet.web.handler = lambda url: WebResponse(200, s0_bytes)
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational."}'
        pol3 = self.cover.buy(pid, 50)
        # Artificially alter pool_balance in storage to test POOL_SHORT
        prod_data = json.loads(self.cover.products[pid])
        prod_data["pool_balance"] = "10"
        self.cover.products[pid] = json.dumps(prod_data)
        res = json.loads(self.guard.is_covered(buyer, pol3))
        self.assertEqual(res["covered"], "false")
        self.assertEqual(res["reason"], "POOL_SHORT")

        # is_covered_for tests
        prod_data["pool_balance"] = "200"
        self.cover.products[pid] = json.dumps(prod_data)
        terms_hash = prod_data["terms_hash"]

        # Valid terms match
        self.assertTrue(self.guard.is_covered_for(buyer, pol3, pid, terms_hash, 50))
        # Coverage too high
        self.assertFalse(self.guard.is_covered_for(buyer, pol3, pid, terms_hash, 100))
        # Wrong product ID
        self.assertFalse(self.guard.is_covered_for(buyer, pol3, "999", terms_hash, 50))
        # Wrong terms hash
        self.assertFalse(self.guard.is_covered_for(buyer, pol3, pid, "0xbadhash", 50))
        # Cancelled policy
        self.assertFalse(self.guard.is_covered_for(buyer, pol2, pid, terms_hash, 50))

    def test_5000_sequence_fuzz(self):
        """5000-step random fuzz verifying credit conservation and pool solvency invariants after EVERY step."""
        random.seed(42)
        users = [f"0x{i:02x}" + ("0" * 38) for i in range(1, 11)]

        # Set mock handlers
        s0_bytes = self.load_fixture("status-s0-operational.md")
        s1_bytes = self.load_fixture("status-s1-outage-75.md")

        def web_mock(url):
            return WebResponse(200, s0_bytes if random.random() < 0.6 else s1_bytes)

        gl.nondet.web.handler = web_mock
        gl.nondet.prompt_handler = lambda p: '{"status": "OPERATIONAL", "minutes": 0, "quote": "All systems operational."}'

        created_pids = []
        created_pols = []
        claimed_users = set()

        for step in range(5000):
            action = random.randint(0, 6)
            user = random.choice(users)
            gl.message.sender_address.as_hex = user

            try:
                if action == 0:
                    # Mint demo credits
                    if user not in claimed_users:
                        self.cover.claim_demo_credits()
                        claimed_users.add(user)

                elif action == 1:
                    # Create product
                    if user in claimed_users and int(self.cover.balance_of(user)) >= 50:
                        pid = self.cover.create_product(
                            f"Product {len(created_pids) + 1}",
                            f"https://status.nimbus.example/system_{len(created_pids)}.md",
                            "Outage plain text rule lasting 60 minutes",
                            60,
                            30,
                            random.randint(100, 2000),
                        )
                        created_pids.append(pid)

                elif action == 2:
                    # Fund product
                    if created_pids and user in claimed_users:
                        pid = random.choice(created_pids)
                        bal = int(self.cover.balance_of(user))
                        if bal >= 20:
                            amt = random.randint(10, min(bal, 200))
                            self.cover.fund_product(pid, amt)

                elif action == 3:
                    # Buy policy
                    if created_pids and user in claimed_users:
                        pid = random.choice(created_pids)
                        health = json.loads(self.cover.pool_health(pid))
                        free_pool = int(health["free"])
                        bal = int(self.cover.balance_of(user))
                        if free_pool >= 50 and bal >= 20:
                            cov = random.randint(10, min(free_pool, 100))
                            pol_id = self.cover.buy(pid, cov)
                            created_pols.append((pol_id, user, pid))

                elif action == 4:
                    # Settle policy
                    if created_pols:
                        pol_id, _, _ = random.choice(created_pols)
                        try:
                            self.cover.settle(pol_id)
                        except gl.vm.UserError:
                            pass

                elif action == 5:
                    # Cancel policy
                    if created_pols:
                        pol_id, holder, _ = random.choice(created_pols)
                        gl.message.sender_address.as_hex = holder
                        try:
                            self.cover.cancel(pol_id)
                        except gl.vm.UserError:
                            pass

                elif action == 6:
                    # Withdraw unreserved
                    if created_pids:
                        pid = random.choice(created_pids)
                        prod = json.loads(self.cover.get_product(pid))
                        gl.message.sender_address.as_hex = prod["creator"]
                        health = json.loads(self.cover.pool_health(pid))
                        free = int(health["free"])
                        if free > 10:
                            amt = random.randint(1, min(free, 50))
                            self.cover.withdraw_unreserved(pid, amt)

            except gl.vm.UserError:
                # Handled business errors are valid
                pass

            # Invariant Assertions After Every Single Step
            total_minted = len(claimed_users) * 1000
            sum_balances = sum(int(self.cover.balance_of(u)) for u in users)
            sum_pool_balances = sum(int(json.loads(self.cover.get_product(p))["pool_balance"]) for p in created_pids)

            # 1. Total credit conservation
            self.assertEqual(
                sum_balances + sum_pool_balances,
                total_minted,
                f"Conservation invariant violated at step {step}: balances={sum_balances}, pools={sum_pool_balances}, minted={total_minted}",
            )

            # 2. Per-pool solvency & reservation
            for pid in created_pids:
                health = json.loads(self.cover.pool_health(pid))
                pb = int(health["pool_balance"])
                res = int(health["reserved"])
                self.assertLessEqual(res, pb, f"Solvency invariant violated for product {pid} at step {step}: reserved={res} > pool_balance={pb}")

                # Reserved must equal exact sum of active policies for this product
                active_cov = 0
                for pol_id, _, pol_pid in created_pols:
                    if pol_pid == pid:
                        p_data = json.loads(self.cover.get_policy(pol_id))
                        if p_data["status"] == "ACTIVE":
                            active_cov += int(p_data["coverage"])
                self.assertEqual(res, active_cov, f"Coverage reservation equality violated for product {pid} at step {step}: reserved={res} != active_cov={active_cov}")


if __name__ == "__main__":
    unittest.main()
