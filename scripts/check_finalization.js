const fs = require('fs');
const path = require('path');

function collectTxHashes(dir) {
  const hashes = new Set();
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      for (const h of collectTxHashes(fullPath)) {
        hashes.add(h);
      }
    } else if (entry.name.endsWith('.json')) {
      try {
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content.hash && typeof content.hash === 'string') hashes.add(content.hash);
        if (content.tx_hash && typeof content.tx_hash === 'string') hashes.add(content.tx_hash);
        if (content.deployTxHash && typeof content.deployTxHash === 'string') hashes.add(content.deployTxHash);
        if (content.transactions && Array.isArray(content.transactions)) {
          for (const tx of content.transactions) {
            if (tx.tx_hash) hashes.add(tx.tx_hash);
            if (tx.txHash) hashes.add(tx.txHash);
          }
        }
      } catch (e) {}
    }
  }
  return hashes;
}

async function fetchTxStatus(txHash) {
  try {
    const res = await fetch('https://studio.genlayer.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1,
      }),
    });
    const d = await res.json();
    const r = d.result;
    if (!r) return { txHash, status_name: 'NOT_FOUND', result_name: 'NOT_FOUND', leader_result: 'NOT_FOUND' };
    const lr = r.consensus_data?.leader_receipt?.[0]?.execution_result || 'null';
    return {
      txHash,
      status: r.status,
      status_name: r.status_name || r.status,
      result_name: r.result_name || String(r.result),
      leader_result: lr,
    };
  } catch (e) {
    return { txHash, status_name: 'RPC_ERROR', result_name: 'RPC_ERROR', leader_result: 'RPC_ERROR' };
  }
}

async function main() {
  const evidenceDir = path.join(__dirname, '../docs/evidence');
  const hashes = Array.from(collectTxHashes(evidenceDir));
  console.log(`Found ${hashes.length} unique transaction hashes across docs/evidence/`);

  const results = [];
  const statusCounts = {};

  for (let i = 0; i < hashes.length; i++) {
    const h = hashes[i];
    const info = await fetchTxStatus(h);
    info.fetch_time_utc = new Date().toISOString();
    results.push(info);
    statusCounts[info.status_name] = (statusCounts[info.status_name] || 0) + 1;
    if ((i + 1) % 20 === 0 || i === hashes.length - 1) {
      console.log(`Fetched ${i + 1}/${hashes.length}...`);
    }
    // slight pacing
    await new Promise(r => setTimeout(r, 100));
  }

  const outDir = path.join(evidenceDir, 'finalization');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outFile = path.join(outDir, `${timestamp}.json`);
  fs.writeFileSync(outFile, JSON.stringify(results, null, 2));

  console.log('\n======================================================');
  console.log('Finalization check complete!');
  console.log('Saved to:', outFile);
  console.log('\nCounts by status_name:');
  for (const [st, count] of Object.entries(statusCounts)) {
    console.log(`  ${st.padEnd(20)}: ${count}`);
  }
  console.log('======================================================');
}

main().catch(err => {
  console.error('Finalization check failed:', err);
  process.exit(1);
});
