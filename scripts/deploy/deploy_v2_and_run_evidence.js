const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Helper to decode base64 error payload
function decodeErrorPayload(receipt) {
  const payload = receipt.consensus_data?.leader_receipt?.[0]?.result?.payload;
  if (!payload) return "";
  try {
    return Buffer.from(payload, 'base64').toString('utf8');
  } catch (e) {
    return String(payload);
  }
}

// Receipt verification rule: ACCEPTED or FINALIZED + MAJORITY_AGREE + leader SUCCESS
function verifyReceiptSuccess(receipt, desc) {
  const statusOk = receipt.status_name === 'ACCEPTED' || receipt.status_name === 'FINALIZED';
  const resultOk = receipt.result_name === 'MAJORITY_AGREE';
  const leaderRes = receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
  const leaderOk = leaderRes === 'SUCCESS';

  if (!statusOk || !resultOk || !leaderOk) {
    const errText = decodeErrorPayload(receipt);
    throw new Error(`Write transaction failed [${desc}]: status=${receipt.status_name}, result=${receipt.result_name}, leader=${leaderRes}, error=${errText}`);
  }
}

async function retryAsync(fn, desc, maxRetries = 15) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const msg = e.message || String(e);
      let waitSeconds = 5;
      if (e.cause?.data?.retry_after_seconds) {
        waitSeconds = e.cause.data.retry_after_seconds + 3;
      } else if (msg.includes("Rate limit") || msg.includes("500 requests")) {
        waitSeconds = 30;
      }
      console.warn(`  [${desc}] Attempt ${attempt}/${maxRetries} failed: ${msg.slice(0, 90)}. Backing off for ${waitSeconds}s...`);
      if (attempt === maxRetries) throw e;
      await new Promise(r => setTimeout(r, waitSeconds * 1000));
    }
  }
}

