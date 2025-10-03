/**
 * Example: Protected API Route
 * 
 * Your API routes stay clean and focused on business logic.
 * The middleware handles ALL payment verification automatically.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/premium/weather
 * 
 * This route is protected by x402 middleware.
 * Requests WITHOUT payment get 402 Payment Required.
 * Requests WITH valid payment get the resource.
 * 
 * You don't need to write ANY payment logic here!
 */
export async function GET(request: Request) {
  // The middleware has already verified and settled the payment
  // If we reach this code, payment was successful
  
  // Just return your premium data
  return NextResponse.json({
    location: 'San Francisco',
    temperature: 72,
    forecast: '5-day detailed forecast data...',
    premium: true,
    timestamp: new Date().toISOString(),
  });
}

