/**
 * Debug endpoint to check what headers Whop is sending
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const allHeaders: Record<string, string> = {};

  req.headers.forEach((value, key) => {
    allHeaders[key] = value;
  });

  return NextResponse.json({
    whopHeaders: {
      'x-whop-user-id': req.headers.get('x-whop-user-id'),
      'x-whop-membership-id': req.headers.get('x-whop-membership-id'),
      'x-whop-company-id': req.headers.get('x-whop-company-id'),
    },
    allHeaders,
    url: req.url,
    host: req.headers.get('host'),
    referer: req.headers.get('referer'),
  }, {
    headers: {
      'Access-Control-Allow-Origin': '*',
    }
  });
}
