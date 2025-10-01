/**
 * x402 Payment Middleware for Aptos
 * Extended from official Coinbase x402-next paymentMiddleware
 */

import { NextRequest, NextResponse } from "next/server";
import type { RouteConfig, FacilitatorConfig } from "./x402-types";
import {
  verifyPayment,
  settlePayment,
  createPaymentResponse,
} from "./facilitator-client";

export function paymentMiddleware(
  recipientAddress: string,
  routes: Record<string, RouteConfig>,
  facilitatorConfig: FacilitatorConfig
) {
  return async function middleware(request: NextRequest) {
    const pathname = request.nextUrl.pathname;
    
    // Check if this route is protected
    const routeConfig = routes[pathname];
    if (!routeConfig) {
      // Not a protected route, continue normally
      return NextResponse.next();
    }

    const paymentHeader = request.headers.get("X-PAYMENT");
    const network = routeConfig.network || process.env.APTOS_NETWORK || "testnet";
    const facilitatorUrl = facilitatorConfig.url;

    // Validate configuration
    if (!recipientAddress) {
      return NextResponse.json(
        { error: "Server configuration error: Payment recipient not configured" },
        { status: 500 }
      );
    }

    // If no payment provided, return 402 with payment requirements
    if (!paymentHeader) {
      return NextResponse.json(
        {
          message: "Payment Required",
          price: routeConfig.price,
          currency: "APT",
          paymentAddress: recipientAddress,
          network: network,
          facilitator: facilitatorUrl,
          resource: request.url,
          description: routeConfig.config?.description || "Access to protected resource",
          metadata: {
            mimeType: routeConfig.config?.mimeType,
            outputSchema: routeConfig.config?.outputSchema,
          },
        },
        { status: 402 }
      );
    }

    try {
      // Step 1: Verify payment (fast, no blockchain submission)
      console.log(`🔍 [x402 Middleware] Verifying payment for ${pathname}...`);
      const verification = await verifyPayment(
        `${facilitatorUrl}/verify`,
        paymentHeader,
        recipientAddress,
        routeConfig.price,
        network
      );

      // Check if payment is valid
      if (!verification.valid) {
        return NextResponse.json(
          {
            error: "Payment verification failed",
            message: verification.message || verification.error,
          },
          { status: 403 }
        );
      }

      console.log(`✅ [x402 Middleware] Payment verified for ${pathname}`);

      // Step 2: Payment is valid, let the request through to the route handler
      const requestHeaders = new Headers(request.headers);
      requestHeaders.set("x-payment-verified", "true");
      requestHeaders.set("x-payment-amount", routeConfig.price);

      // Continue to the route handler
      const response = await NextResponse.next({
        request: {
          headers: requestHeaders,
        },
      });

      // Step 3: After the route handler returns, settle the payment
      console.log(`💰 [x402 Middleware] Settling payment for ${pathname}...`);
      const settlement = await settlePayment(
        `${facilitatorUrl}/settle`,
        paymentHeader,
        recipientAddress,
        routeConfig.price,
        network
      );

      if (!settlement.settled) {
        console.warn(`⚠️  [x402 Middleware] Settlement failed for ${pathname}:`, settlement.error);
      } else {
        console.log(`✅ [x402 Middleware] Payment settled for ${pathname}`);
      }

      // Step 4: Add payment response header to the response
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set(
        "X-Payment-Response",
        settlement.settled
          ? JSON.stringify(createPaymentResponse(settlement))
          : JSON.stringify({ error: "Settlement pending" })
      );

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
