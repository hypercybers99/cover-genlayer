const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

async function main() {
  console.log("Deploying ProbeExtract (Iteration 2 Prompt) to Studionet...");
  const account = createAccount();
  const client = createClient({
    chain: chains.studionet,
    account: account,
  });

  const codePath = path.join(__dirname, '../../contracts/ProbeExtract.py');
  const code = fs.readFileSync(codePath, 'utf8');
  const codeSha = crypto.createHash('sha256').update(code, 'utf8').digest('hex');
  console.log("Local ProbeExtract code SHA-256:", codeSha);

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

  // Extract deployed code from data payload
  const txData = receipt.data;
  let deployedCode = "";
  if (txData && txData.contract_code) {
    deployedCode = Buffer.from(txData.contract_code, 'base64').toString('utf8');
  }

  const outDir = path.join(__dirname, '../../docs/evidence/robustness/iter2');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const first16 = Buffer.from(deployedCode, 'utf8').subarray(0, 16).toString('hex');
  const last16 = Buffer.from(deployedCode, 'utf8').subarray(-16).toString('hex');
  const isMatch = deployedCode === code;

  console.log("\nSource Verification:");
  console.log("  First 16 bytes:", first16);
  console.log("  Last 16 bytes: ", last16);
  console.log("  Deployed byte length:", Buffer.byteLength(deployedCode));
  console.log("  Local byte length:   ", Buffer.byteLength(code));
  console.log("  Byte-for-byte empty diff:", isMatch);

  const receiptRecord = {
    contractAddress: address,
    deployTxHash,
    latencySeconds: latency,
    codeSha256: codeSha,
    status_name: receipt.status_name,
    result_name: receipt.result_name,
    leader_result: leaderRes,
    source_verification: {
      first16,
      last16,
      byteLength: Buffer.byteLength(deployedCode),
      match: isMatch,
    },
    raw_receipt: receipt,
  };

  fs.writeFileSync(
    path.join(outDir, 'probe_extract_deploy_receipt.json'),
    JSON.stringify(receiptRecord, null, 2)
  );
  fs.writeFileSync(
    path.join(outDir, 'ProbeExtract_extracted.py'),
    deployedCode
  );
  console.log("\nSaved receipt to docs/evidence/robustness/iter2/probe_extract_deploy_receipt.json");
}

main().catch(err => {
  console.error("Deploy failed:", err);
  process.exit(1);
});
