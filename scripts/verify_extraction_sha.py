import os
import hashlib
import re

COVER_V1_PATH = r"E:\Cover_V2.1\contracts\Cover.py"

def get_hashes(filepath):
    with open(filepath, "r", encoding="utf-8") as f:
        src = f.read()

    # 1. parse_extraction function body
    pe_match = re.search(r"(def parse_extraction\(text: str\).*?)(?=\ndef|\nclass|\Z)", src, re.DOTALL)
    if not pe_match:
        raise ValueError(f"parse_extraction not found in {filepath}")
    pe_code = pe_match.group(1).strip()
    pe_sha256 = hashlib.sha256(pe_code.encode("utf-8")).hexdigest()

    # 2. extraction prompt (the instructions string)
    prompt_match = re.search(r"\"instructions\":\s*\((.*?)\),", src, re.DOTALL)
    if not prompt_match:
        raise ValueError(f"extraction prompt instructions not found in {filepath}")
    prompt_str = prompt_match.group(1).strip()
    prompt_sha256 = hashlib.sha256(prompt_str.encode("utf-8")).hexdigest()

    return {
        "file": filepath,
        "parse_extraction_sha256": pe_sha256,
        "extraction_prompt_sha256": prompt_sha256,
        "parse_extraction_len": len(pe_code),
        "prompt_len": len(prompt_str),
    }

if __name__ == "__main__":
    v1_info = get_hashes(COVER_V1_PATH)
    print("======================================================")
    print("V1 EXTRACTION PROMPT & PARSE_EXTRACTION BASELINE HASHES")
    print("======================================================")
    print(f"File:                    {v1_info['file']}")
    print(f"parse_extraction SHA256: {v1_info['parse_extraction_sha256']}")
    print(f"extraction prompt SHA256:{v1_info['extraction_prompt_sha256']}")
    print("======================================================")
