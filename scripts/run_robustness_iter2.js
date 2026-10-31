const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const fs = require('fs');
const path = require('path');
const { createClient, chains, createAccount } = require('genlayer-js');
const { generatePrivateKey } = require('viem/accounts');

const PROMPT_SHA256 = '90be3b95dd867b8cc3a04f9464e3a1ab3b499343d3c4a40664042651092ecca1';
const PROBE_ADDRESS = '0x3c302641001E563ce20d4ea6376f9BfA10165877';

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

function parseExtraction(rawLlm) {
  if (!rawLlm || typeof rawLlm !== 'string') return [false, 'UNCLEAR', 0, ''];
  let clean = rawLlm.replace(/```json/g, '').replace(/```/g, '').trim();
  try {
    const data = JSON.parse(clean);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return [false, 'UNCLEAR', 0, ''];
    const validKeys = new Set(['status', 'minutes', 'quote']);
    for (const k of Object.keys(data)) {
      if (!validKeys.has(k)) return [false, 'UNCLEAR', 0, ''];
    }
    const validStatuses = new Set(['OPERATIONAL', 'DEGRADED', 'OUTAGE', 'UNCLEAR']);
    let status = String(data.status || '').trim().toUpperCase();
    if (!validStatuses.has(status)) status = 'UNCLEAR';
    let minutes = parseInt(data.minutes, 10);
    if (isNaN(minutes) || minutes < 0) minutes = 0;
    let quote = String(data.quote || '').trim().slice(0, 300);
    return [true, status, minutes, quote];
  } catch (e) {
    return [false, 'UNCLEAR', 0, ''];
  }
}

