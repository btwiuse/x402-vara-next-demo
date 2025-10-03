import { 
  Account, 
  Aptos, 
  AptosConfig, 
  Network 
} from "@aptos-labs/ts-sdk";
import * as fs from "fs";
import * as path from "path";

async function generateAndFundAccount() {
  console.log("🔑 Generating new Aptos account...\n");

  // Generate new account
  const account = Account.generate();
  
  // Get account details
  const privateKey = account.privateKey.toString();
  const publicKey = account.publicKey.toString();
  const address = account.accountAddress.toString();

  console.log("✅ Account generated!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(`Address:     ${address}`);
  console.log(`Public Key:  ${publicKey}`);
  console.log(`Private Key: ${privateKey}`);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Fund account from faucet
  console.log("💰 Funding account from testnet faucet...\n");
  
  const config = new AptosConfig({ network: Network.TESTNET });
  const aptos = new Aptos(config);

  try {
    await aptos.fundAccount({
      accountAddress: address,
      amount: 100_000_000, // 1 APT = 100,000,000 Octas
    });

    console.log("✅ Account funded with 1 APT!\n");

    // Check balance
    const balance = await aptos.getAccountAPTAmount({
      accountAddress: address,
    });

    console.log(`Current balance: ${balance / 100_000_000} APT (${balance} Octas)\n`);

    // Update .env file
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    // Read existing .env or .env.example
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
      console.log("📝 Updating existing .env file...");
    } else {
      const envExamplePath = path.join(process.cwd(), ".env.example");
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, "utf-8");
        console.log("📝 Creating .env from .env.example...");
      }
    }

    // Replace or add the demo account credentials
    const lines = envContent.split("\n");
    let updatedLines: string[] = [];
    let foundPrivateKey = false;
    let foundAddress = false;

    for (const line of lines) {
      if (line.startsWith("DEMO_PRIVATE_KEY=")) {
        updatedLines.push(`DEMO_PRIVATE_KEY=${privateKey}`);
        foundPrivateKey = true;
      } else if (line.startsWith("DEMO_ADDRESS=")) {
        updatedLines.push(`DEMO_ADDRESS=${address}`);
        foundAddress = true;
      } else {
        updatedLines.push(line);
      }
    }

    // Add if not found
    if (!foundPrivateKey) {
      updatedLines.push(`\n# Demo Account (Generated)`);
      updatedLines.push(`DEMO_PRIVATE_KEY=${privateKey}`);
    }
    if (!foundAddress) {
      updatedLines.push(`DEMO_ADDRESS=${address}`);
    }

    // Write back to .env
    fs.writeFileSync(envPath, updatedLines.join("\n"));

    console.log("✅ .env file updated!\n");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("🎉 Setup complete!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("\nYou can now use this account to test x402 payments!");
    console.log("\nNote: Update app/page.tsx to use these credentials:");
    console.log(`  DEMO_PRIVATE_KEY="${privateKey}"`);

  } catch (error: any) {
    console.error("❌ Error funding account:", error.message);
    console.log("\nYou can manually fund this account at:");
    console.log(`https://aptoslabs.com/testnet-faucet?address=${address}`);
    
    // Still update .env even if faucet fails
    const envPath = path.join(process.cwd(), ".env");
    let envContent = "";

    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, "utf-8");
    } else {
      const envExamplePath = path.join(process.cwd(), ".env.example");
      if (fs.existsSync(envExamplePath)) {
        envContent = fs.readFileSync(envExamplePath, "utf-8");
      }
    }

    envContent += `\n\n# Demo Account (Generated)\nDEMO_PRIVATE_KEY=${privateKey}\nDEMO_ADDRESS=${address}\n`;
    fs.writeFileSync(envPath, envContent);
    
    console.log("\n✅ Credentials saved to .env file");
  }
}

generateAndFundAccount().catch(console.error);

