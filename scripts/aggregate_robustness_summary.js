const fs = require('fs');
const path = require('path');

function getRunsFromDir(dir, prefix) {
  const regex = new RegExp(`^run_${prefix}_\\d+\\.json$`);
  const files = fs.readdirSync(dir).filter(f => regex.test(f));
  const runs = [];
  for (const f of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      runs.push(data);
    } catch (e) {}
  }
  return runs;
}

function summarizeBatch(runs, expectedOutcome) {
  const total = runs.length;
  let parsed = 0;
  let matches = 0;
  for (const r of runs) {
    if (r.parsed_valid) parsed++;
    if (r.computed_outcome === expectedOutcome || (r.outcome_match === true)) matches++;
  }
  const pass = total === 10 && parsed === 10 && matches >= 9;
  return { total, parsed, matches, pass };
}

function main() {
  const iter0Dir = path.join(__dirname, '../docs/evidence/robustness/iter0');
  const iter1Dir = path.join(__dirname, '../docs/evidence/robustness/iter1');
  const iter2Dir = path.join(__dirname, '../docs/evidence/robustness/iter2');

  const fixtures = [
    { key: 's1', file: 'status-s1-outage-75.md', exp: 'PAY_100' },
    { key: 's2', file: 'status-s2-outage-35.md', exp: 'PAY_50' },
    { key: 's3', file: 'status-s3-outage-20.md', exp: 'NO_PAY' },
    { key: 's4', file: 'status-s4-degraded-90.md', exp: 'PAY_25' },
    { key: 's5', file: 'status-s5-operational-reformatted.html', exp: 'NO_PAY' },
    { key: 's7', file: 'status-s7-no-duration.md', exp: 'REVIEW' },
  ];

  console.log('--- Iteration 2 Run Counts ---');
  for (const fix of fixtures) {
    const runs = getRunsFromDir(iter2Dir, fix.key);
    console.log(`${fix.key} (${fix.file}): ${runs.length} runs`);
  }
  const s4Rerun = getRunsFromDir(iter2Dir, 's4_rerun');
  console.log(`s4_rerun: ${s4Rerun.length} runs`);

  // Build summary object for Iteration 2
  const iter2Summary = {
    contract_address: '0x3c302641001E563ce20d4ea6376f9BfA10165877',
    prompt_sha256: '90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1',
    batches: {}
  };

  for (const fix of fixtures) {
    const runs = getRunsFromDir(iter2Dir, fix.key);
    iter2Summary.batches[fix.key] = summarizeBatch(runs, fix.exp);
  }
  iter2Summary.batches['s4_rerun'] = summarizeBatch(s4Rerun, 'PAY_25');

  fs.writeFileSync(path.join(iter2Dir, 'summary.json'), JSON.stringify(iter2Summary, null, 2));
  console.log('Saved Iteration 2 summary.json');
}

main();
