import { ChatGoogleGenerativeAI } from "@langchain/google-genai";
import { StructuredTool } from "@langchain/core/tools";
import { z } from "zod";
import {
  getAptosClient,
  getAccountFromPrivateKey,
  signAndSubmitPayment,
} from "./aptos-utils";

interface X402PaymentInfo {
  amount: string;
  currency: string;
  recipient: string;
  network: string;
  facilitator: {
    verifyUrl: string;
    settleUrl: string;
  };
}

/**
 * Tool for making HTTP requests with x402 payment support
 */
class X402FetchTool extends StructuredTool {
  name = "x402_fetch";
  description = `
    Makes HTTP requests to APIs that may require x402 payment.
    If the API returns a 402 status, automatically handles the payment flow per x402 spec:
    1. Builds and signs a payment transaction (does NOT submit it)
    2. Sends the signed transaction to the server in X-PAYMENT header
    3. Server verifies the signed transaction, submits it, and returns the resource atomically
    
    No API keys, no waiting for confirmations - the server handles submission!
    Use this tool when you need to fetch data from protected APIs.
  `;

  schema = z.object({
    url: z.string().describe("The URL to fetch from"),
    method: z
      .enum(["GET", "POST", "PUT", "DELETE"])
      .default("GET")
      .describe("HTTP method"),
    body: z
      .string()
      .optional()
      .describe("JSON string body for POST/PUT requests"),
    headers: z
      .record(z.string())
      .optional()
      .describe("Additional headers to send"),
  });

  private agentPrivateKey: string;
  private agentAddress: string;
  private network: string;

  constructor(agentPrivateKey: string, agentAddress: string, network: string) {
    super();
    this.agentPrivateKey = agentPrivateKey;
    this.agentAddress = agentAddress;
    this.network = network;
  }

  async _call(input: z.infer<typeof this.schema>): Promise<string> {
    const { url, method, body, headers = {} } = input;

    try {
      // First attempt - try to fetch without payment
      const initialResponse = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: body ? body : undefined,
      });

      // If successful, return the result
      if (initialResponse.ok) {
        const data = await initialResponse.json();
        return JSON.stringify(data, null, 2);
      }

      // If 402 Payment Required, handle the payment flow
      if (initialResponse.status === 402) {
        const paymentInfo = await initialResponse.json();

        console.log("📋 Payment required:", {
          amount: paymentInfo.price,
          currency: paymentInfo.currency,
          recipient: paymentInfo.paymentAddress,
          network: paymentInfo.network,
        });

        // Step 1: Build and sign payment transaction (DO NOT submit it)
        console.log("🔏 Creating and signing payment transaction...");
        const aptos = getAptosClient(this.network);
        const agentAccount = getAccountFromPrivateKey(this.agentPrivateKey);

        // Build the transaction
        const transaction = await aptos.transaction.build.simple({
          sender: agentAccount.accountAddress,
          data: {
            function: "0x1::aptos_account::transfer",
            functionArguments: [paymentInfo.paymentAddress, paymentInfo.price],
          },
        });

        // Sign the transaction (but don't submit)
        const signedTx = aptos.transaction.sign({
          signer: agentAccount,
          transaction,
        });

        console.log("✅ Transaction signed (not submitted)");

        // Step 2: Serialize the signed transaction to send to server
        const signedTxBytes = signedTx.bcsToBytes();
        const signedTxBase64 = Buffer.from(signedTxBytes).toString('base64');

        console.log("📦 Serialized signed transaction");

        // Step 3: Send signed transaction to server
        // Server will verify and submit it atomically
        console.log("🔄 Sending signed transaction to server...");
        const finalResponse = await fetch(url, {
          method,
          headers: {
            "Content-Type": "application/json",
            "X-PAYMENT": signedTxBase64,
            ...headers,
          },
          body: body ? body : undefined,
        });

        if (!finalResponse.ok) {
          const error = await finalResponse.text();
          throw new Error(`Payment verification failed: ${error}`);
        }

        const data = await finalResponse.json();
        
        // Extract payment response from header (per x402 spec)
        const paymentResponseHeader = finalResponse.headers.get("X-Payment-Response");
        if (paymentResponseHeader) {
          const paymentResponse = JSON.parse(paymentResponseHeader);
          console.log("✅ Payment verified and submitted by server!");
          console.log("   Transaction hash:", paymentResponse.transactionHash);
          console.log("   Amount:", paymentResponse.amount, paymentResponse.currency);
          console.log("   Status:", paymentResponse.status);
        }
        
        return JSON.stringify(data, null, 2);
      }

      // Other error statuses
      const errorText = await initialResponse.text();
      throw new Error(
        `Request failed with status ${initialResponse.status}: ${errorText}`
      );
    } catch (error) {
      console.error("❌ Error in x402_fetch:", error);
      return JSON.stringify({
        error: true,
        message: String(error),
      });
    }
  }
}

/**
 * Create and configure the x402-enabled AI agent
 */
export async function createX402Agent(config: {
  apiKey: string;
  agentPrivateKey: string;
  agentAddress: string;
  network: string;
}) {
  const { apiKey, agentPrivateKey, agentAddress, network } = config;

  // Initialize the LLM
  const llm = new ChatGoogleGenerativeAI({
    apiKey,
    modelName: "gemini-1.5-flash",
    temperature: 0.7,
  });

  // Create the x402 fetch tool
  const x402Tool = new X402FetchTool(agentPrivateKey, agentAddress, network);

  return {
    llm,
    tools: [x402Tool],
  };
}

/**
 * Execute a simple agent query with x402 payment support
 */
export async function executeAgentQuery(
  agentPrivateKey: string,
  agentAddress: string,
  network: string,
  apiKey: string,
  query: string
): Promise<string> {
  try {
    const { llm, tools } = await createX402Agent({
      apiKey,
      agentPrivateKey,
      agentAddress,
      network,
    });

    // For now, directly use the tool if the query is about fetching
    // In a full agent setup, you'd use AgentExecutor from LangChain
    if (query.toLowerCase().includes("weather") || query.toLowerCase().includes("fetch")) {
      const x402Tool = tools[0] as X402FetchTool;
      
      // Extract URL from query or use default
      let url = "http://localhost:3000/api/protected/weather";
      const urlMatch = query.match(/https?:\/\/[^\s]+/);
      if (urlMatch) {
        url = urlMatch[0];
      }

      const result = await x402Tool._call({
        url,
        method: "GET",
      });

      return result;
    }

    // For other queries, use the LLM directly
    const response = await llm.invoke(query);
    return response.content as string;
  } catch (error) {
    console.error("Error executing agent query:", error);
    throw error;
  }
}

