const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("Deploying ProbeExtract (Iteration 1 Prompt) to Studionet...");
  const account = createAccount();
  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const codePath = path.join(__dirname, '../../contracts/ProbeExtract.py');
  const code = fs.readFileSync(codePath, 'utf8');
  const codeSha = crypto.createHash('sha256').update(code, 'utf8').digest('hex');
  console.log("ProbeExtract sha256:", codeSha);

  const t0 = Date.now();
  const deployTxHash = await client.deployContract({
    code: code,
    args: [],
  });
  console.log("Deploy tx submitted. Hash:", deployTxHash);

  const receipt = await client.waitForTransactionReceipt({
    hash: deployTxHash,
    retries: 120,
    interval: 3000,
  });
  const latency = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`Deploy receipt received in ${latency}s:`);
  console.log("  status_name:", receipt.status_name);
  console.log("  result_name:", receipt.result_name);
  const leaderRes = receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  console.log("  leader execution_result:", leaderRes);
  const address = receipt.recipient;
  console.log("ProbeExtract deployed address:", address);

  const outDir = path.join(__dirname, '../../docs/evidence');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(
    path.join(outDir, 'probe_extract_deploy_receipt.json'),
    JSON.stringify({
      contractAddress: address,
      deployTxHash,
      latencySeconds: latency,
      sourceSha256: codeSha,
      deployReceipt: receipt
    }, null, 2)
  );
  console.log("Saved deploy receipt to docs/evidence/probe_extract_deploy_receipt.json");
}

main().catch(err => {
  console.error("Fatal error:", err);
  process.exit(1);
});
