#!/usr/bin/env tsx
/**
 * Demo script to test the x402 agent
 * 
 * This script demonstrates the x402 payment flow (per official spec):
 * 1. Client (agent) requests protected resource
 * 2. Server responds with 402 + payment requirements in response body
 * 3. Client prepares signed payment payload (signs transaction, doesn't submit)
 * 4. Client resubmits request with X-PAYMENT header containing signed payload
 * 5. Server verifies payment payload
 * 6. Server settles payment (submits transaction to Aptos blockchain)
 * 7. Server returns requested resource
 * 
 * Usage:
 *   Set up your .env file with the required variables
 *   Then run: npx tsx scripts/demo-agent.ts or npm run demo
 */

import { executeAgentQuery } from "../lib/x402-agent";
import { getAptosClient, getAccountBalance } from "../lib/aptos-utils";

async function main() {
  console.log("\n🤖 X402 Agent Demo on Aptos\n");
  console.log("=" .repeat(60));

  // Load environment variables
  const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
  const agentAddress = process.env.AGENT_ADDRESS;
  const network = process.env.APTOS_NETWORK || "testnet";
  const apiKey = process.env.GOOGLE_API_KEY;

  if (!agentPrivateKey || !agentAddress) {
    console.error("❌ Error: AGENT_PRIVATE_KEY and AGENT_ADDRESS must be set in .env");
    process.exit(1);
  }

  if (!apiKey) {
    console.error("❌ Error: GOOGLE_API_KEY must be set in .env");
    process.exit(1);
  }

  // Check agent balance
  console.log("\n📊 Checking agent balance...");
  const aptos = getAptosClient(network);
  const balance = await getAccountBalance(aptos, agentAddress);
  const balanceInAPT = (parseInt(balance) / 100000000).toFixed(8);
  console.log(`   Agent Address: ${agentAddress}`);
  console.log(`   Balance: ${balanceInAPT} APT`);
  console.log(`   Network: ${network}`);

  if (parseInt(balance) === 0) {
    console.log("\n⚠️  Warning: Agent has zero balance!");
    console.log("   Please fund your agent account to make payments.");
    console.log(`   You can get testnet APT from: https://aptoslabs.com/testnet-faucet`);
  }

  // Test the agent
  console.log("\n" + "=".repeat(60));
  console.log("🚀 Starting agent query...\n");

  const query = "Fetch the weather data from http://localhost:3000/api/protected/weather";

  try {
    const result = await executeAgentQuery(
      agentPrivateKey,
      agentAddress,
      network,
      apiKey,
      query
    );

    console.log("\n" + "=".repeat(60));
    console.log("📊 Result:\n");
    console.log(result);
    console.log("\n" + "=".repeat(60));

    // Check balance after payment
    const newBalance = await getAccountBalance(aptos, agentAddress);
    const newBalanceInAPT = (parseInt(newBalance) / 100000000).toFixed(8);
    const spent = (parseInt(balance) - parseInt(newBalance)) / 100000000;
    
    console.log("\n💰 Payment Summary:");
    console.log(`   Starting Balance: ${balanceInAPT} APT`);
    console.log(`   Ending Balance: ${newBalanceInAPT} APT`);
    console.log(`   Amount Spent: ${spent.toFixed(8)} APT (including gas fees)`);

    console.log("\n✅ Demo completed successfully!\n");
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

// Run the demo
main().catch(console.error);

