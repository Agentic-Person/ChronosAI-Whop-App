/**
 * Whop App Install Endpoint
 *
 * Called when a creator installs the app from Whop marketplace.
 * Initializes the creator account, starts 7-day trial, and provisions demo content.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { TrialManager } from '@/lib/trial/trial-manager';
import { logInfo, logError } from '@/lib/infrastructure/monitoring/logger';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      company_id,
      user_id,
      company_name,
      user_email,
      user_name,
    } = body;

    // Validate required fields
    if (!company_id || !user_id) {
      return NextResponse.json(
        { error: 'Missing required fields: company_id and user_id' },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Check if creator already exists
    const { data: existingCreator } = await supabase
      .from('creators')
      .select('id, trial_status')
      .eq('whop_company_id', company_id)
      .single();

    if (existingCreator) {
      logInfo('Creator already exists, skipping setup', {
        creator_id: existingCreator.id,
        company_id,
      });

      return NextResponse.json({
        success: true,
        message: 'Creator already exists',
        creator_id: existingCreator.id,
        trial_active: existingCreator.trial_status === 'active',
      });
    }

    // Create new creator
    const { data: newCreator, error: createError } = await supabase
      .from('creators')
      .insert({
        whop_company_id: company_id,
        whop_user_id: user_id,
        company_name: company_name || 'Untitled Creator',
        subscription_tier: 'basic', // Default tier
        settings: {
          user_email,
          user_name,
        },
      })
      .select('id')
      .single();

    if (createError || !newCreator) {
      throw new Error(`Failed to create creator: ${createError?.message}`);
    }

    const creatorId = newCreator.id;

    logInfo('New creator created', {
      creator_id: creatorId,
      company_id,
      user_id,
    });

    // Start 7-day trial
    await TrialManager.startTrial(creatorId);

    logInfo('Trial started for new creator', {
      creator_id: creatorId,
      trial_duration: '7 days',
    });

    // Provision demo content
    const demoProvisioned = await TrialManager.provisionDemoContent(creatorId);

    if (!demoProvisioned) {
      logError('Failed to provision demo content', {
        creator_id: creatorId,
      });
      // Don't fail the install, just log the error
    } else {
      logInfo('Demo content provisioned', {
        creator_id: creatorId,
      });
    }

    // Return success
    return NextResponse.json({
      success: true,
      message: 'App installed successfully! Your 7-day trial has started.',
      creator_id: creatorId,
      trial_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      demo_content_provisioned: demoProvisioned,
    });

  } catch (error) {
    logError('App install failed', { error });

    return NextResponse.json(
      {
        error: 'Failed to install app',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
