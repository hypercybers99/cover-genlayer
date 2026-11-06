import fs from 'fs';
import path from 'path';

function collectRepoHexStrings() {
  const hexSet = new Set();
  
  function scan(dir) {
    for (const f of fs.readdirSync(dir)) {
      if (f === 'node_modules' || f === '.git') continue;
      const full = path.join(dir, f);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) {
        scan(full);
      } else if (f.endsWith('.json') || f.endsWith('.md') || f.endsWith('.py') || f.endsWith('.js')) {
        const content = fs.readFileSync(full, 'utf8');
        // Match 0x followed by 40 hex chars (addresses)
        const addresses = content.match(/0x[a-fA-F0-9]{40}/g) || [];
        for (const a of addresses) hexSet.add(a.toLowerCase());
        // Match 0x followed by 64 hex chars (tx hashes)
        const txHashes = content.match(/0x[a-fA-F0-9]{64}/g) || [];
        for (const t of txHashes) hexSet.add(t.toLowerCase());
        // Match standalone 64-char hex strings (SHA-256)
        const shaHashes = content.match(/\b[a-fA-F0-9]{64}\b/g) || [];
        for (const s of shaHashes) hexSet.add(s.toLowerCase());
      }
    }
  }

  scan('.');
  return hexSet;
}

function verifyReport() {
  const reportPath = process.argv[2] || 'docs/FINAL_REPORT.md';
  if (!fs.existsSync(reportPath)) {
    console.error(`Error: ${reportPath} does not exist`);
    process.exit(1);
  }

  const report = fs.readFileSync(reportPath, 'utf8');
  const knownHex = collectRepoHexStrings();

  // Extract all hex tokens from report
  const reportAddresses = (report.match(/0x[a-fA-F0-9]{40}/g) || []).map(s => s.toLowerCase());
  const reportTxHashes = (report.match(/0x[a-fA-F0-9]{64}/g) || []).map(s => s.toLowerCase());
  const reportShaHashes = (report.match(/\b[a-fA-F0-9]{64}\b/g) || []).map(s => s.toLowerCase());

  console.log('======================================================');
  console.log('REPORT HASH & ADDRESS VERIFIER');
  console.log('======================================================');
  console.log(`Known repo hex tokens: ${knownHex.size}`);
  console.log(`Tokens in report: ${reportAddresses.length} addresses, ${reportTxHashes.length} tx hashes, ${reportShaHashes.length} SHA digests`);

  let failures = 0;

  for (const a of reportAddresses) {
    if (!knownHex.has(a)) {
      console.error(`FAILED: Address in report not found in repo evidence: ${a}`);
      failures++;
    }
  }

  for (const t of reportTxHashes) {
    if (!knownHex.has(t)) {
      console.error(`FAILED: Tx hash in report not found in repo evidence: ${t}`);
      failures++;
    }
  }

  for (const s of reportShaHashes) {
    if (!knownHex.has(s)) {
      console.error(`FAILED: SHA hash in report not found in repo evidence: ${s}`);
      failures++;
    }
  }

  if (failures > 0) {
    console.error(`\nVerifier failed with ${failures} unknown tokens!`);
    process.exit(1);
  } else {
    console.log('\nSUCCESS: All addresses, transaction hashes, and SHA digests in FINAL_REPORT exist in repo evidence files.');
    console.log('Zero unverified or invented tokens found.');
  }
}

verifyReport();
