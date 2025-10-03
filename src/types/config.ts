/**
 * SDK Configuration Types
 * These types are used to configure the x402 middleware
 */

/**
 * Route-specific payment configuration
 */
export interface RouteConfig {
  /** Price in atomic units (e.g., Octas for Aptos) */
  price: string;
  
  /** Network to use (e.g., "testnet", "mainnet") - will be mapped to full network identifier */
  network?: string;
  
  /** Additional configuration options */
  config?: {
    /** Human-readable description of the resource */
    description?: string;
    
    /** MIME type of the response */
    mimeType?: string;
    
    /** JSON schema describing the output */
    outputSchema?: Record<string, any>;
    
    /** Maximum timeout in seconds */
    maxTimeoutSeconds?: number;
  };
}

/**
 * Facilitator configuration
 */
export interface FacilitatorConfig {
  /** Base URL of the facilitator (REQUIRED) */
  url: string;
}

/**
 * Complete middleware configuration
 */
export interface PaymentMiddlewareConfig {
  /** Payment recipient address */
  recipientAddress: string;
  
  /** Route configurations (path -> config) */
  routes: Record<string, RouteConfig>;
  
  /** Facilitator configuration */
  facilitator: FacilitatorConfig;
}

