/**
 * x402 Payment Middleware for Aptos
 * Following official Coinbase x402 protocol specification
 * https://github.com/coinbase/x402
 */

import { NextRequest, NextResponse } from "next/server";
import type { RouteConfig, RouteConfigOrArray, FacilitatorConfig } from "./x402-types";
import type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
} from "./x402-protocol-types";
import { X402_VERSION, X402_SCHEME, VARA_TESTNET, VARA_MAINNET } from "./x402-protocol-types";

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfigOrArray>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`[x402 Middleware] Request to: ${pathname}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    // Check if this route is protected
    const routeConfigOrArray = routes[pathname];
    if (!routeConfigOrArray) {
      console.log(`[x402 Middleware] Route not protected, passing through`);
      return NextResponse.next();
    }

    console.log(`[x402 Middleware] ✅ Route is protected`);

    // Normalize to array for consistent processing
    const routeConfigs = Array.isArray(routeConfigOrArray)
      ? routeConfigOrArray
      : [routeConfigOrArray];

    const paymentHeader = request.headers.get("X-PAYMENT");
    
    const facilitatorUrl = facilitatorConfig.url;

    console.log(`[x402 Middleware] Configuration:`, {
      recipient: recipientAddress,
      configs: routeConfigs.map(config => ({
        price: config.price,
        asset: config.asset || null,
        network: config.network || "testnet",
      })),
      facilitator: facilitatorUrl,
      hasPayment: !!paymentHeader,
    });

    // Validate configuration
    if (!recipientAddress) {
      console.error(`[x402 Middleware] ❌ No recipient address configured`);
      return NextResponse.json(
        { error: "Server configuration error: Payment recipient not configured" },
        { status: 500 }
      );
    }

    // Build payment requirements for each configuration per x402 spec
    const paymentRequirements: PaymentRequirements[] = routeConfigs.map(routeConfig => {
      // Map simple network names to full Aptos network identifiers
      const simpleNetwork = routeConfig.network || "testnet";
      const network = simpleNetwork === "mainnet"
        ? VARA_MAINNET
        : simpleNetwork === "testnet"
        ? VARA_TESTNET
        : `vara-${simpleNetwork}`;

      return {
        scheme: X402_SCHEME,
        network: network,
        maxAmountRequired: routeConfig.price,
        resource: request.url,
        description: routeConfig.config?.description || "Access to protected resource",
        mimeType: routeConfig.config?.mimeType || "application/json",
        outputSchema: routeConfig.config?.outputSchema || null,
        payTo: recipientAddress,
        asset: routeConfig.asset,
        maxTimeoutSeconds: routeConfig.config?.maxTimeoutSeconds || 60,
        extra: routeConfig.config?.extra || null,
      };
    });

    // If no payment provided, return 402 with payment requirements per x402 spec
    if (!paymentHeader) {
      console.log(`[x402 Middleware] 💳 No payment header found, returning 402`);
      
      const response402: PaymentRequiredResponse = {
        x402Version: X402_VERSION,
        accepts: paymentRequirements,
      };
      
      console.log(`[x402 Middleware] 402 Response (x402 spec):`, response402);
      return NextResponse.json(response402, { status: 402 });
    }

    console.log(`[x402 Middleware] 💰 Payment header found (${paymentHeader.length} chars)`);
    console.log(`[x402 Middleware] Payment preview: ${paymentHeader.substring(0, 50)}...`);

    try {
      // Parse the X-PAYMENT header (base64 encoded PaymentPayload)
      const paymentPayloadJson = Buffer.from(paymentHeader, 'base64').toString('utf-8');
      const paymentPayload: PaymentPayload = JSON.parse(paymentPayloadJson);
      
      console.log(`[x402 Middleware] Parsed payment payload:`, {
        x402Version: paymentPayload.x402Version,
        scheme: paymentPayload.scheme,
        asset: paymentPayload.asset,
        network: paymentPayload.network,
      });

      // Validate payment payload format
      if (paymentPayload.x402Version !== X402_VERSION) {
        console.error(`[x402 Middleware] ❌ Unsupported x402 version: ${paymentPayload.x402Version}`);
        return NextResponse.json(
          { error: `Unsupported x402 version: ${paymentPayload.x402Version}` },
          { status: 400 }
        );
      }

      if (paymentPayload.scheme !== X402_SCHEME) {
        console.error(`[x402 Middleware] ❌ Unsupported scheme: ${paymentPayload.scheme}`);
        return NextResponse.json(
          { error: `Unsupported payment scheme: ${paymentPayload.scheme}` },
          { status: 400 }
        );
      }

      let paymentReqs: PaymentRequirements | undefined;
      for (const p of paymentRequirements) {
        if (p.asset == paymentPayload.asset) {
          paymentReqs = p;
          break;
        }
      }

      if (!paymentReqs) {
        console.error(`[x402 Middleware] ❌ Unsupported asset: ${paymentPayload.asset}`);
        return NextResponse.json(
          { error: `Unsupported payment asset: ${paymentPayload.asset}` },
          { status: 400 }
        );
      }

      // Step 1: Verify payment (fast, no blockchain submission)
      console.log(`\n🔍 [x402 Middleware] STEP 1: Verifying payment`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/verify`);

      const verifyRequest: VerifyRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentReqs,
      };
      
      const verifyResponse = await fetch(`${facilitatorUrl}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(verifyRequest),
      });

      const verification: VerifyResponse = await verifyResponse.json();
      const verificationTime = verifyResponse.headers.get('x-verification-time');
      console.log(`[x402 Middleware] Verification result:`, verification);
      if (verificationTime) {
        console.log(`[x402 Middleware] ⏱️  Verification took ${verificationTime}ms`);
      }

      // Check if payment is valid
      if (!verification.isValid) {
        console.error(`❌ [x402 Middleware] Verification FAILED`);
        console.error(`[x402 Middleware] Reason:`, verification.invalidReason);
        return NextResponse.json(
          {
            error: "Payment verification failed",
            message: verification.invalidReason,
          },
          { status: 403 }
        );
      }

      console.log(`✅ [x402 Middleware] Verification SUCCESS`);

      // Step 2: Settle payment BEFORE providing resource
      console.log(`\n💰 [x402 Middleware] STEP 2: Settling payment`);
      console.log(`[x402 Middleware] Calling: ${facilitatorUrl}/settle`);
      
      const settleRequest: SettleRequest = {
        x402Version: X402_VERSION,
        paymentHeader: paymentHeader,
        paymentRequirements: paymentReqs,
      };
      
      const settleResponse = await fetch(`${facilitatorUrl}/settle`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settleRequest),
      });

      const settlement: SettleResponse = await settleResponse.json();
      const settlementTime = settleResponse.headers.get('x-settlement-time');
      console.log(`[x402 Middleware] Settlement result:`, settlement);
      if (settlementTime) {
        console.log(`[x402 Middleware] ⏱️  Settlement took ${settlementTime}ms`);
      }

      // Step 3: Only continue if payment settled successfully
      if (!settlement.success) {
        console.error(`\n❌ [x402 Middleware] Settlement FAILED`);
        console.error(`[x402 Middleware] Error:`, settlement.error);
        return NextResponse.json(
          {
            error: "Payment settlement failed",
            message: settlement.error,
          },
          { status: 402 } // Payment required - settlement failed
        );
      }

      console.log(`✅ [x402 Middleware] Settlement SUCCESS`);
      console.log(`[x402 Middleware] Transaction hash:`, settlement.txHash);

      // Step 4: Payment settled! Now execute the route handler
      const response = await NextResponse.next();

      // Step 5: Add X-PAYMENT-RESPONSE header per x402 spec
      const responseHeaders = new Headers(response.headers);
      const paymentResponse = {
        settlement: settlement,
      };
      responseHeaders.set(
        "X-Payment-Response",
        Buffer.from(JSON.stringify(paymentResponse)).toString('base64')
      );

      // Add timing headers for client debugging
      if (verificationTime) {
        responseHeaders.set('X-Verification-Time', verificationTime);
      }
      if (settlementTime) {
        responseHeaders.set('X-Settlement-Time', settlementTime);
      }

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });
    } catch (error) {
      console.error(`[x402 Middleware] Error processing payment for ${pathname}:`, error);
      return NextResponse.json(
        {
          error: "Payment processing failed",
          message: error instanceof Error ? error.message : String(error),
        },
        { status: 500 }
      );
    }
  };
}
