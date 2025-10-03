/**
 * @x402/aptos - Official x402 Payment Protocol SDK for Aptos
 * 
 * Implement HTTP 402 Payment Required for machine-to-machine micropayments on Aptos
 * Based on Coinbase x402 protocol: https://github.com/coinbase/x402
 * 
 * @packageDocumentation
 */

// Export all types
export * from './types';

// Export server middleware
export { paymentMiddleware } from './server';

// Version
export const VERSION = '0.1.0';

