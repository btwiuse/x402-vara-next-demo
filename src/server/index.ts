/**
 * @x402/aptos - Server Middleware
 * 
 * Export payment middleware for various server frameworks
 */

// Next.js middleware
export { paymentMiddleware } from './next';

// Re-export types for convenience
export type {
  RouteConfig,
  FacilitatorConfig,
  PaymentMiddlewareConfig,
} from '../types';

