# x402 on Aptos

> Reference implementation of the [x402 payment protocol](https://github.com/coinbase/x402) for the Aptos blockchain.

```typescript
// Configure protected routes with payment requirements
export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    "/api/protected/weather": {
      price: "1000000",        // 0.01 APT in Octas
      network: "testnet",
      config: {
        description: "Access to weather data API",
      },
    },
  },
  {
    url: process.env.FACILITATOR_URL!,  // Facilitator endpoint
  }
);
```

## What is this?

This is a **working implementation** of the x402 protocol on Aptos blockchain. It demonstrates:

- ✅ HTTP 402 "Payment Required" responses with proper x402 payload structure
- ✅ Next.js middleware for payment interception and verification
- ✅ Facilitator endpoints for payment verification and settlement
- ✅ BCS (Binary Canonical Serialization) for transaction encoding
- ✅ Pattern A: "Sender signs, anyone can submit" (client pays gas)
- ✅ Working demo UI for testing the payment flow

## Architecture

```
┌─────────┐                  ┌─────────────────┐                  ┌────────────┐
│ Client  │                  │ Resource Server │                  │ Aptos      │
│         │                  │  + Facilitator  │                  │ Blockchain │
└────┬────┘                  └────────┬────────┘                  └─────┬──────┘
     │                                │                                  │
     │  1. GET /api/protected/weather │                                  │
     │ ─────────────────────────────> │                                  │
     │                                │                                  │
     │  2. 402 Payment Required       │                                  │
     │    (payment requirements)      │                                  │
     │ <───────────────────────────── │                                  │
     │                                │                                  │
     │  3. Sign transaction (offline) │                                  │
     │ ─────────────────────────────> │                                  │
     │                                │                                  │
     │  4. GET with X-PAYMENT header  │                                  │
     │ ─────────────────────────────> │                                  │
     │                                │                                  │
     │                                │  5. Verify payment (no blockchain)
     │                                │ ─────────────────────────────>   │
     │                                │                                  │
     │                                │  6. Settle payment               │
     │                                │ ─────────────────────────────────>
     │                                │                                  │
     │                                │  7. Transaction confirmed        │
     │                                │ <─────────────────────────────────
     │                                │                                  │
     │  8. 200 OK with resource       │                                  │
     │    + X-PAYMENT-RESPONSE header │                                  │
     │ <───────────────────────────── │                                  │
```

## Key Features

### 🎯 x402 Protocol Compliant
- Follows the official [x402 specification](https://github.com/coinbase/x402)
- Implements the `exact` payment scheme
- Uses standard `X-PAYMENT` and `X-PAYMENT-RESPONSE` headers

### ⚡ Aptos-Optimized
- BCS (Binary Canonical Serialization) for efficient encoding
- Uses Aptos SDK's `transaction.submit.simple()` method
- Client pays gas fees (Pattern A)
- ~1-3 second settlement time on Aptos testnet

### 🔒 Secure & Trust-Minimizing
- Verify before settle (fast validation without blockchain interaction)
- Atomic payment + resource delivery
- Facilitator cannot move funds outside client's signed transaction
- Built-in replay protection via Aptos sequence numbers

### 🚀 Easy Integration
- Single middleware function protects any API route
- Clean separation: business logic stays in route handlers
- Detailed console logging for debugging
- No custom infrastructure needed

## Project Structure

```
aptos-x402/
├── app/
│   ├── page.tsx                          # Demo UI
│   └── api/
│       ├── facilitator/
│       │   ├── verify/route.ts           # Payment verification endpoint
│       │   └── settle/route.ts           # Payment settlement endpoint
│       └── protected/
│           └── weather/route.ts          # Example protected API
├── lib/
│   ├── x402-middleware.ts                # Core middleware logic
│   ├── x402-types.ts                     # TypeScript types
│   ├── x402-protocol-types.ts            # x402 protocol types
│   ├── facilitator-client.ts             # Facilitator client helpers
│   └── aptos-utils.ts                    # Aptos SDK utilities
├── middleware.ts                         # Next.js middleware config
└── specs/
    └── schemes/
        └── aptos-exact.md                # Scheme documentation
```

## Getting Started

### Prerequisites

- Node.js v20 or higher
- An Aptos account with testnet APT (for client)
- An Aptos account to receive payments (for server)

### Installation

1. **Clone and install dependencies:**
   ```bash
   git clone <your-repo>
   cd aptos-x402
   npm install
   ```

2. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```

   Edit `.env`:
   ```env
   # Aptos Network
   APTOS_NETWORK=testnet
   APTOS_NODE_URL=https://fullnode.testnet.aptoslabs.com/v1

   # Payment Recipient (your server's address)
   PAYMENT_RECIPIENT_ADDRESS=0x...your_address...

   # Facilitator URL (internal in this demo)
   FACILITATOR_URL=http://localhost:3000/api/facilitator

   # Demo Account (for testing - fund this on Aptos testnet)
   DEMO_PRIVATE_KEY=0x...demo_private_key...
   DEMO_ADDRESS=0x...demo_address...
   NEXT_PUBLIC_DEMO_PRIVATE_KEY=0x...demo_private_key...
   ```

3. **Fund your demo account:**
   - Go to [Aptos Faucet](https://www.aptosfaucet.com/)
   - Enter your `DEMO_ADDRESS`
   - Get 1 APT on testnet

4. **Run the development server:**
   ```bash
   npm run dev
   ```

5. **Test the payment flow:**
   - Open http://localhost:3000
   - Click "Request Weather API" (gets 402)
   - Click "Send Payment & Retry" (payment succeeds)
   - See the weather data delivered!

## How It Works

### 1. Client Receives 402 Payment Required

```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "aptos-testnet",
    "maxAmountRequired": "1000000",
    "payTo": "0x...",
    "resource": "https://api.example.com/weather",
    "description": "Access to weather data API",
    "mimeType": "application/json",
    "maxTimeoutSeconds": 60
  }]
}
```

### 2. Client Signs Transaction

```typescript
const transaction = await aptos.transaction.build.simple({
  sender: account.accountAddress,
  data: {
    function: "0x1::aptos_account::transfer",
    functionArguments: [payTo, amount]
  }
});

