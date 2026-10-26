import json

with open('docs/evidence/robustness/iter0/runs.json', 'r', encoding='utf-8') as f:
    data = json.load(f)

runs = data.get('runs', [])
print(f'Total runs: {len(runs)}')

parse_failures = [r for r in runs if not r.get('parsed_valid')]
print(f'Parse failures: {len(parse_failures)}')

outcome_misses = [r for r in runs if not r.get('matched')]
print(f'Outcome misses: {len(outcome_misses)}')
for m in outcome_misses:
    print(f"\n[{m['fixture']}] Run {m['run_index']}:")
    print(f"  Expected: {m['expected_outcome']} | Computed: {m['computed_outcome']}")
    print(f"  Status: {m['extracted_status']} | Minutes: {m['extracted_minutes']}")
    print(f"  Quote: {repr(m['extracted_quote'])}")
    print(f"  Quote OK: {m['quote_ok']}")
    print(f"  Raw output: {repr(m['raw_output'])}")
