/**
 * Next.js Middleware Configuration
 * 
 * This file configures x402 payment protection for your API routes.
 * When publishing as npm package, users will create their own middleware.ts
 * and import paymentMiddleware from your package.
 */

import { paymentMiddleware } from "./lib/vara-x402-middleware";

// Configure protected routes and their payment requirements
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    "/api/protected/weather": {
      price: "10000000000",
      network: "testnet",
      config: {
        description: "Access to weather data API",
      },
    },
  },
  {
    // Facilitator URL is REQUIRED for x402 protocol
    url: process.env.FACILITATOR_URL!,
  }
);

// Configure which paths the middleware should run on
export const config = {
  matcher: ["/api/protected/:path*"],
};

