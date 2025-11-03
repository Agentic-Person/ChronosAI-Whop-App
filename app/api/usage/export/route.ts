/**
 * Usage Export API Endpoint
 *
 * Exports usage data in JSON or CSV format for external analysis.
 */

import { NextRequest, NextResponse } from 'next/server';
import { exportUsageData } from '@/lib/usage';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await request.json();
    const {
      user_id = user.id,
      creator_id,
      start_date,
      end_date,
      format = 'json',
    } = body;

    // Validate user can only export their own data
    if (user_id !== user.id) {
      // TODO: Add admin check
      return NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      );
    }

    // Validate format
    if (format !== 'json' && format !== 'csv') {
      return NextResponse.json(
        { success: false, error: 'Invalid format. Must be "json" or "csv"' },
        { status: 400 }
      );
    }

    // Parse dates if provided
    const startDate = start_date ? new Date(start_date) : undefined;
    const endDate = end_date ? new Date(end_date) : undefined;

    // Export usage data
    const exportedData = await exportUsageData(
      user_id,
      creator_id,
      startDate,
      endDate,
      format as 'json' | 'csv'
    );

    // Return CSV as text/csv or JSON as application/json
    if (format === 'csv') {
      return new NextResponse(exportedData as string, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="usage-export-${new Date().toISOString().split('T')[0]}.csv"`,
        },
      });
    } else {
      return NextResponse.json({
        success: true,
        data: exportedData,
      });
    }
  } catch (error) {
    console.error('Usage export API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to export usage data',
      },
      { status: 500 }
    );
  }
}
