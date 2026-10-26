const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const { createClient, chains, createAccount } = require('genlayer-js');
const { generatePrivateKey } = require('viem/accounts');

const PROMPT_SHA256 = '4d7d1ad1b041fe391182f20abc4e50487deed4cc2d580cb51041efd45d1fbe41';
const PROBE_ADDRESS = '0x8ED26b3925D50EabFFbCe6778315eBCbaB4e7745';

function cleanText(rawStr) {
  let text = rawStr.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/\xa0/g, ' ');
  const isHtml = text.toLowerCase().includes('<html') || text.toLowerCase().includes('<body') || text.toLowerCase().includes('<div') || text.toLowerCase().includes('<p>');
  if (isHtml) {
    text = text.replace(/<script.*?>.*?<\/script>/gis, ' ');
    text = text.replace(/<style.*?>.*?<\/style>/gis, ' ');
    text = text.replace(/<!--.*?-->/gs, ' ');
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/?(?:p|div|h[1-6]|li|tr|th|td|blockquote|section|article|header|footer)\b[^>]*>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' ');
  } else {
    text = text.replace(/```.*?```/gs, ' ');
    text = text.replace(/`[^`]+`/g, ' ');
    text = text.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
    text = text.replace(/^[ \t]*[#]+[ \t]*/gm, '');
    text = text.replace(/^[ \t]*[-*+][ \t]+/gm, '');
    text = text.replace(/^[ \t]*\d+\.[ \t]+/gm, '');
    text = text.replace(/[*_~]/g, '');
  }
  text = text.replace(/\u201c/g, '"').replace(/\u201d/g, '"').replace(/\u2018/g, "'").replace(/\u2019/g, "'").replace(/\u2013/g, '-').replace(/\u2014/g, '-');
  return text.split('\n').map(l => l.trim()).filter(Boolean).join('\n');
}

function normText(s) {
  if (!s) return '';
  return s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
}

function quoteInPage(quote, pageText) {
  const qNorm = normText(quote);
  if (qNorm.length < 8) return false;
  const pNorm = normText(pageText);
  return (' ' + pNorm + ' ').includes(' ' + qNorm + ' ');
}

function numberInQuote(quote, n) {
  if (n < 0) return false;
  const qNorm = normText(quote);
  const tokens = qNorm.split(/\s+/);
  return tokens.includes(String(n));
}

function decide(status, minutes, minFull, minHalf, quoteOk, tripwire) {
  if (tripwire) return 'REVIEW';
  if (status === 'UNCLEAR' || !quoteOk) return 'REVIEW';
  if (status === 'OPERATIONAL') return 'NO_PAY';
  if ((status === 'OUTAGE' || status === 'DEGRADED') && minutes < 1) return 'REVIEW';
  if (status === 'OUTAGE' && minutes >= minFull) return 'PAY_100';
  if (status === 'OUTAGE' && minutes >= minHalf) return 'PAY_50';
  if (status === 'DEGRADED' && minutes >= minFull) return 'PAY_25';
  return 'NO_PAY';
}

function parseExtraction(text) {
  if (!text) return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  let cleaned = text.trim();
  if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7);
  else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3);
  if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3);
  cleaned = cleaned.trim();

  let obj;
  try {
    obj = JSON.parse(cleaned);
  } catch (e) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  const keys = Object.keys(obj);
  if (keys.length !== 3 || !keys.includes('status') || !keys.includes('minutes') || !keys.includes('quote')) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  const st = obj.status;
  const m = obj.minutes;
  const q = obj.quote;
  if (!['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'UNCLEAR'].includes(st)) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  if (typeof m !== 'number' || !Number.isInteger(m) || m < 0 || m > 100000) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  if (typeof q !== 'string' || q.length > 300) {
    return { valid: false, status: 'UNCLEAR', minutes: 0, quote: '' };
  }
  return { valid: true, status: st, minutes: m, quote: q };
}

async function pollReceiptViaRpc(txHash, maxAttempts = 35, intervalMs = 4000) {
  for (let i = 1; i <= maxAttempts; i++) {
    await new Promise(r => setTimeout(r, intervalMs));
    try {
      const res = await fetch('https://studio.genlayer.com/api', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'eth_getTransactionByHash',
          params: [txHash],
          id: i
        })
      });
      const data = await res.json();
      const txObj = data.result;
      const st = txObj?.status_name || txObj?.status;
      if (txObj && (st === 'ACCEPTED' || st === 'FINALIZED' || st === 'UNDETERMINED')) {
        return txObj;
      }
    } catch (e) {
      // transient
    }
  }
  throw new Error(`Receipt timeout for ${txHash}`);
}

async function main() {
  const pagesDir = path.join(__dirname, '../fixtures/pages');
  const iter1Dir = path.join(__dirname, '../docs/evidence/robustness/iter1');
  if (!fs.existsSync(iter1Dir)) fs.mkdirSync(iter1Dir, { recursive: true });

  const targetFixtures = [
    { file: 'status-s1-outage-75.md', slug: 's1', expected: 'PAY_100' },
    { file: 'status-s2-outage-35.md', slug: 's2', expected: 'PAY_50' },
    { file: 'status-s3-outage-20.md', slug: 's3', expected: 'NO_PAY' },
    { file: 'status-s4-degraded-90.md', slug: 's4', expected: 'PAY_25' },
    { file: 'status-s5-operational-reformatted.html', slug: 's5', expected: 'NO_PAY' },
    { file: 'status-s7-no-duration.md', slug: 's7', expected: 'REVIEW' },
  ];

  console.log('===============================================================');
  console.log('COVER: ROBUSTNESS BATCH - ITERATION 1');
  console.log('Contract Address:', PROBE_ADDRESS);
  console.log('Prompt SHA-256:', PROMPT_SHA256);
  console.log('===============================================================');

  for (const item of targetFixtures) {
    const rawContent = fs.readFileSync(path.join(pagesDir, item.file), 'utf8');
    const cleaned = cleanText(rawContent);

    console.log(`\n--- Fixture: ${item.file} (Slug: ${item.slug}, Expected: ${item.expected}) ---`);

    for (let i = 1; i <= 10; i++) {
      const runFile = path.join(iter1Dir, `run_${item.slug}_${i}.json`);
      if (fs.existsSync(runFile)) {
        console.log(`  Run ${i}/10 already exists at ${path.basename(runFile)}. Skipping.`);
        continue;
      }

      const key = `${item.slug}_run_${i}`;
      console.log(`  [${item.slug}] Executing Run ${i}/10...`);

      const account = createAccount(generatePrivateKey());
      const client = createClient({ chain: chains.studionet, account });

      let txHash = null;
      let txObj = null;
      let lat = '0';

      for (let attempt = 1; attempt <= 8; attempt++) {
        try {
          const t0 = Date.now();
          txHash = await client.writeContract({
            address: PROBE_ADDRESS,
            functionName: 'extract_page',
            args: [key, cleaned],
          });
          console.log(`    Tx submitted: ${txHash}. Waiting for receipt...`);
          txObj = await pollReceiptViaRpc(txHash);
          lat = ((Date.now() - t0) / 1000).toFixed(2);
          break;
        } catch (err) {
          const msg = err.message || '';
          let backoffSec = 6;
          if (err.cause?.data?.retry_after_seconds) {
            backoffSec = err.cause.data.retry_after_seconds + 3;
          } else if (msg.includes('Rate limit')) {
            backoffSec = 35;
          }
          console.warn(`    Attempt ${attempt} failed (${msg.slice(0, 80)}). Backing off ${backoffSec}s...`);
          if (attempt === 8) throw err;
          await new Promise(r => setTimeout(r, backoffSec * 1000));
        }
      }

      console.log(`    Receipt in ${lat}s: status=${txObj.status_name}, result=${txObj.result_name}`);

      // Read back raw extraction
      let rawExtract = '';
      for (let attempt = 1; attempt <= 5; attempt++) {
        try {
          rawExtract = await client.readContract({
            address: PROBE_ADDRESS,
            functionName: 'get_result',
            args: [key],
          });
          break;
        } catch (err) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      console.log(`    Raw extraction (${rawExtract.length} chars): ${rawExtract.slice(0, 100)}...`);

      const parsed = parseExtraction(rawExtract);
      let qOk = parsed.valid && quoteInPage(parsed.quote, cleaned);
      if (parsed.minutes > 0 && !numberInQuote(parsed.quote, parsed.minutes)) {
        qOk = false;
      }
      const outcome = parsed.valid ? decide(parsed.status, parsed.minutes, 60, 30, qOk, false) : 'REVIEW';
      const matched = (outcome === item.expected);

      console.log(`    Evaluated: valid=${parsed.valid}, status=${parsed.status}, min=${parsed.minutes}, quoteOk=${qOk} -> outcome=${outcome} (expected=${item.expected}, match=${matched})`);

      const runRecord = {
        fixture: item.file,
        slug: item.slug,
        run_index: i,
        key: key,
        tx_hash: txHash,
        latency_seconds: lat,
        prompt_sha256: PROMPT_SHA256,
        probe_address: PROBE_ADDRESS,
        status_name: txObj.status_name || txObj.status,
        result_name: txObj.result_name,
        raw_output: rawExtract,
        parsed_valid: parsed.valid,
        extracted_status: parsed.status,
        extracted_minutes: parsed.minutes,
        extracted_quote: parsed.quote,
        quote_ok: qOk,
        computed_outcome: outcome,
        expected_outcome: item.expected,
        matched: matched
      };

      fs.writeFileSync(runFile, JSON.stringify(runRecord, null, 2));
      console.log(`    Saved run record to ${path.basename(runFile)}`);

      // Gentle pause between runs to stay safely within rate limit
      await new Promise(r => setTimeout(r, 2500));
    }
  }

  // Compile summary
  console.log('\n===============================================================');
  console.log('COMPILING ITERATION 1 SUMMARY');
  console.log('===============================================================');

  const allFiles = fs.readdirSync(iter1Dir).filter(f => f.startsWith('run_') && f.endsWith('.json'));
  const allRuns = allFiles.map(f => JSON.parse(fs.readFileSync(path.join(iter1Dir, f), 'utf8')));

  const summary = {};
  for (const item of targetFixtures) {
    const pageRuns = allRuns.filter(r => r.slug === item.slug);
    const parseSuccess = pageRuns.filter(r => r.parsed_valid).length;
    const outcomeMatches = pageRuns.filter(r => r.matched).length;
    summary[item.file] = {
      expected: item.expected,
      total_runs: pageRuns.length,
      parse_successes: parseSuccess,
      outcome_matches: outcomeMatches,
      pass_rule_met: (parseSuccess === 10 && outcomeMatches >= 9)
    };
    console.log(`${item.file}: ${parseSuccess}/10 parse, ${outcomeMatches}/10 match -> ${summary[item.file].pass_rule_met ? 'PASS' : 'FAIL'}`);
  }

  fs.writeFileSync(
    path.join(iter1Dir, 'summary.json'),
    JSON.stringify({
      contract_address: PROBE_ADDRESS,
      prompt_sha256: PROMPT_SHA256,
      summary: summary,
      total_runs: allRuns.length
    }, null, 2)
  );
  console.log('Iteration 1 summary written to docs/evidence/robustness/iter1/summary.json');
}

main().catch(err => {
  console.error('Fatal robustness error:', err);
  process.exit(1);
});
