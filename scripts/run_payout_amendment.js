const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const { createClient, chains, createAccount } = require('genlayer-js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

function decodeErrorPayload(receipt) {
  const payload = receipt.consensus_data?.leader_receipt?.[0]?.result?.payload;
  if (!payload) return "";
  if (typeof payload === 'string' && payload.includes('not covered:')) return payload;
  try {
    return Buffer.from(payload, 'base64').toString('utf8');
  } catch (e) {
    return String(payload);
  }
}

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
      console.warn(`Transient RPC error waiting for receipt (${msg.slice(0, 80)}...). Retrying receipt poll in ${waitSec}s (attempt ${attempt}/20)...`);
      await new Promise(r => setTimeout(r, waitSec * 1000));
    }
  }
}

async function main() {
  console.log("==================================================================");
  console.log("COVER V2 PAYOUT AMENDMENT EXECUTION");
  console.log("==================================================================");

  const deployments = JSON.parse(fs.readFileSync(path.join(__dirname, 'deploy/deployments_v2.json'), 'utf8'));
  const coverAddress = deployments.addresses.cover;
  const guardAddress = deployments.addresses.cover_guard;

  console.log("Target Contracts:");
  console.log("  Cover V2:      ", coverAddress);
  console.log("  CoverGuard V2: ", guardAddress);

  const underwriter = createAccount();
  const buyer = createAccount();
  console.log("\nAccounts (throwaway in-memory):");
  console.log("  Underwriter:   ", underwriter.address);
  console.log("  Buyer:         ", buyer.address);

  const clientUnderwriter = createClient({ chain: chains.studionet, account: underwriter });
  const clientBuyer = createClient({ chain: chains.studionet, account: buyer });

  const payoutsDir = path.join(__dirname, '../docs/evidence_v2/payouts');
  if (!fs.existsSync(payoutsDir)) fs.mkdirSync(payoutsDir, { recursive: true });

  const executionLog = {
    transactions: [],
    cases: [],
    coverguard_checks: {},
    invariants: [],
  };

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

    fs.writeFileSync(path.join(payoutsDir, `${label}_receipt.json`), JSON.stringify(receipt, null, 2));

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
    executionLog.transactions.push(rec);
    return { receipt, errText, lat, txHash };
  }

  // 1. Claim demo credits
  console.log("\n--- Step 1: Funding Underwriter and Buyer ---");
  await executeWrite(clientUnderwriter, "payout_claim_underwriter", coverAddress, "claim_demo_credits", []);
  await executeWrite(clientBuyer, "payout_claim_buyer", coverAddress, "claim_demo_credits", []);

  const uBal0 = parseInt(await clientUnderwriter.readContract({ address: coverAddress, functionName: "balance_of", args: [underwriter.address] }), 10);
  const bBal0 = parseInt(await clientBuyer.readContract({ address: coverAddress, functionName: "balance_of", args: [buyer.address] }), 10);
  console.log(`Initial balances: Underwriter = ${uBal0} CR, Buyer = ${bBal0} CR`);

  // 2. Define the 5 cases
  const caseConfigs = [
    {
      caseId: 1,
      name: "Outage 75 min",
      fixtureFile: "status-mutable-p1.md",
      incidentTextFile: "status-s1-outage-75.md",
      expectedOutcome: "PAY_100",
      expectedPayoutPct: 100,
      expectedPayout: 100,
      expectedFinalStatus: "PAID",
      tag: "mutable-p1",
    },
    {
      caseId: 2,
      name: "Outage 35 min",
      fixtureFile: "status-mutable-p2.md",
      incidentTextFile: "status-s2-outage-35.md",
      expectedOutcome: "PAY_50",
      expectedPayoutPct: 50,
      expectedPayout: 50,
      expectedFinalStatus: "PAID",
      tag: "mutable-p2",
    },
    {
      caseId: 3,
      name: "Outage 20 min",
      fixtureFile: "status-mutable-p3.md",
      incidentTextFile: "status-s3-outage-20.md",
      expectedOutcome: "NO_PAY",
      expectedPayoutPct: 0,
      expectedPayout: 0,
      expectedFinalStatus: "ACTIVE",
      tag: "mutable-p3",
    },
    {
      caseId: 4,
      name: "Degraded 90 min",
      fixtureFile: "status-mutable-p4.md",
      incidentTextFile: "status-s4-degraded-90.md",
      expectedOutcome: "PAY_25",
      expectedPayoutPct: 25,
      expectedPayout: 25,
      expectedFinalStatus: "PAID",
      tag: "mutable-p4",
    },
    {
      caseId: 5,
      name: "Outage no explicit min",
      fixtureFile: "status-mutable-p5.md",
      incidentTextFile: "status-s7-no-duration.md",
      expectedOutcome: "REVIEW",
      expectedPayoutPct: 0,
      expectedPayout: 0,
      expectedFinalStatus: "ACTIVE",
      tag: "mutable-p5",
    },
  ];

  const caseRunData = [];

  // 3. Create products, fund, and buy policies while OPERATIONAL
  console.log("\n--- Step 2: Creating Products, Funding Pools, and Buying Policies (while OPERATIONAL) ---");
  for (const c of caseConfigs) {
    console.log(`\n=== Setting up Case ${c.caseId}: ${c.name} ===`);
    const fixtureUrl = `https://raw.githubusercontent.com/hypercybers99/cover-fixtures/main/${c.fixtureFile}`;

    // Verify operational via raw fetch
    const checkResp = await fetch(fixtureUrl + '?cb=' + Date.now()).then(r => r.text());
    if (!checkResp.includes("All systems operational.")) {
      throw new Error(`Fixture ${c.fixtureFile} is not in OPERATIONAL state!`);
    }

    // Create product
    const prodName = `Mutable Nimbus P${c.caseId}`;
    const createRes = await executeWrite(
      clientUnderwriter,
      `case${c.caseId}_create_product`,
      coverAddress,
      "create_product",
      [prodName, fixtureUrl, 60, 30, 200]
    );
    // Find created product id
    const statsAfterProd = JSON.parse(await clientUnderwriter.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
    const productId = String(parseInt(statsAfterProd.next_product, 10) - 1);
    console.log(`Product created with ID: ${productId}`);

    // Fund product pool with 200 demo credits
    await executeWrite(
      clientUnderwriter,
      `case${c.caseId}_fund_product`,
      coverAddress,
      "fund_product",
      [productId, 200]
    );

    // Buy policy (coverage 100 demo credits, premium = 2 demo credits)
    const buyRes = await executeWrite(
      clientBuyer,
      `case${c.caseId}_buy_policy`,
      coverAddress,
      "buy",
      [productId, 100]
    );
    const statsAfterBuy = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
    const policyId = String(parseInt(statsAfterBuy.next_policy, 10) - 1);
    console.log(`Policy bought with ID: ${policyId}`);

    const polRaw = await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: [policyId] });
    const pol = JSON.parse(polRaw);
    console.log(`Policy ${policyId} initial status: ${pol.status}, buy_norm_hash16: ${pol.buy_norm_hash16}, terms_hash: ${pol.terms_hash}`);

    caseRunData.push({
      config: c,
      productId,
      policyId,
      fixtureUrl,
      buyTxHash: buyRes.txHash,
      buyLatency: buyRes.lat,
      initialPolicy: pol,
    });
  }

  // 4. Update fixture files in cover-fixtures and push to GitHub
  console.log("\n--- Step 3: Injecting Incidents into cover-fixtures on GitHub ---");
  const fixturesRepoDir = path.resolve('E:/cover-fixtures');

  for (const item of caseRunData) {
    const c = item.config;
    const incidentContent = fs.readFileSync(path.join(fixturesRepoDir, c.incidentTextFile), 'utf8');
    const updatedContent = incidentContent.trim() + `\n\n<!-- Instance: ${c.tag} -->\n`;
    fs.writeFileSync(path.join(fixturesRepoDir, c.fixtureFile), updatedContent, 'utf8');
    console.log(`Updated ${c.fixtureFile} with ${c.incidentTextFile}`);
  }



  // Git commit and push
  const pushTime = new Date().toISOString();
  const pushTimeMs = Date.now();
  console.log(`Pushing incident commit to GitHub at ${pushTime}...`);
  execSync('git add status-mutable-*.md', { cwd: fixturesRepoDir, stdio: 'inherit' });
  execSync('git commit -m "feat(fixtures): inject incident states for mutable payout testing"', { cwd: fixturesRepoDir, stdio: 'inherit' });
  execSync('git push origin main', { cwd: fixturesRepoDir, stdio: 'inherit' });
  const commitSha = execSync('git rev-parse HEAD', { cwd: fixturesRepoDir }).toString().trim();
  console.log(`Pushed commit: ${commitSha} at ${pushTime}`);

  // 5. Wait >= 6 minutes AND verify cache-free fetch for all files
  console.log("\n--- Step 4: Cooling Period and Cache-Free Verification (6 minutes = 360 seconds) ---");
  console.log("GitHub raw CDN caches content for ~5 minutes. Waiting 360 seconds minimum...");

  let cacheFreeConfirmedTime = null;
  const targetCoolingMs = 365 * 1000; // 365 seconds (6 minutes 5 seconds)

  while (true) {
    const elapsedMs = Date.now() - pushTimeMs;
    const elapsedSec = (elapsedMs / 1000).toFixed(0);

    // Check all files with ?cb=<random>
    let allUpdated = true;
    for (const item of caseRunData) {
      const url = item.fixtureUrl + '?cb=' + Math.random();
      try {
        const text = await fetch(url).then(r => r.text());
        if (text.includes("All systems operational.")) {
          allUpdated = false;
          break;
        }
      } catch (e) {
        allUpdated = false;
        break;
      }
    }

    if (allUpdated && elapsedMs >= targetCoolingMs) {
      cacheFreeConfirmedTime = new Date().toISOString();
      console.log(`\nCache-free confirmation complete at ${cacheFreeConfirmedTime} (${elapsedSec}s elapsed >= 360s).`);
      break;
    }

    process.stdout.write(`  Elapsed: ${elapsedSec}s / 365s | CDN cache-free check: ${allUpdated ? 'FRESH' : 'STALE'}\r`);
    await new Promise(r => setTimeout(r, 10000));
  }

  // 6. Execute settlements for each case
  console.log("\n--- Step 5: Executing Settlements and Payout Verification ---");
  const payoutResults = [];

  for (const item of caseRunData) {
    const c = item.config;
    console.log(`\n==================================================================`);
    console.log(`SETTLING Case ${c.caseId}: ${c.name} (Policy ${item.policyId})`);
    console.log(`==================================================================`);

    // Before snapshot
    const holderBalBefore = parseInt(await clientBuyer.readContract({ address: coverAddress, functionName: "balance_of", args: [buyer.address] }), 10);
    const poolHealthBefore = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "pool_health", args: [item.productId] }));
    const policyBefore = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: [item.policyId] }));

    console.log(`Before Snapshot:`);
    console.log(`  Holder balance: ${holderBalBefore} CR`);
    console.log(`  Pool balance:   ${poolHealthBefore.pool_balance} CR (Reserved: ${poolHealthBefore.reserved} CR)`);
    console.log(`  Policy status:  ${policyBefore.status}, Paid amount: ${policyBefore.paid_amount}`);

    const settleTime = new Date().toISOString();
    let settleRes = await executeWrite(
      clientBuyer,
      `case${c.caseId}_settle_policy`,
      coverAddress,
      "settle",
      [item.policyId]
    );

    // Check for PAGE_UNCHANGED due to transient CDN cache
    let policyAfter = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: [item.policyId] }));
    let lastSettlementId = policyAfter.settlement_id || "";
    // If not in policy, check next_settlement - 1
    const statsAfterSettle = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
    const settlementId = String(parseInt(statsAfterSettle.next_settlement, 10) - 1);
    const settlementRecord = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_settlement", args: [settlementId] }));

    console.log(`Settlement Record: Outcome = ${settlementRecord.outcome}, Gate = ${settlementRecord.gate}, Minutes = ${settlementRecord.minutes}, Status = ${settlementRecord.status}`);

    if (settlementRecord.gate === "PAGE_UNCHANGED" && c.expectedOutcome !== "NO_PAY") {
      console.warn(`WARNING: Settlement returned PAGE_UNCHANGED due to CDN caching. Waiting 60s and retrying settle...`);
      await new Promise(r => setTimeout(r, 60000));
      settleRes = await executeWrite(
        clientBuyer,
        `case${c.caseId}_settle_retry`,
        coverAddress,
        "settle",
        [item.policyId]
      );
    }

    // After snapshot
    const holderBalAfter = parseInt(await clientBuyer.readContract({ address: coverAddress, functionName: "balance_of", args: [buyer.address] }), 10);
    const poolHealthAfter = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "pool_health", args: [item.productId] }));
    policyAfter = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_policy", args: [item.policyId] }));
    const finalStats = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
    const finalSettlementId = String(parseInt(finalStats.next_settlement, 10) - 1);
    const finalSettlement = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_settlement", args: [finalSettlementId] }));

    const actualPayout = parseInt(policyAfter.paid_amount || "0", 10);
    const balanceDiff = holderBalAfter - holderBalBefore;

    console.log(`\nAfter Snapshot:`);
    console.log(`  Holder balance: ${holderBalAfter} CR (Diff: +${balanceDiff} CR)`);
    console.log(`  Pool balance:   ${poolHealthAfter.pool_balance} CR (Reserved: ${poolHealthAfter.reserved} CR)`);
    console.log(`  Policy status:  ${policyAfter.status}, Paid amount: ${actualPayout} CR`);
    console.log(`  Settlement:     ID=${finalSettlementId}, Outcome=${finalSettlement.outcome}, Gate=${finalSettlement.gate}`);

    // Verify expectations
    const outcomeMatch = finalSettlement.outcome === c.expectedOutcome;
    const payoutMatch = actualPayout === c.expectedPayout;
    const statusMatch = policyAfter.status === c.expectedFinalStatus;

    console.log(`\nVerification:`);
    console.log(`  Outcome:  Expected=${c.expectedOutcome} | Actual=${finalSettlement.outcome} -> ${outcomeMatch ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Payout:   Expected=${c.expectedPayout} CR | Actual=${actualPayout} CR -> ${payoutMatch ? 'MATCH' : 'MISMATCH'}`);
    console.log(`  Status:   Expected=${c.expectedFinalStatus} | Actual=${policyAfter.status} -> ${statusMatch ? 'MATCH' : 'MISMATCH'}`);

    if (!outcomeMatch || !payoutMatch || !statusMatch) {
      console.warn(`Case ${c.caseId} outcome deviation observed.`);
    }

    const row = {
      case_id: c.caseId,
      case_name: c.name,
      product_id: item.productId,
      policy_id: item.policyId,
      settlement_id: finalSettlementId,
      evidence_url: item.fixtureUrl,
      terms_hash: policyAfter.terms_hash,
      pre_registered_outcome: c.expectedOutcome,
      actual_outcome: finalSettlement.outcome,
      expected_payout: c.expectedPayout,
      actual_payout: actualPayout,
      policy_status_before: policyBefore.status,
      policy_status_after: policyAfter.status,
      holder_balance_before: holderBalBefore,
      holder_balance_after: holderBalAfter,
      pool_balance_before: parseInt(poolHealthBefore.pool_balance, 10),
      pool_balance_after: parseInt(poolHealthAfter.pool_balance, 10),
      reserved_before: parseInt(poolHealthBefore.reserved, 10),
      reserved_after: parseInt(poolHealthAfter.reserved, 10),
      settle_tx_hash: settleRes.txHash,
      settle_latency_seconds: settleRes.lat,
      fixture_commit_sha: commitSha,
      push_timestamp: pushTime,
      cache_free_confirmation_timestamp: cacheFreeConfirmedTime,
      settle_timestamp: settleTime,
    };
    payoutResults.push(row);
  }

  // 7. CoverGuard post-PAID gate verification on Policy from Case 1 (PAID)
  console.log("\n--- Step 6: CoverGuard Post-PAID Gate Verification ---");
  const paidCase = payoutResults.find(r => r.actual_outcome === "PAY_100") || payoutResults[0];
  const paidPolId = paidCase.policy_id;
  const paidProdId = paidCase.product_id;
  const paidTermsHash = paidCase.terms_hash;

  console.log(`Testing CoverGuard on PAID Policy ${paidPolId}...`);

  // a. is_covered view
  const isCoveredRaw = await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered",
    args: [buyer.address, paidPolId],
  });
  const isCoveredObj = JSON.parse(isCoveredRaw);
  console.log(`CoverGuard is_covered: covered=${isCoveredObj.covered}, reason=${isCoveredObj.reason}`);
  const isCoveredPass = isCoveredObj.covered === "false" && isCoveredObj.reason === "PAID";
  console.log(`  -> Verification: ${isCoveredPass ? 'PASS' : 'FAIL'}`);

  // b. is_covered_for view
  const isCoveredForRes = await clientBuyer.readContract({
    address: guardAddress,
    functionName: "is_covered_for",
    args: [buyer.address, paidPolId, paidProdId, paidTermsHash, 100],
  });
  console.log(`CoverGuard is_covered_for: ${isCoveredForRes}`);
  const isCoveredForPass = isCoveredForRes === false;
  console.log(`  -> Verification: ${isCoveredForPass ? 'PASS' : 'FAIL'}`);

  // c. attest write (refused with 'not covered: PAID')
  console.log(`Attempting attest on PAID policy (expecting refusal)...`);
  const attestRes = await executeWrite(
    clientBuyer,
    "case1_attest_refused_paid",
    guardAddress,
    "attest",
    [paidPolId],
    false // expect error
  );
  console.log(`Attest refusal payload: ${attestRes.errText}`);
  const attestRefusalPass = attestRes.errText.includes("not covered: PAID");
  console.log(`  -> Verification: ${attestRefusalPass ? 'PASS' : 'FAIL'}`);

  const coverGuardChecks = {
    tested_policy_id: paidPolId,
    is_covered: {
      raw: isCoveredRaw,
      parsed: isCoveredObj,
      pass: isCoveredPass,
    },
    is_covered_for: {
      result: isCoveredForRes,
      pass: isCoveredForPass,
    },
    attest_refusal: {
      tx_hash: attestRes.txHash,
      status_name: attestRes.receipt.status_name,
      result_name: attestRes.receipt.result_name,
      leader_result: attestRes.receipt.consensus_data?.leader_receipt?.[0]?.execution_result,
      error_payload: attestRes.errText,
      pass: attestRefusalPass,
    },
  };

  // 8. Total Conservation Invariant
  console.log("\n--- Step 7: System Demo Credit Conservation Invariant ---");
  const statsFinal = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "get_stats", args: [] }));
  const totalMinted = parseInt(statsFinal.total_minted, 10);
  console.log(`Total System Minted: ${totalMinted} demo credits`);

  // Compute ledger sum across our accounts and pools
  const finalUBal = parseInt(await clientUnderwriter.readContract({ address: coverAddress, functionName: "balance_of", args: [underwriter.address] }), 10);
  const finalBBal = parseInt(await clientBuyer.readContract({ address: coverAddress, functionName: "balance_of", args: [buyer.address] }), 10);

  let poolsSum = 0;
  for (const item of caseRunData) {
    const health = JSON.parse(await clientBuyer.readContract({ address: coverAddress, functionName: "pool_health", args: [item.productId] }));
    poolsSum += parseInt(health.pool_balance, 10);
  }

  const ourRunSum = finalUBal + finalBBal + poolsSum;
  console.log(`Our run accounts and pools sum: ${finalUBal} (Underwriter) + ${finalBBal} (Buyer) + ${poolsSum} (Pools) = ${ourRunSum} CR`);
  console.log(`Exact 2000 CR conservation for our run: ${ourRunSum === 2000 ? 'EXACT MATCH' : 'MISMATCH'}`);

  // 9. Save Summary Files
  const summary = {
    network: "studionet",
    chain_id: 61999,
    contracts: {
      cover: coverAddress,
      cover_guard: guardAddress,
    },
    accounts: {
      underwriter: underwriter.address,
      buyer: buyer.address,
    },
    fixture_commit_sha: commitSha,
    push_timestamp: pushTime,
    cache_free_confirmation_timestamp: cacheFreeConfirmedTime,
    cases: payoutResults,
    coverguard_post_paid: coverGuardChecks,
    invariant: {
      underwriter_balance: finalUBal,
      buyer_balance: finalBBal,
      pools_sum: poolsSum,
      run_total: ourRunSum,
      expected_run_total: 2000,
      total_system_minted: totalMinted,
      holds: ourRunSum === 2000,
    },
  };

  fs.writeFileSync(path.join(payoutsDir, 'payout_summary.json'), JSON.stringify(summary, null, 2));
  fs.writeFileSync(path.join(payoutsDir, 'payout_snapshots.json'), JSON.stringify(summary, null, 2));
  console.log(`\nPayout summary saved to ${path.join(payoutsDir, 'payout_summary.json')}`);
  console.log("==================================================================");
  console.log("AMENDMENT RUN COMPLETED SUCCESSFULLY");
  console.log("==================================================================");
}

main().catch(err => {
  console.error("FATAL ERROR in run_payout_amendment:", err);
  process.exit(1);
});
