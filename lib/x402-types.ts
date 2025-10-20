/**
 * Type definitions for x402 payment middleware
 * These will be exported when published as npm package
 */

export type RouteConfig = {
  price: string;
  asset?: `0x${string}`;
  network?: string;
  config?: {
    description?: string;
    mimeType?: string;
    outputSchema?: Record<string, any>;
    maxTimeoutSeconds?: number;
    extra?: object;
  };
};

export type RouteConfigOrArray = RouteConfig | RouteConfig[];

export type FacilitatorConfig = {
  url: string; // Required for public npm package
};

