/**
 * Facilitator Client
 * 
 * Wrapper functions for interacting with the x402 facilitator service.
 * This abstracts away the facilitator API calls from protected routes.
 * 
 * In the future, this can be replaced with an SDK:
 * import { AptosX402Facilitator } from '@your-org/aptos-x402-sdk'
 */

export interface VerifyPaymentRequest {
  signedTransaction: string;  // base64 encoded signed transaction
  expectedRecipient: string;
  expectedAmount: string;
  expectedNetwork: string;
}

export interface VerifyPaymentResponse {
  valid: boolean;
  error?: string;
  message?: string;
}

export interface SettlePaymentResponse {
  settled: boolean;
  transactionHash?: string;
  amount?: string;
  recipient?: string;
  network?: string;
  timestamp?: string;
  status?: string;
  error?: string;
  message?: string;
}

/**
 * Verify a payment through the facilitator (does NOT submit to blockchain)
 * 
 * @param facilitatorUrl - URL of the facilitator verify endpoint
 * @param signedTransaction - Base64 encoded signed transaction
 * @param expectedRecipient - Expected payment recipient address
 * @param expectedAmount - Expected payment amount in octas
 * @param expectedNetwork - Expected network (testnet/mainnet)
 * @returns Verification result (valid/invalid)
 */
export async function verifyPayment(
  facilitatorUrl: string,
  signedTransaction: string,
  expectedRecipient: string,
  expectedAmount: string,
  expectedNetwork: string = "testnet"
): Promise<VerifyPaymentResponse> {
  try {
    const response = await fetch(facilitatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signedTransaction,
        expectedRecipient,
        expectedAmount,
        expectedNetwork,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        valid: false,
        error: data.error || "Verification failed",
        message: data.message || `HTTP ${response.status}`,
      };
    }

    return data as VerifyPaymentResponse;
  } catch (error) {
    return {
      valid: false,
      error: "Network error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Settle a payment through the facilitator (submits to blockchain)
 * 
 * @param facilitatorUrl - URL of the facilitator settle endpoint
 * @param signedTransaction - Base64 encoded signed transaction
 * @param expectedRecipient - Expected payment recipient address
 * @param expectedAmount - Expected payment amount in octas
 * @param expectedNetwork - Expected network (testnet/mainnet)
 * @returns Settlement result with transaction hash
 */
export async function settlePayment(
  facilitatorUrl: string,
  signedTransaction: string,
  expectedRecipient: string,
  expectedAmount: string,
  expectedNetwork: string = "testnet"
): Promise<SettlePaymentResponse> {
  try {
    const response = await fetch(facilitatorUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        signedTransaction,
        expectedRecipient,
        expectedAmount,
        expectedNetwork,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        settled: false,
        error: data.error || "Settlement failed",
        message: data.message || `HTTP ${response.status}`,
      };
    }

    return data as SettlePaymentResponse;
  } catch (error) {
    return {
      settled: false,
      error: "Network error",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Create an x402 payment response object for successful payments
 * 
 * @param settlementResult - Result from the facilitator settlement
 * @returns Payment response object for X-Payment-Response header
 */
export function createPaymentResponse(settlementResult: SettlePaymentResponse) {
  return {
    transactionHash: settlementResult.transactionHash,
    amount: settlementResult.amount,
    currency: "APT",
    recipient: settlementResult.recipient,
    network: settlementResult.network,
    timestamp: settlementResult.timestamp,
    status: settlementResult.status,
  };
}

/**
 * Get facilitator verify URL from environment or use default
 * 
 * @returns Facilitator verify endpoint URL
 */
export function getFacilitatorVerifyUrl(): string {
  return process.env.FACILITATOR_VERIFY_URL || "/api/facilitator/verify";
}

/**
 * Get facilitator settle URL from environment or use default
 * 
 * @returns Facilitator settle endpoint URL
 */
export function getFacilitatorSettleUrl(): string {
  return process.env.FACILITATOR_SETTLE_URL || "/api/facilitator/settle";
}

/**
 * Get facilitator verify URL (for backward compatibility)
 */
export function getFacilitatorUrl(): string {
  return getFacilitatorVerifyUrl();
}

/**
 * Convenience function to verify payment with automatic URL resolution
 * 
 * @param signedTransaction - Base64 encoded signed transaction
 * @param expectedRecipient - Expected payment recipient
 * @param expectedAmount - Expected payment amount
 * @param expectedNetwork - Expected network
 * @returns Verification result
 */
export async function verifyPaymentSimple(
  signedTransaction: string,
  expectedRecipient: string,
  expectedAmount: string,
  expectedNetwork: string = "testnet"
): Promise<VerifyPaymentResponse> {
  const facilitatorUrl = getFacilitatorVerifyUrl();
  return verifyPayment(
    facilitatorUrl,
    signedTransaction,
    expectedRecipient,
    expectedAmount,
    expectedNetwork
  );
}

/**
 * Convenience function to settle payment with automatic URL resolution
 * 
 * @param signedTransaction - Base64 encoded signed transaction
 * @param expectedRecipient - Expected payment recipient
 * @param expectedAmount - Expected payment amount
 * @param expectedNetwork - Expected network
 * @returns Settlement result
 */
export async function settlePaymentSimple(
  signedTransaction: string,
  expectedRecipient: string,
  expectedAmount: string,
  expectedNetwork: string = "testnet"
): Promise<SettlePaymentResponse> {
  const facilitatorUrl = getFacilitatorSettleUrl();
  return settlePayment(
    facilitatorUrl,
    signedTransaction,
    expectedRecipient,
    expectedAmount,
    expectedNetwork
  );
}

