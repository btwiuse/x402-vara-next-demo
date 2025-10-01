import { NextRequest, NextResponse } from "next/server";
import { executeAgentQuery } from "@/lib/x402-agent";
import { getAptosClient, getAccountBalance } from "@/lib/aptos-utils";

export const dynamic = "force-dynamic";

interface TestAgentRequest {
  query?: string;
  url?: string;
}

/**
 * POST /api/test-agent
 * Test endpoint to run the x402 agent from the web
 */
export async function POST(request: NextRequest) {
  try {
    const body: TestAgentRequest = await request.json();
    const { query, url } = body;

    // Load configuration from environment
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY;
    const agentAddress = process.env.AGENT_ADDRESS;
    const network = process.env.APTOS_NETWORK || "testnet";
    const apiKey = process.env.GOOGLE_API_KEY;

    if (!agentPrivateKey || !agentAddress) {
      return NextResponse.json(
        { error: "Agent credentials not configured" },
        { status: 500 }
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "Google API key not configured" },
        { status: 500 }
      );
    }

    // Check agent balance
    const aptos = getAptosClient(network);
    const initialBalance = await getAccountBalance(aptos, agentAddress);

    if (parseInt(initialBalance) === 0) {
      return NextResponse.json(
        { 
          error: "Agent has zero balance",
          message: "Please fund your agent account to make payments",
          agentAddress,
        },
        { status: 400 }
      );
    }

    // Build the query
    const targetUrl = url || `${request.nextUrl.origin}/api/protected/weather`;
    const agentQuery = query || `Fetch data from ${targetUrl}`;

    // Execute the agent
    const result = await executeAgentQuery(
      agentPrivateKey,
      agentAddress,
      network,
      apiKey,
      agentQuery
    );

    // Check final balance
    const finalBalance = await getAccountBalance(aptos, agentAddress);
    const spent = (parseInt(initialBalance) - parseInt(finalBalance)) / 100000000;

    return NextResponse.json({
      success: true,
      result: JSON.parse(result),
      payment: {
        initialBalance: (parseInt(initialBalance) / 100000000).toFixed(8),
        finalBalance: (parseInt(finalBalance) / 100000000).toFixed(8),
        spent: spent.toFixed(8),
        currency: "APT",
      },
      agentAddress,
      network,
    });
  } catch (error) {
    console.error("Error in test-agent endpoint:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * GET /api/test-agent
 * Get agent status and configuration
 */
export async function GET(request: NextRequest) {
  try {
    const agentAddress = process.env.AGENT_ADDRESS;
    const network = process.env.APTOS_NETWORK || "testnet";
    const hasApiKey = !!process.env.GOOGLE_API_KEY;

    if (!agentAddress) {
      return NextResponse.json(
        { configured: false, message: "Agent not configured" },
        { status: 200 }
      );
    }

    const aptos = getAptosClient(network);
    const balance = await getAccountBalance(aptos, agentAddress);

    return NextResponse.json({
      configured: true,
      agentAddress,
      balance: (parseInt(balance) / 100000000).toFixed(8),
      currency: "APT",
      network,
      hasApiKey,
    });
  } catch (error) {
    console.error("Error getting agent status:", error);
    return NextResponse.json(
      { error: "Internal server error", details: String(error) },
      { status: 500 }
    );
  }
}

