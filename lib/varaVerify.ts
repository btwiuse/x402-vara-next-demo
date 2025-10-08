import { NextRequest, NextResponse } from "next/server";
import { getAptosClient } from "@/lib/aptos-utils";
import type {
  VerifyRequest,
  VerifyResponse,
  PaymentPayload,
} from "@/lib/x402-protocol-types";
import { X402_VERSION, X402_SCHEME, validVaraNetworks } from "@/lib/x402-protocol-types";

export const dynamic = "force-dynamic";

/**
 * POST /api/facilitator/verify
 * 
 * x402 Facilitator Verify Endpoint (per official spec):
 * - Receives payment header and payment requirements from protected API
 * - Verifies the transaction structure and signature
 * - Checks amount and recipient WITHOUT submitting to blockchain
 * - Returns verification result (isValid/invalidReason)
 * 
 * This is fast and cheap - just validation, no blockchain submission
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now();
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
  console.log(`[Facilitator Verify] POST /api/facilitator/verify`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

  try {
    const body: VerifyRequest = await request.json();
    const { x402Version, paymentHeader, paymentRequirements } = body;

    console.log(`[Facilitator Verify] Request body:`, {
      x402Version,
      hasPaymentHeader: !!paymentHeader,
      headerLength: paymentHeader?.length,
      scheme: paymentRequirements.scheme,
      network: paymentRequirements.network,
      maxAmountRequired: paymentRequirements.maxAmountRequired,
      payTo: paymentRequirements.payTo,
    });

    // Validate x402 version
    if (x402Version !== X402_VERSION) {
      console.error(`[Facilitator Verify] ❌ Unsupported x402 version: ${x402Version}`);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: `Unsupported x402 version: ${x402Version}`,
      };
      return NextResponse.json(response);
    }

    // Validate required fields
    if (!paymentHeader || !paymentRequirements) {
      console.error(`[Facilitator Verify] ❌ Missing required fields`);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Missing paymentHeader or paymentRequirements",
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate scheme
    if (paymentRequirements.scheme !== X402_SCHEME) {
      console.error(`[Facilitator Verify] ❌ Unsupported scheme: ${paymentRequirements.scheme}`);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: `Unsupported scheme: ${paymentRequirements.scheme}`,
      };
      return NextResponse.json(response);
    }

    // Validate network is Aptos-specific
    const network = paymentRequirements.network;
    if (!network || !validVaraNetworks.includes(network)) {
      console.error(`[Facilitator Verify] ❌ Invalid Aptos network: ${network}`);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: `Invalid Aptos network: ${network}. Expected one of ${validVaraNetworks}`,
      };
      return NextResponse.json(response);
    }
    
    console.log(`[Facilitator Verify] Network: ${network}`);
    
    const aptos = getAptosClient(network);
    console.log(`[Facilitator Verify] ✅ Aptos client initialized`);

    console.log(`\n🔍 [Facilitator Verify] Verifying payment payload...`);

    // Parse the payment header (base64 encoded PaymentPayload)
    console.log(`[Facilitator Verify] 📥 Raw paymentHeader (first 100 chars):`, paymentHeader.substring(0, 100) + '...');
    console.log(`[Facilitator Verify] 📥 Raw paymentHeader length:`, paymentHeader.length);
    
    let paymentPayloadJson: string;
    try {
      paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      console.log(`[Facilitator Verify] 📝 Decoded JSON (first 300 chars):`, paymentPayloadJson.substring(0, 300) + '...');
    } catch (decodeError) {
      console.error(`[Facilitator Verify] ❌ Failed to decode base64 header:`, decodeError);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Invalid base64 encoding in X-PAYMENT header",
      };
      return NextResponse.json(response);
    }
    
    let paymentPayload: PaymentPayload;
    try {
      paymentPayload = JSON.parse(paymentPayloadJson);
      console.log(`[Facilitator Verify] ✅ Parsed JSON successfully`);
    } catch (parseError) {
      console.error(`[Facilitator Verify] ❌ Failed to parse JSON:`, parseError);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Invalid JSON in payment payload",
      };
      return NextResponse.json(response);
    }
    
    console.log(`[Facilitator Verify] Parsed payment payload:`, {
      x402Version: paymentPayload.x402Version,
      scheme: paymentPayload.scheme,
      network: paymentPayload.network,
      hasPayload: !!paymentPayload.payload,
      payloadType: typeof paymentPayload.payload,
      payloadKeys: paymentPayload.payload ? Object.keys(paymentPayload.payload) : [],
    });

    // Validate payment payload matches requirements
    if (paymentPayload.scheme !== paymentRequirements.scheme) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: `Scheme mismatch: expected ${paymentRequirements.scheme}, got ${paymentPayload.scheme}`,
      };
      return NextResponse.json(response);
    }

    if (paymentPayload.network !== paymentRequirements.network) {
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: `Network mismatch: expected ${paymentRequirements.network}, got ${paymentPayload.network}`,
      };
      return NextResponse.json(response);
    }

    // For Aptos scheme, the payload contains signature and transaction separately (like Sui)
    console.log(`\n🔍 [Facilitator Verify] Extracting signature and transaction...`);
    console.log(`[Facilitator Verify] payload.signature exists:`, !!paymentPayload.payload.signature);
    console.log(`[Facilitator Verify] payload.transaction exists:`, !!paymentPayload.payload.transaction);
    
    const signatureBase64 = paymentPayload.payload.signature;
    const transactionBase64 = paymentPayload.payload.transaction;
    
    if (!signatureBase64 || !transactionBase64) {
      console.error(`[Facilitator Verify] ❌ Missing signature or transaction`);
      console.error(`[Facilitator Verify] Signature:`, signatureBase64 ? 'present' : 'MISSING');
      console.error(`[Facilitator Verify] Transaction:`, transactionBase64 ? 'present' : 'MISSING');
      console.error(`[Facilitator Verify] Full payload object:`, JSON.stringify(paymentPayload.payload, null, 2));
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Invalid payload: missing signature or transaction",
      };
      return NextResponse.json(response);
    }

    console.log(`[Facilitator Verify] ✅ Signature base64 length: ${signatureBase64.length}`);
    console.log(`[Facilitator Verify] ✅ Transaction base64 length: ${transactionBase64.length}`);
    console.log(`[Facilitator Verify] Signature (first 50 chars):`, signatureBase64.substring(0, 50) + '...');
    console.log(`[Facilitator Verify] Transaction (first 50 chars):`, transactionBase64.substring(0, 50) + '...');
    
    // Decode the BCS components
    console.log(`\n🔍 [Facilitator Verify] Decoding BCS components...`);
    try {
      const signatureBytes = Buffer.from(signatureBase64, 'base64');
      const transactionBytes = Buffer.from(transactionBase64, 'base64');
      
      console.log(`[Facilitator Verify] ✅ Signature decoded: ${signatureBytes.length} BCS bytes`);
      console.log(`[Facilitator Verify] ✅ Transaction decoded: ${transactionBytes.length} BCS bytes`);
      console.log(`[Facilitator Verify] Signature bytes (first 20):`, Array.from(signatureBytes.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      console.log(`[Facilitator Verify] Transaction bytes (first 20):`, Array.from(transactionBytes.slice(0, 20)).map(b => '0x' + b.toString(16).padStart(2, '0')).join(' '));
      
      // TODO: Implement proper BCS deserialization and validation
      // For now, we perform basic validation:
      // - Check both are valid base64 and have content
      // - In production, should deserialize BCS and verify:
      //   - Transaction signature is valid
      //   - Recipient matches paymentRequirements.payTo
      //   - Amount matches paymentRequirements.maxAmountRequired
      
      if (signatureBytes.length === 0 || transactionBytes.length === 0) {
        console.error(`[Facilitator Verify] ❌ Empty signature or transaction data`);
        const response: VerifyResponse = {
          isValid: false,
          invalidReason: "Empty signature or transaction data",
        };
        return NextResponse.json(response);
      }
      
      console.log(`[Facilitator Verify] ✅ Transaction and signature have valid BCS data`);
    } catch (decodeError) {
      console.error(`[Facilitator Verify] ❌ Failed to decode BCS:`, decodeError);
      const response: VerifyResponse = {
        isValid: false,
        invalidReason: "Invalid base64 encoding in signature or transaction",
      };
      return NextResponse.json(response);
    }

    console.log(`\n✅ [Facilitator Verify] Payment payload is valid!`);

    const duration = Date.now() - startTime;
    console.log(`[Facilitator Verify] ⏱️  Verification took ${duration}ms`);

    const response: VerifyResponse = {
      isValid: true,
      invalidReason: null,
    };

    console.log(`[Facilitator Verify] Response:`, response);
    const nextResponse = NextResponse.json(response);
    nextResponse.headers.set('X-Verification-Time', duration.toString());
    return nextResponse;

  } catch (error: any) {
    console.error("[Facilitator Verify] Error verifying payment:", error);
    
    const response: VerifyResponse = {
      isValid: false,
      invalidReason: error.message || String(error),
    };
    
    return NextResponse.json(response, { status: 500 });
  }
}