function decide(status, minutes, quoteValid, minFull, minHalf) {
  if (!quoteValid) {
    if (status === 'OPERATIONAL') return 'NO_PAY';
    return 'REVIEW';
  }
  if (status === 'OPERATIONAL') return 'NO_PAY';
  if (status === 'UNCLEAR') return 'REVIEW';
  if (status === 'OUTAGE') {
    if (minutes >= minFull) return 'PAY_100';
    if (minutes >= minHalf) return 'PAY_50';
    if (minutes > 0) return 'NO_PAY';
    return 'REVIEW';
  }
  if (status === 'DEGRADED') {
    if (minutes >= minFull) return 'PAY_25';
    return 'NO_PAY';
  }
  return 'REVIEW';
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
  const iter2Dir = path.join(__dirname, '../docs/evidence/robustness/iter2');
  if (!fs.existsSync(iter2Dir)) fs.mkdirSync(iter2Dir, { recursive: true });

  const targetFixtures = [
    { file: 'status-s1-outage-75.md', slug: 's1', expected: 'PAY_100' },
    { file: 'status-s2-outage-35.md', slug: 's2', expected: 'PAY_50' },
    { file: 'status-s3-outage-20.md', slug: 's3', expected: 'NO_PAY' },
    { file: 'status-s4-degraded-90.md', slug: 's4', expected: 'PAY_25' },
    { file: 'status-s5-operational-reformatted.html', slug: 's5', expected: 'NO_PAY' },
    { file: 'status-s7-no-duration.md', slug: 's7', expected: 'REVIEW' },
  ];

  const client = createClient({
    chain: chains.studionet,
    account: createAccount(generatePrivateKey()),
  });

  const summary = {};

  for (const fix of targetFixtures) {
    const rawContent = fs.readFileSync(path.join(pagesDir, fix.file), 'utf8');
    const cleaned = cleanText(rawContent);

    console.log(`\n======================================================`);
    console.log(`Starting Iteration 2 batch for: ${fix.file} (Expected: ${fix.expected})`);
    console.log(`======================================================`);

    summary[fix.file] = {
      expected: fix.expected,
      total_runs: 0,
      parse_successes: 0,
      outcome_matches: 0,
      pass_rule_met: false,
    };

    for (let run = 1; run <= 10; run++) {
      const runKey = `${fix.slug}_iter2_${run}`;
      const runFilePath = path.join(iter2Dir, `run_${fix.slug}_${run}.json`);

      // Resume check
      if (fs.existsSync(runFilePath)) {
        try {
          const saved = JSON.parse(fs.readFileSync(runFilePath, 'utf8'));
          if (saved.tx_hash && saved.raw_output) {
            console.log(`[Run ${run}/10] ${fix.slug}: Resumed from saved file (tx=${saved.tx_hash.slice(0, 10)}...)`);
            summary[fix.file].total_runs++;
            if (saved.parsed_valid) summary[fix.file].parse_successes++;
            if (saved.computed_outcome === fix.expected) summary[fix.file].outcome_matches++;
            continue;
          }
        } catch (e) {}
      }

      console.log(`[Run ${run}/10] Submitting extract_page for ${fix.slug}...`);
      const t0 = Date.now();

      let txHash = null;
      let sendAttempts = 0;
      while (!txHash && sendAttempts < 15) {
        sendAttempts++;
        try {
          txHash = await client.writeContract({
            address: PROBE_ADDRESS,
            functionName: 'extract_page',
            args: [runKey, cleaned],
            value: 0n,
          });
        } catch (err) {
          const msg = err.message || '';
          if (msg.includes('Rate limit') || msg.includes('429')) {
            console.log(`  RPC Rate limit hit on send. Backing off for 12s (attempt ${sendAttempts}/15)...`);
            await new Promise(r => setTimeout(r, 12000));
          } else {
            console.log(`  Transient error: ${msg.slice(0, 100)}. Retrying in 8s...`);
            await new Promise(r => setTimeout(r, 8000));
          }
        }
      }

      if (!txHash) {
        throw new Error(`Failed to send tx for ${runKey} after 15 attempts`);
      }

      console.log(`  Tx sent: ${txHash}. Awaiting receipt...`);
      const receipt = await pollReceiptViaRpc(txHash);
      const latency = ((Date.now() - t0) / 1000).toFixed(2);
      console.log(`  Receipt in ${latency}s: status=${receipt.status_name || receipt.status}, result=${receipt.result_name || receipt.result}`);

      // Read back raw LLM output from probe storage
      let rawOutput = '';
      for (let readAttempt = 1; readAttempt <= 5; readAttempt++) {
        try {
          rawOutput = await client.readContract({
            address: PROBE_ADDRESS,
            functionName: 'get_result',
            args: [runKey],
          });
          if (rawOutput) break;
        } catch (e) {
          await new Promise(r => setTimeout(r, 3000));
        }
      }

      console.log(`  Raw Model Output: ${rawOutput ? rawOutput.replace(/\n/g, ' ') : '<empty>'}`);

      // Deterministic validation
      const [parsedValid, status, minutes, quote] = parseExtraction(rawOutput);
      let quoteValid = false;
      if (parsedValid) {
        const inPage = quoteInPage(quote, cleaned);
        const numInQuote = minutes > 0 ? numberInQuote(quote, minutes) : true;
        quoteValid = inPage && numInQuote;
      }
      const computedOutcome = decide(status, minutes, quoteValid, 60, 30);
      const match = computedOutcome === fix.expected;

      console.log(`  Validation: parsed=${parsedValid}, status=${status}, min=${minutes}, quoteValid=${quoteValid} -> outcome=${computedOutcome} (Expected: ${fix.expected}) [${match ? 'MATCH' : 'MISMATCH'}]`);

      const runRecord = {
        fixture: fix.file,
        run_number: run,
        prompt_sha256: PROMPT_SHA256,
        tx_hash: txHash,
        latency_seconds: latency,
        raw_output: rawOutput,
        parsed_valid: parsedValid,
        extracted: { status, minutes, quote },
        quote_valid: quoteValid,
        computed_outcome: computedOutcome,
        expected_outcome: fix.expected,
        outcome_match: match,
      };

      fs.writeFileSync(runFilePath, JSON.stringify(runRecord, null, 2));

      summary[fix.file].total_runs++;
      if (parsedValid) summary[fix.file].parse_successes++;
      if (match) summary[fix.file].outcome_matches++;

      // Minimum 8 seconds spacing between iterations to respect RPC rate limits
      await new Promise(r => setTimeout(r, 8000));
    }

    const s = summary[fix.file];
    s.pass_rule_met = s.parse_successes === 10 && s.outcome_matches >= 9;
    console.log(`Result for ${fix.file}: parse=${s.parse_successes}/10, matches=${s.outcome_matches}/10, PASS=${s.pass_rule_met}`);
  }

  const summaryRecord = {
    contract_address: PROBE_ADDRESS,
    prompt_sha256: PROMPT_SHA256,
    summary,
    total_runs: 60,
  };

  fs.writeFileSync(path.join(iter2Dir, 'summary.json'), JSON.stringify(summaryRecord, null, 2));
  console.log('\n======================================================');
  console.log('Iteration 2 robustness run complete!');
  console.log('Saved summary to docs/evidence/robustness/iter2/summary.json');
  console.log('======================================================');
}

main().catch(err => {
  console.error('Fatal error in Iteration 2 batch:', err);
  process.exit(1);
});
