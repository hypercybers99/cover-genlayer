#!/usr/bin/env python3
import os
import subprocess
import re

def count_tests():
    print("======================================================")
    print("COVER-GENLAYER TEST SUITE LAYER BREAKDOWN")
    print("======================================================")
    
    test_files = [
        ("Layer 1 Pure Helpers", "tests/test_pure_helpers.py"),
        ("Layer 1 Star-Trap Adversarial", "tests/test_star_trap.py"),
        ("Layer 2 Mocked Execution", "tests/test_layer2_mocked.py"),
        ("Layer 3 Consensus Simulator", "tests/test_layer3_consensus.py"),
        ("Layer 4 V2 Review Regression", "tests/test_v2_regression.py"),
    ]
    
    total = 0
    for layer_name, file_path in test_files:
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
        tests = re.findall(r"def (test_[a-zA-Z0-9_]+)", content)
        count = len(tests)
        total += count
        print(f"  {layer_name:<32}: {count:>2} tests ({file_path})")
    
    print("------------------------------------------------------")
    print(f"  Total Python Regression Tests     : {total:>2} tests")
    print("======================================================")

if __name__ == "__main__":
    count_tests()
