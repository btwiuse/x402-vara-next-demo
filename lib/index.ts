/**
 * x402 for Aptos - Main Package Exports
 * 
 * When publishing to npm, users will import from this package:
 * import { paymentMiddleware } from '@your-org/aptos-x402'
 */

// Main middleware function
export { paymentMiddleware } from "./x402-middleware";

// Type definitions
export type { RouteConfig, FacilitatorConfig } from "./x402-types";

// Facilitator client functions (for advanced usage)
export {
  verifyPaymentSimple,
  settlePaymentSimple,
  createPaymentResponse,
  getFacilitatorUrl,
} from "./facilitator-client";

// Aptos utilities (for advanced usage)
export {
  getAptosClient,
  getAccountFromPrivateKey,
  signAndSubmitPayment,
  getAccountBalance,
} from "./aptos-utils";