async function waitForReceiptWithRetry(client, txHash, retries = 150, interval = 3500) {
  for (let attempt = 1; attempt <= 20; attempt++) {
    try {
      return await client.waitForTransactionReceipt({
        hash: txHash,
        retries: retries,
        interval: interval,
      });
    } catch (err) {
      const msg = err.message || "";
      let waitSec = 5;
      if (err.cause?.data?.retry_after_seconds) {
        waitSec = err.cause.data.retry_after_seconds + 3;
      } else if (msg.includes("Rate limit")) {
        waitSec = 30;
      }
      if (attempt === 20) throw err;
      console.warn(`Transient RPC error while waiting for receipt (${msg.slice(0, 80)}...). Retrying receipt poll in ${waitSec}s (attempt ${attempt}/20)...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
    }
  }
}

async function main() {
  console.log("==================================================================");
  console.log("COVER V2: FULL DEPLOYMENT & EMPIRICAL EVIDENCE RUNS ON STUDIONET");
  console.log("==================================================================");

  const underwriter = createAccount();
  const buyer = createAccount();
  console.log("Underwriter account:", underwriter.address);
  console.log("Buyer account:      ", buyer.address);

  const clientUnderwriter = createClient({ chain: chains.studionet, account: underwriter });
  const clientBuyer = createClient({ chain: chains.studionet, account: buyer });

  const coverPath = path.join(__dirname, '../../contracts/CoverV2.py');
  const guardPath = path.join(__dirname, '../../contracts/CoverGuardV2.py');

  // Enforce LF normalization
  const coverCode = fs.readFileSync(coverPath, 'utf8').replace(/\r\n/g, '\n');
  const guardCode = fs.readFileSync(guardPath, 'utf8').replace(/\r\n/g, '\n');

  const coverSha256 = crypto.createHash('sha256').update(coverCode, 'utf8').digest('hex');
  const guardSha256 = crypto.createHash('sha256').update(guardCode, 'utf8').digest('hex');
  console.log("CoverV2 local SHA256:      ", coverSha256);
  console.log("CoverGuardV2 local SHA256: ", guardSha256);

  console.log("\n1. Deploying CoverV2 Contract...");
  const t0 = Date.now();
  const deployCoverTx = await retryAsync(() => clientUnderwriter.deployContract({ code: coverCode, args: [] }), "Deploy CoverV2");
  console.log("CoverV2 deploy tx submitted:", deployCoverTx);
  const coverDeployReceipt = await waitForReceiptWithRetry(clientUnderwriter, deployCoverTx);
  verifyReceiptSuccess(coverDeployReceipt, "Deploy CoverV2");
  const coverAddress = coverDeployReceipt.recipient;
  const coverDeployLat = ((Date.now() - t0) / 1000).toFixed(2);
  console.log(`CoverV2 deployed at: ${coverAddress} in ${coverDeployLat}s`);

  console.log("\n2. Deploying CoverGuardV2 Contract...");
  const tg0 = Date.now();
  const deployGuardTx = await retryAsync(() => clientUnderwriter.deployContract({ code: guardCode, args: [coverAddress] }), "Deploy CoverGuardV2");
  console.log("CoverGuardV2 deploy tx submitted:", deployGuardTx);
  const guardDeployReceipt = await waitForReceiptWithRetry(clientUnderwriter, deployGuardTx);
  verifyReceiptSuccess(guardDeployReceipt, "Deploy CoverGuardV2");
  const guardAddress = guardDeployReceipt.recipient;
  const guardDeployLat = ((Date.now() - tg0) / 1000).toFixed(2);
  console.log(`CoverGuardV2 deployed at: ${guardAddress} in ${guardDeployLat}s`);

  // Ensure evidence directories exist
  const onchainDir = path.join(__dirname, '../../docs/evidence_v2/onchain');
  const sourceDir = path.join(__dirname, '../../docs/evidence_v2/source');
  if (!fs.existsSync(onchainDir)) fs.mkdirSync(onchainDir, { recursive: true });
  if (!fs.existsSync(sourceDir)) fs.mkdirSync(sourceDir, { recursive: true });

  fs.writeFileSync(path.join(onchainDir, 'cover_v2_deploy_receipt.json'), JSON.stringify(coverDeployReceipt, null, 2));
  fs.writeFileSync(path.join(onchainDir, 'cover_guard_v2_deploy_receipt.json'), JSON.stringify(guardDeployReceipt, null, 2));
  fs.writeFileSync(path.join(sourceDir, 'cover_v2_deploy_receipt.json'), JSON.stringify(coverDeployReceipt, null, 2));
  fs.writeFileSync(path.join(sourceDir, 'cover_guard_v2_deploy_receipt.json'), JSON.stringify(guardDeployReceipt, null, 2));

  // Extract deployed source code from deploy transactions to verify byte-for-byte fidelity
  async function verifyDeployedSource(txHash, localPath, outName) {
    const res = await fetch('https://studio.genlayer.com/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_getTransactionByHash',
        params: [txHash],
        id: 1
      })
    });
    const d = await res.json();
    const b64 = d.result?.data?.contract_code || "";
    const rawBuf = Buffer.from(b64, 'base64');
    const localBuf = Buffer.from(fs.readFileSync(localPath, 'utf8').replace(/\r\n/g, '\n'), 'utf8');

    const first16 = rawBuf.subarray(0, 16).toString('hex');
    const last16 = rawBuf.subarray(Math.max(0, rawBuf.length - 16)).toString('hex');
    console.log(`\n[Source Verification: ${outName}]`);
    console.log(`  First 16 bytes: ${first16}`);
    console.log(`  Last 16 bytes:  ${last16}`);
    console.log(`  Deployed byte length: ${rawBuf.length} | Local byte length: ${localBuf.length}`);

    fs.writeFileSync(path.join(onchainDir, `${outName}_extracted.py`), rawBuf);
    fs.writeFileSync(path.join(sourceDir, `${outName}_extracted.py`), rawBuf);

    const match = rawBuf.equals(localBuf);
    const deployedSha256 = crypto.createHash('sha256').update(rawBuf).digest('hex');
    const localSha256 = crypto.createHash('sha256').update(localBuf).digest('hex');
    console.log(`  Deployed SHA256: ${deployedSha256}`);
    console.log(`  Local SHA256:    ${localSha256}`);
    console.log(`  Byte-for-byte identical match: ${match}`);
    return { first16, last16, byteLength: rawBuf.length, match, deployedSha256, localSha256 };
  }

  const coverVerify = await verifyDeployedSource(deployCoverTx, coverPath, 'CoverV2');
  const guardVerify = await verifyDeployedSource(deployGuardTx, guardPath, 'CoverGuardV2');

  // Write deployments_v2.json
  const deployments = {
    network: "studionet",
    chain_id: 61999,
    rpc: "https://studio.genlayer.com/api",
    explorer_urls: {
      cover: `https://explorer-studio.genlayer.com/address/${coverAddress}`,
      cover_guard: `https://explorer-studio.genlayer.com/address/${guardAddress}`,
    },
    addresses: {
      cover: coverAddress,
      cover_guard: guardAddress,
    },
    deploy_txs: {
      cover: deployCoverTx,
      cover_guard: deployGuardTx,
    },
    prompt_sha256: "5a8c842c53e4329313d349afa6932672980dd1e8466af75118eeb8df010daa1d",
    parse_extraction_sha256: "c44e054a7af6a9abb30fbc536895ce61532bf2edf016497d23a53ab094370978",
    source_shas: {
      cover: coverSha256,
      cover_guard: guardSha256,
    },
    source_verification: {
      cover: coverVerify,
      cover_guard: guardVerify,
    },
    latencies: {
      cover: coverDeployLat,
      cover_guard: guardDeployLat,
    }
  };
  fs.writeFileSync(path.join(__dirname, 'deployments_v2.json'), JSON.stringify(deployments, null, 2));
  fs.writeFileSync(path.join(onchainDir, 'deployments_v2.json'), JSON.stringify(deployments, null, 2));
  fs.writeFileSync(path.join(sourceDir, 'deployments_v2.json'), JSON.stringify(deployments, null, 2));

  const evidence = {
    deployments,
    transactions: [],
    readbacks: {},
    balance_snapshots: [],
  };

  async function snapshotBalances(stepName) {
    let uBal = 0, bBal = 0, p1Bal = 0, p1Res = 0, p2Bal = 0, p2Res = 0;
    try {
      const uRes = await clientUnderwriter.readContract({
        address: coverAddress,
        functionName: "balance_of",
        args: [underwriter.address],
      });
      uBal = parseInt(uRes, 10);
    } catch (e) {}

    try {
      const bRes = await clientBuyer.readContract({
        address: coverAddress,
        functionName: "balance_of",
        args: [buyer.address],
      });
      bBal = parseInt(bRes, 10);
    } catch (e) {}

    try {
      const ph1Res = await clientUnderwriter.readContract({
        address: coverAddress,
        functionName: "pool_health",
        args: ["1"],
      });
      const ph1Obj = JSON.parse(ph1Res);
      p1Bal = parseInt(ph1Obj.pool_balance, 10);
      p1Res = parseInt(ph1Obj.reserved, 10);
    } catch (e) {}

    try {
      const ph2Res = await clientUnderwriter.readContract({
        address: coverAddress,
        functionName: "pool_health",
        args: ["2"],
      });
      const ph2Obj = JSON.parse(ph2Res);
      p2Bal = parseInt(ph2Obj.pool_balance, 10);
      p2Res = parseInt(ph2Obj.reserved, 10);
    } catch (e) {}

    const total = uBal + bBal + p1Bal + p2Bal;
    const snap = {
      step: stepName,
      underwriter: uBal,
      buyer: bBal,
      pool_1_balance: p1Bal,
      pool_1_reserved: p1Res,
      pool_2_balance: p2Bal,
      pool_2_reserved: p2Res,
      total_minted: total,
    };
    evidence.balance_snapshots.push(snap);
    console.log(`  [Snapshot ${stepName}]: Underwriter=${uBal}, Buyer=${bBal}, Pool1=${p1Bal} (Res=${p1Res}), Pool2=${p2Bal} (Res=${p2Res}), Total=${total}`);
    return snap;
  }

  async function executeWrite(client, label, addr, fn, args, expectSuccess = true) {
    console.log(`\n--- Write: ${label} (${fn}) ---`);
    const tw0 = Date.now();
    const txHash = await retryAsync(() => client.writeContract({
      address: addr,
      functionName: fn,
      args: args,
    }), `writeContract ${label}`);
    console.log(`Tx submitted: ${txHash}`);

    const receipt = await waitForReceiptWithRetry(client, txHash);
    const lat = ((Date.now() - tw0) / 1000).toFixed(2);
    const leaderRes = receipt.consensus_data?.leader_receipt?.[0]?.execution_result;
    const errText = decodeErrorPayload(receipt);

    console.log(`Receipt in ${lat}s: status=${receipt.status_name}, result=${receipt.result_name}, leader=${leaderRes}`);
    if (errText) console.log(`Decoded payload: ${errText}`);

    if (expectSuccess) {
      verifyReceiptSuccess(receipt, label);
    }

    fs.writeFileSync(path.join(onchainDir, `${label}_receipt.json`), JSON.stringify(receipt, null, 2));

    const rec = {
      label,
      function: fn,
      tx_hash: txHash,
      status_name: receipt.status_name,
      result_name: receipt.result_name,
      leader_result: leaderRes,
      error_payload: errText,
      latency_seconds: lat,
      expected_success: expectSuccess,
    };
    evidence.transactions.push(rec);
    return { receipt, errText, lat };
  }

  const pinnedSha = "92c69bc636517656b9e7ee031a503adfb2d26bb4";
  const rawBase = `https://raw.githubusercontent.com/hypercybers99/cover-fixtures/${pinnedSha}/`;
  const s0Url = rawBase + "status-s0-operational.md";
  const s1Url = rawBase + "status-s1-outage-75.md";
  const s2Url = rawBase + "status-s2-outage-35.md";
  const s3Url = rawBase + "status-s3-outage-20.md";
  const s4Url = rawBase + "status-s4-degraded-90.md";
  const s5Url = rawBase + "status-s5-operational-reformatted.html";
  const s6Url = rawBase + "status-s6-injection.md";
  const s7Url = rawBase + "status-s7-no-duration.md";
  const s8Url = rawBase + "status-s8-already-down.md";
  const s9Url = rawBase + "status-s9-too-short.md";

  // =========================================================================
  // SCENARIO S1: DUAL PRODUCT CREATION & SEPARATE POOL FUNDING
  // =========================================================================
  console.log("\n================ SCENARIO S1: SETUP, DUAL PRODUCTS & FUNDING ================");
  await executeWrite(clientUnderwriter, "s1_claim_credits_underwriter", coverAddress, "claim_demo_credits", []);
  await snapshotBalances("s1_claim_underwriter");

  await executeWrite(clientBuyer, "s1_claim_credits_buyer", coverAddress, "claim_demo_credits", []);
  await snapshotBalances("s1_claim_buyer");

  // Create Product 1 (Nimbus Outage Cover, min_full=60, min_half=30, premium_bps=1000)
  const p1Res = await executeWrite(
    clientUnderwriter,
    "s1_create_product_1",
    coverAddress,
    "create_product",
    ["Nimbus Outage Cover", s0Url, 60, 30, 1000]
  );
  // Extract returned product id from consensus data leader receipt if available
  const p1LeaderData = p1Res.receipt.consensus_data?.leader_receipt?.[0]?.result?.data;
  console.log("Product 1 leader receipt returned data:", p1LeaderData);

  // Create Product 2 (Nimbus Latency Cover, min_full=120, min_half=60, premium_bps=1500)
  const p2Res = await executeWrite(
    clientUnderwriter,
    "s1_create_product_2",
    coverAddress,
    "create_product",
    ["Nimbus Latency Cover", s0Url, 120, 60, 1500]
  );
  const p2LeaderData = p2Res.receipt.consensus_data?.leader_receipt?.[0]?.result?.data;
  console.log("Product 2 leader receipt returned data:", p2LeaderData);

  // Read back products to verify IDs match
  const prod1Raw = await clientUnderwriter.readContract({
    address: coverAddress,
    functionName: "get_product",
    args: ["1"],
  });
  const prod2Raw = await clientUnderwriter.readContract({
    address: coverAddress,
    functionName: "get_product",
    args: ["2"],
  });
  const prod1Obj = JSON.parse(prod1Raw);
  const prod2Obj = JSON.parse(prod2Raw);
  console.log("Product 1 readback ID:", prod1Obj.id, "name:", prod1Obj.name, "terms_hash:", prod1Obj.terms_hash);
  console.log("Product 2 readback ID:", prod2Obj.id, "name:", prod2Obj.name, "terms_hash:", prod2Obj.terms_hash);
  evidence.readbacks.product_1 = prod1Obj;
  evidence.readbacks.product_2 = prod2Obj;

  // Fund Product 1 pool with 400 credits
  await executeWrite(clientUnderwriter, "s1_fund_product_1", coverAddress, "fund_product", ["1", 400]);
  await snapshotBalances("s1_fund_product_1");

  // Fund Product 2 pool with 300 credits
  await executeWrite(clientUnderwriter, "s1_fund_product_2", coverAddress, "fund_product", ["2", 300]);
  await snapshotBalances("s1_fund_product_2");

  // Read back pool healths
  const ph1 = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "pool_health", args: ["1"] }));
  const ph2 = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "pool_health", args: ["2"] }));
  evidence.readbacks.pool_health_1_after_funding = ph1;
  evidence.readbacks.pool_health_2_after_funding = ph2;
  console.log("Pool 1 health:", ph1);
  console.log("Pool 2 health:", ph2);

  // =========================================================================
  // SCENARIO S2: PURCHASE-TIME URL BINDING & SOURCE MUTATION SETTLE
  // =========================================================================
  console.log("\n================ SCENARIO S2: PURCHASE-TIME URL BINDING ================");
  // Buy Policy 1 on Product 1 under s0Url (coverage 100, premium 10)
  await executeWrite(clientBuyer, "s2_buy_policy_1", coverAddress, "buy", ["1", 100]);
  await snapshotBalances("s2_buy_policy_1");

  const pol1Raw = await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: ["1"] });
  const pol1Obj = JSON.parse(pol1Raw);
  console.log("Policy 1 purchased:", pol1Obj);
  evidence.readbacks.policy_1_at_purchase = pol1Obj;

  // Update Product 1 source to s1Url (75 min outage fixture)
  await executeWrite(clientUnderwriter, "s2_update_source_product_1_to_s1", coverAddress, "update_source", ["1", s1Url]);
  const prod1AfterUpdate = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "get_product", args: ["1"] }));
  console.log("Product 1 after update_source:", prod1AfterUpdate);
  evidence.readbacks.product_1_after_update_to_s1 = prod1AfterUpdate;

  // Settle Policy 1: Must read Policy 1's bound evidence_url (s0Url).
  // Because s0Url is unchanged from purchase, it triggers PAGE_UNCHANGED -> NO_PAY.
  await executeWrite(clientBuyer, "s2_settle_policy_1", coverAddress, "settle", ["1"]);
  await snapshotBalances("s2_settle_policy_1");

  const pol1AfterSettle = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: ["1"] }));
  console.log("Policy 1 after settle:", pol1AfterSettle);
  evidence.readbacks.policy_1_after_settle = pol1AfterSettle;

  if (pol1AfterSettle.settlement_id) {
    const s1Rec = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_settlement", args: [pol1AfterSettle.settlement_id] }));
    console.log("Settlement record 1:", s1Rec);
    evidence.readbacks.settlement_1 = s1Rec;
  }

  // Attempt to buy on Product 1 while at s1Url (already down) -> Must fail buy inception check!
  const buyS1Res = await executeWrite(clientBuyer, "s2_buy_refused_while_down_s1", coverAddress, "buy", ["1", 50], false);
  console.log("Buy attempt while down error:", buyS1Res.errText);

  // Update Product 1 to s5Url (reformatted HTML operational)
  await executeWrite(clientUnderwriter, "s2_update_source_product_1_to_s5", coverAddress, "update_source", ["1", s5Url]);

  // Buy Policy 2 on Product 1 under s5Url (coverage 50, premium 5)
  await executeWrite(clientBuyer, "s2_buy_policy_2", coverAddress, "buy", ["1", 50]);
  await snapshotBalances("s2_buy_policy_2");

  const pol2Raw = await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: ["2"] });
  const pol2Obj = JSON.parse(pol2Raw);
  console.log("Policy 2 purchased:", pol2Obj);
  evidence.readbacks.policy_2_at_purchase = pol2Obj;

  // Settle Policy 2: Must read Policy 2's bound evidence_url (s5Url)
  await executeWrite(clientBuyer, "s2_settle_policy_2", coverAddress, "settle", ["2"]);
  await snapshotBalances("s2_settle_policy_2");

  const pol2AfterSettle = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: ["2"] }));
  console.log("Policy 2 after settle:", pol2AfterSettle);
  evidence.readbacks.policy_2_after_settle = pol2AfterSettle;

  // =========================================================================
  // SCENARIO S3: CANONICAL FIXTURE EVALUATIONS
  // =========================================================================
  console.log("\n================ SCENARIO S3: CANONICAL FIXTURES EVALUATIONS ================");
  // Test buy refusal on s8 (already down 120 min)
  await executeWrite(clientUnderwriter, "s3_update_source_s8", coverAddress, "update_source", ["1", s8Url]);
  const buyS8 = await executeWrite(clientBuyer, "s3_buy_refused_s8", coverAddress, "buy", ["1", 50], false);
  console.log("Buy on s8 error:", buyS8.errText);

  // Test input gate on s9 (too short <200 chars)
  await executeWrite(clientUnderwriter, "s3_update_source_s9", coverAddress, "update_source", ["1", s9Url]);
  const buyS9 = await executeWrite(clientBuyer, "s3_buy_refused_s9", coverAddress, "buy", ["1", 50], false);
  console.log("Buy on s9 error:", buyS9.errText);

  // Restore Product 1 source to s0Url
  await executeWrite(clientUnderwriter, "s3_restore_source_s0", coverAddress, "update_source", ["1", s0Url]);

  // Buy Policy 3 under s0Url (coverage 50, premium 5)
  await executeWrite(clientBuyer, "s3_buy_policy_3", coverAddress, "buy", ["1", 50]);
  await snapshotBalances("s3_buy_policy_3");

  // =========================================================================
  // SCENARIO S4: CANCEL, WITHDRAW UNRESERVED, DUPLICATE OBSERVATION, UNKNOWN
  // =========================================================================
  console.log("\n================ SCENARIO S4: EDGE CASES & INVARIANTS ================");
  // Cancel Policy 3
  await executeWrite(clientBuyer, "s4_cancel_policy_3", coverAddress, "cancel", ["3"]);
  await snapshotBalances("s4_cancel_policy_3");
  const pol3AfterCancel = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: ["3"] }));
  console.log("Policy 3 after cancel:", pol3AfterCancel);
  evidence.readbacks.policy_3_after_cancel = pol3AfterCancel;

  // Withdraw 50 unreserved from Product 1 pool
  await executeWrite(clientUnderwriter, "s4_withdraw_unreserved", coverAddress, "withdraw_unreserved", ["1", 50]);
  await snapshotBalances("s4_withdraw_unreserved");

  // Over-withdraw error (attempt to withdraw 100,000)
  const overWithdrawRes = await executeWrite(clientUnderwriter, "s4_withdraw_over_unreserved", coverAddress, "withdraw_unreserved", ["1", 100000], false);
  console.log("Over-withdraw error:", overWithdrawRes.errText);

  // Duplicate observation error: repeat settle on Policy 1 against s0Url
  const dupSettleRes = await executeWrite(clientBuyer, "s4_duplicate_observation_error", coverAddress, "settle", ["1"], false);
  console.log("Duplicate observation error:", dupSettleRes.errText);

  // Unknown policy error on settle and cancel
  const unkSettleRes = await executeWrite(clientBuyer, "s4_unknown_policy_settle", coverAddress, "settle", ["99999"], false);
  console.log("Unknown policy settle error:", unkSettleRes.errText);
  const unkCancelRes = await executeWrite(clientBuyer, "s4_unknown_policy_cancel", coverAddress, "cancel", ["99999"], false);
  console.log("Unknown policy cancel error:", unkCancelRes.errText);

  // =========================================================================
  // SCENARIO S5: COVERGUARD CHECKS & ATTESTATION
  // =========================================================================
  console.log("\n================ SCENARIO S5: COVERGUARD CHECKS & ATTESTATION ================");
  // Check is_covered for Policy 1
  const isCovered1 = JSON.parse(await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered",
    args: [buyer.address, "1"],
  }));
  console.log("is_covered(Policy 1):", isCovered1);
  evidence.readbacks.is_covered_policy_1 = isCovered1;

  // Check is_covered for Policy 3 (cancelled)
  const isCovered3 = JSON.parse(await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered",
    args: [buyer.address, "3"],
  }));
  console.log("is_covered(Policy 3 - CANCELLED):", isCovered3);
  evidence.readbacks.is_covered_policy_3 = isCovered3;

  // Check is_covered_for with matching terms_hash (returns true)
  const termsHashP1 = pol1Obj.terms_hash;
  const isCoveredForMatching = await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered_for",
    args: [buyer.address, "1", "1", termsHashP1, 100],
  });
  console.log("is_covered_for(matching terms_hash):", isCoveredForMatching);
  evidence.readbacks.is_covered_for_matching = isCoveredForMatching;

  // Check is_covered_for with forged terms_hash (returns false)
  const fakeTermsHash = "0000000000000000000000000000000000000000000000000000000000000000";
  const isCoveredForForged = await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered_for",
    args: [buyer.address, "1", "1", fakeTermsHash, 100],
  });
  console.log("is_covered_for(forged terms_hash):", isCoveredForForged);
  evidence.readbacks.is_covered_for_forged = isCoveredForForged;

  // Attest Policy 1
  await executeWrite(clientBuyer, "s5_attest_policy_1", guardAddress, "attest", ["1"]);
  const att1 = JSON.parse(await clientBuyer.readContract({
    address: guardAddress,
    functionName: "get_attestation",
    args: ["1"],
  }));
  console.log("Attestation 1 record:", att1);
  evidence.readbacks.attestation_1 = att1;

  // Attempt attest on Policy 3 (cancelled) -> must fail
  const attestCancelledRes = await executeWrite(clientBuyer, "s5_attest_cancelled_error", guardAddress, "attest", ["3"], false);
  console.log("Attest cancelled policy error:", attestCancelledRes.errText);

  // =========================================================================
  // FINAL READBACKS & SUMMARY
  // =========================================================================
  console.log("\n================ FINAL STATS & READBACKS ================");
  const stats = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
  const limits = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "get_limits", args: [] }));
  evidence.readbacks.final_stats = stats;
  evidence.readbacks.final_limits = limits;
  console.log("Final stats:", stats);
  console.log("Final limits:", limits);

  const finalSnap = await snapshotBalances("final_state");

  // Save full evidence JSON
  fs.writeFileSync(path.join(__dirname, 'evidence_v2.json'), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(onchainDir, 'evidence_v2.json'), JSON.stringify(evidence, null, 2));
  fs.writeFileSync(path.join(sourceDir, 'evidence_v2.json'), JSON.stringify(evidence, null, 2));

  console.log("\n==================================================================");
  console.log("COVER V2: EVIDENCE RUN COMPLETED SUCCESSFULLY!");
  console.log("==================================================================");
}

main().catch(err => {
  console.error("FATAL ERROR in deploy_v2_and_run_evidence.js:", err);
  process.exit(1);
});
