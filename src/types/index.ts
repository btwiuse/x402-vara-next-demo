/**
 * @x402/aptos Type Definitions
 * 
 * Re-exports all types used by the SDK
 */

// Protocol types (from x402 spec)
export type {
  PaymentRequiredResponse,
  PaymentRequirements,
  PaymentPayload,
  VerifyRequest,
  VerifyResponse,
  SettleRequest,
  SettleResponse,
  PaymentResponseHeader,
} from './protocol';

export {
  X402_VERSION,
  X402_SCHEME,
  APTOS_MAINNET,
  APTOS_TESTNET,
  APTOS_DEVNET,
} from './protocol';

// Configuration types
export type {
  RouteConfig,
  FacilitatorConfig,
  PaymentMiddlewareConfig,
} from './config';

