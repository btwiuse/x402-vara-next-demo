# x402-vara-next-demo

> x402 Demo on Vara Network

HTTP 402 Payment Required for machine-to-machine micropayments on Vara Network.

[![npm version](https://img.shields.io/npm/v/x402-vara.svg)](https://www.npmjs.com/package/x402-vara)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Quick Start (5 Minutes)

Add cryptocurrency payments to your Next.js API in just 3 steps:

### Step 1: Install the Package

```bash
bun i x402-vara
```

### Step 2: Create `middleware.ts` in Your Project Root

Create a file called `middleware.ts` in the root of your Next.js project (same level as `app/` or `pages/`):

```typescript
// middleware.ts
import { paymentMiddleware } from "x402-vara/next";

export const middleware = paymentMiddleware(
  process.env.PAYMENT_RECIPIENT_ADDRESS!,
  {
    // Configure which routes require payment
    '/api/premium/weather': [
      {
        price: '100000000000',  // 0.1 VARA
        network: 'vara-testnet', // or 'vara' for mainnet
        config: { description: 'Premium weather data' },
      }
    ],
  },
  { 
    url: process.env.FACILITATOR_URL!
  }
);

export const config = {
  matcher: ['/api/premium/:path*'],  // Apply to all /api/premium/* routes
};
```

### Step 3: Set Environment Variable

Create `.env.local` in your project root:

```env
# Your wallet address (where payments go)
PAYMENT_RECIPIENT_ADDRESS=kGkLEU3e3XXkJp2WK4eNpVmSab5xUNL9QtmLPh8QfCL2EgotW

# Use local facilitator url: process.env.NEXT_PUBLIC_URL + '/api/facilitator'
# FACILITATOR_URL=http://localhost:3000/api/facilitator

# Or the public demo facilitator (perfect for testing)
FACILITATOR_URL=https://x402-vara-next-demo.up.railway.app/api/facilitator
```

**How to get your wallet address:**
1. Install SubWallet
2. Create a new wallet for Vara Network
3. Copy your address (starts with `kG`)
4. Paste it in `.env.local`

**That's it!** 🎉 Your API routes under `/api/premium/*` now require payment.

### Your API Routes Stay Clean

**Important:** You don't need to change anything in your API routes! The middleware handles everything.

```typescript
// app/api/premium/weather/route.ts
import { NextResponse } from 'next/server';

export async function GET() {
  // This code only runs AFTER payment is verified and settled!
  // No payment logic needed here.
  
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    condition: 'Sunny',
  });
}
```

The middleware automatically:
- ✅ Returns 402 for requests without payment
- ✅ Verifies payment signatures
- ✅ Settles payments on Vara Network
- ✅ Only allows API execution after successful payment
- ✅ Adds payment receipt headers to responses

### Next.js Requirements

- **Next.js 15+** with App Router
- TypeScript (recommended)
- Node.js 20+

### Complete Project Structure

After setup, your Next.js project should look like this:

```
my-nextjs-app/
├── middleware.ts              ← Payment middleware (created in Step 2)
├── .env.local                 ← Environment variables (created in Step 3)
├── app/
│   └── api/
│       └── premium/           ← Protected routes (payment required)
│           └── weather/
│               └── route.ts   ← Your API route (no payment code needed!)
├── package.json
└── next.config.js
```

**Key Points:**
- ✅ `middleware.ts` must be in the project root (not inside `app/`)
- ✅ Applies to all routes matching `/api/premium/*` (configurable)
- ✅ Your API routes need **zero** payment code
- ✅ Works automatically on every request

### Testing Your Setup

After setup, test that payment protection is working:

**1. Start your Next.js dev server:**
```bash
npm run dev
```

**2. Try accessing your protected route without payment:**
```bash
curl http://localhost:3000/api/premium/weather
```

**Expected Response (402 Payment Required):**
```json
{
  "x402Version": 1,
  "accepts": [{
    "scheme": "exact",
    "network": "vara-testnet",
    "maxAmountRequired": "100000000000",
    "payTo": "kG...",
    "description": "Premium weather data",
    "resource": "http://localhost:3000/api/premium/weather"
  }]
}
```

✅ If you see this 402 response, your middleware is working perfectly!

**3. For full payment testing:**
- Use our [live demo](https://x402-vara-next-demo.up.railway.app) to see the complete flow
- Or implement client-side payment signing (see [Client Integration](#client-integration) below)

## What is x402?

[x402](https://github.com/coinbase/x402) is an open protocol by Coinbase for machine-to-machine micropayments using HTTP 402 status code.

### Use Cases

- 💰 **Pay-per-API-call** - Monetize your APIs without subscriptions
- 🤖 **AI Agent Payments** - Let AI agents pay for resources automatically
- 📊 **Metered Services** - Charge exactly for what's consumed
- 🔐 **Decentralized Access Control** - No API keys, just payments
- ⚡ **Micropayments** - Enable sub-cent transactions economically

## Features

- ✅ **Zero payment logic in your code** - Middleware handles everything
- ✅ **Type-safe** - Full TypeScript support
- ✅ **x402 compliant** - Follows official Coinbase specification
- ✅ **Next.js optimized** - Designed for Next.js 15+ (more frameworks coming)
- ✅ **Production ready** - Comprehensive error handling and logging

## How It Works

```
┌─────────┐                  ┌─────────┐                  ┌────────────┐
│ Client  │                  │  Your   │                  │   Vara     │
│         │                  │  API    │                  │  Network   │
└────┬────┘                  └────┬────┘                  └─────┬──────┘
     │                            │                              │
     │  1. GET /api/premium      │                              │
     │──────────────────────────>│                              │
     │                            │                              │
     │  2. 402 Payment Required  │                              │
     │<──────────────────────────│                              │
     │   {accepts: [...]}         │                              │
     │                            │                              │
     │  3. Sign Transaction       │                              │
     │   (client-side)            │                              │
     │                            │                              │
     │  4. GET /api/premium      │                              │
     │     X-PAYMENT: <signed>   │                              │
     │──────────────────────────>│                              │
     │                            │  5. Verify (fast)            │
     │                            │──────────────┐               │
     │                            │              │               │
     │                            │<─────────────┘               │
     │                            │                              │
     │                            │  6. Settle (submit tx)       │
     │                            │─────────────────────────────>│
     │                            │                              │
     │                            │  7. Confirmed                │
     │                            │<─────────────────────────────│
     │                            │                              │
     │  8. 200 OK + Resource     │                              │
     │<──────────────────────────│                              │
     │   X-Payment-Response       │                              │
```

## License

MIT

---

Built with ❤️  for Vara Network

