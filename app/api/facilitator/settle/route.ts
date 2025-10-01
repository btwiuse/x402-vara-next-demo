import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";

export const dynamic = "force-dynamic";

interface SettleRequest {
  signedTransaction: string; // base64 encoded signed transaction
  expectedRecipient: string;
  expectedAmount: string;
  expectedNetwork: string;
}

/**
 * POST /api/facilitator/settle
 * 
 * x402 Facilitator Settle Endpoint (per spec):
 * - Receives signed transaction from protected API AFTER work is done
 * - Submits transaction to blockchain
 * - Waits for confirmation
 * - Verifies the transaction was successful
 * - Returns settlement result with transaction hash
 * 
 * This is slow and expensive - actual blockchain submission
 * Only call this AFTER the work/resource has been provided to the client
 */
export async function POST(request: NextRequest) {
  try {
    const body: SettleRequest = await request.json();
    const { signedTransaction, expectedRecipient, expectedAmount, expectedNetwork } = body;

    if (!signedTransaction || !expectedRecipient || !expectedAmount) {
      return NextResponse.json(
        { 
          error: "Missing required fields",
          settled: false 
        },
        { status: 400 }
      );
    }

    const network = expectedNetwork || process.env.APTOS_NETWORK || "testnet";
    const aptos = getAptosClient(network);

    // Decode the signed transaction from base64
    const signedTxBytes = Buffer.from(signedTransaction, 'base64');
    
    console.log("📤 [Facilitator] Submitting transaction to blockchain...");
    
    // Submit the signed transaction to the blockchain
    // Cast to any to bypass TypeScript check - the bytes are a valid serialized signed transaction
    const pendingTx = await aptos.transaction.submit.simple(signedTxBytes as any);

    console.log("⏳ [Facilitator] Waiting for confirmation...");
    await aptos.waitForTransaction({ 
      transactionHash: pendingTx.hash 
    });

    // Verify the transaction after it's committed
    const txDetails = await aptos.transaction.getTransactionByHash({
      transactionHash: pendingTx.hash,
    });

    // Type guard and verification
    if (!('success' in txDetails) || !txDetails.success) {
      return NextResponse.json(
        {
          settled: false,
          error: "Transaction failed on blockchain",
        },
        { status: 400 }
      );
    }

    // Verify it's a coin transfer to the correct address with correct amount
    const payload = (txDetails as any).payload;
    if (payload?.function === "0x1::aptos_account::transfer") {
      const args = payload.arguments;
      const txRecipient = args[0];
      const txAmount = args[1];

      if (txRecipient !== expectedRecipient) {
        return NextResponse.json(
          {
            settled: false,
            error: "Invalid payment recipient",
            message: `Payment was sent to ${txRecipient}, expected ${expectedRecipient}`,
          },
          { status: 400 }
        );
      }

      if (txAmount !== expectedAmount) {
        return NextResponse.json(
          {
            settled: false,
            error: "Invalid payment amount",
            message: `Payment was ${txAmount} octas, expected ${expectedAmount}`,
          },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json(
        {
          settled: false,
          error: "Invalid transaction type",
          message: "Transaction must be a coin transfer",
        },
        { status: 400 }
      );
    }

    console.log("✅ [Facilitator] Payment settled successfully:", pendingTx.hash);

    // Return settlement success with transaction details
    return NextResponse.json({
      settled: true,
      transactionHash: pendingTx.hash,
      amount: expectedAmount,
      recipient: expectedRecipient,
      network: network,
      timestamp: new Date().toISOString(),
      status: "confirmed",
    });

  } catch (error: any) {
    console.error("[Facilitator] Error settling payment:", error);
    
    // Check if it's a duplicate transaction error
    if (error.message?.includes("SEQUENCE_NUMBER_TOO_OLD") || 
        error.message?.includes("INVALID_SEQ_NUMBER") ||
        error.message?.includes("already submitted")) {
      return NextResponse.json(
        {
          settled: false,
          error: "Transaction already used",
          message: "This signed transaction has already been submitted to the blockchain",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { 
        settled: false,
        error: "Settlement failed", 
        message: error.message || String(error)
      },
      { status: 500 }
    );
  }
}

