/**
 * Whop Subscribe Endpoint
 *
 * Creates a Whop checkout session for upgrading from trial to paid
 */

import { NextRequest, NextResponse } from 'next/server';
import { WhopServerSdk } from '@whop/api';
import { PlanTier } from '@/lib/features/types';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

// Initialize Whop SDK
const whopApi = WhopServerSdk({
  appApiKey: process.env.WHOP_API_KEY!,
  appId: process.env.NEXT_PUBLIC_WHOP_APP_ID!,
});

// Map our tiers to Whop product IDs
// TODO: Create products in Whop dashboard and update these IDs
const WHOP_PRODUCT_IDS: Record<PlanTier, string> = {
  [PlanTier.BASIC]: process.env.WHOP_BASIC_PRODUCT_ID || 'prod_basic_monthly',
  [PlanTier.PRO]: process.env.WHOP_PRO_PRODUCT_ID || 'prod_pro_monthly',
  [PlanTier.ENTERPRISE]: process.env.WHOP_ENTERPRISE_PRODUCT_ID || 'prod_enterprise_monthly',
};

export async function POST(req: NextRequest) {
  try {
    const { tier } = await req.json();

    // Validate tier
    if (!tier || !Object.values(PlanTier).includes(tier)) {
      return NextResponse.json(
        { error: 'Invalid plan tier' },
        { status: 400 }
      );
    }

    const productId = WHOP_PRODUCT_IDS[tier as PlanTier];

    logInfo('Creating checkout session', {
      tier,
      product_id: productId,
    });

    // Create Whop checkout session
    // Note: Whop SDK method may vary - check their docs
    const checkoutUrl = `https://whop.com/checkout?product=${productId}&success_url=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_URL}/dashboard?upgraded=true`
    )}&cancel_url=${encodeURIComponent(
      `${process.env.NEXT_PUBLIC_URL}/upgrade`
    )}`;

    return NextResponse.json({
      success: true,
      checkoutUrl,
      tier,
    });

  } catch (error) {
    logError('Failed to create checkout session', { error });

    return NextResponse.json(
      {
        error: 'Failed to create checkout session',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * GET endpoint to retrieve available plans and pricing
 */
export async function GET() {
  return NextResponse.json({
    plans: [
      {
        tier: PlanTier.BASIC,
        name: 'Basic',
        price: 29,
        product_id: WHOP_PRODUCT_IDS[PlanTier.BASIC],
      },
      {
        tier: PlanTier.PRO,
        name: 'Pro',
        price: 99,
        product_id: WHOP_PRODUCT_IDS[PlanTier.PRO],
        popular: true,
      },
      {
        tier: PlanTier.ENTERPRISE,
        name: 'Enterprise',
        price: 299,
        product_id: WHOP_PRODUCT_IDS[PlanTier.ENTERPRISE],
      },
    ],
  });
}