const authenticator = aptos.transaction.sign({ signer: account, transaction });
```

### 3. Client Sends X-PAYMENT Header

```typescript
const paymentPayload = {
  x402Version: 1,
  scheme: "exact",
  network: "aptos-testnet",
  payload: {
    signature: Buffer.from(authenticator.bcsToBytes()).toString('base64'),
    transaction: Buffer.from(transaction.bcsToBytes()).toString('base64'),
  }
};

const paymentHeader = Buffer.from(JSON.stringify(paymentPayload)).toString('base64');

fetch(url, {
  headers: { "X-PAYMENT": paymentHeader }
});
```

### 4. Facilitator Verifies and Settles

```typescript
// Verify (fast, no blockchain)
const verification = await verifyPayment(facilitatorUrl + "/verify", {
  x402Version: 1,
  paymentHeader,
  paymentRequirements
});

if (!verification.isValid) {
  return 402; // Payment Required
}

// Settle (submits to blockchain)
const settlement = await settlePayment(facilitatorUrl + "/settle", {
  x402Version: 1,
  paymentHeader,
  paymentRequirements
});

if (!settlement.success) {
  return 402; // Payment Required
}

// Payment confirmed! Deliver resource
return 200; // OK
```

## Scheme: `exact` on Aptos

The `exact` scheme enables exact-amount payments for protected resources.

**Transaction Details:**
- **Function**: `0x1::aptos_account::transfer` (built-in Aptos system function)
- **Encoding**: BCS (Binary Canonical Serialization)
- **Gas**: Paid by client (~100-500 Octas, negligible)
- **Settlement**: 1-3 seconds on Aptos testnet

**Payment Flow:**
1. Client signs transaction with exact amount
2. Facilitator verifies signature and amount (offline)
3. Facilitator submits to Aptos blockchain using SDK
4. Blockchain confirms transaction
5. Resource delivered atomically

See [`specs/schemes/aptos-exact.md`](./specs/schemes/aptos-exact.md) for complete technical specification.

## Current Status

### ✅ Implemented
- [x] x402 protocol core types and structures
- [x] Next.js middleware for payment interception
- [x] Facilitator verify endpoint (offline validation)
- [x] Facilitator settle endpoint (blockchain submission)
- [x] BCS serialization/deserialization
- [x] Pattern A: Sender pays gas
- [x] Demo UI with payment flow
- [x] Comprehensive scheme documentation

### 🚧 Planned
- [ ] Full signature verification in `/verify` endpoint
- [ ] Pattern B: Fee-payer flow (facilitator pays gas)
- [ ] Multi-currency support (Aptos fungible assets)
- [ ] Client SDK package
- [ ] Rate limiting and DDoS protection
- [ ] Production deployment guide

## Differences from x402 Reference Implementation

This Aptos implementation differs from the official x402 EVM implementation:

| Feature | EVM (Official) | Aptos (This Repo) |
|---------|----------------|-------------------|
| Blockchain | Ethereum, Base | Aptos |
| Encoding | EIP-712 | BCS |
| SDK | ethers.js | @aptos-labs/ts-sdk |
| Submission | Direct or facilitator | Facilitator (Pattern A) |
| Gas Payment | Various patterns | Client pays (Pattern A) |
| Settlement Time | ~12-15 seconds | ~1-3 seconds |

## Contributing

Contributions welcome! Please ensure:
1. Code follows existing patterns
2. Tests pass (when added)
3. Documentation is updated
4. Scheme documentation is accurate

## Resources

- [x402 Official Specification](https://github.com/coinbase/x402)
- [Aptos Developer Docs](https://aptos.dev)
- [Aptos TypeScript SDK](https://github.com/aptos-labs/aptos-ts-sdk)
- [BCS Specification](https://docs.rs/bcs/latest/bcs/)

## License

MIT License - see LICENSE file for details

## Acknowledgments

Built on the x402 protocol by Coinbase. Special thanks to the Aptos community for SDK support and documentation.
