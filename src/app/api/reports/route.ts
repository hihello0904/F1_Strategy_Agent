// ============================================================================
// GET /api/reports - List All Reports
// ============================================================================

import { NextResponse } from 'next/server';
import { listReports } from '@/lib/reports/fileOperations';

export async function GET() {
  try {
    const reports = await listReports();

    return NextResponse.json({
      success: true,
      reports,
      count: reports.length,
    });
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: `Failed to list reports: ${errorMessage}`,
      },
      { status: 500 }
    );
  }
}

