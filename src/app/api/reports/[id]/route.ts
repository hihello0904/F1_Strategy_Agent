// ============================================================================
// GET/DELETE /api/reports/[id] - Get or Delete Specific Report
// ============================================================================

import { NextRequest, NextResponse } from 'next/server';
import { getReportContent, deleteReport } from '@/lib/reports/fileOperations';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET - Retrieve report content
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get('format') as 'json' | 'txt' | 'csv') || 'json';

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Report ID is required' },
      { status: 400 }
    );
  }

  const result = await getReportContent(id, format);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 404 }
    );
  }

  // For file downloads, set appropriate headers
  if (format !== 'json') {
    const contentType = format === 'csv' ? 'text/csv' : 'text/plain';
    const filename = format === 'csv' ? `${id}-laps.csv` : `${id}.txt`;

    return new NextResponse(result.content, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  }

  // For JSON, parse and return
  try {
    const data = JSON.parse(result.content!);
    return NextResponse.json({ success: true, report: data });
  } catch {
    return NextResponse.json({ success: true, content: result.content });
  }
}

// DELETE - Delete report (requires confirmation header)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  if (!id) {
    return NextResponse.json(
      { success: false, error: 'Report ID is required' },
      { status: 400 }
    );
  }

  // Safety check - require confirmation header
  const confirmHeader = request.headers.get('X-Confirm-Delete');
  if (confirmHeader !== 'true') {
    return NextResponse.json(
      {
        success: false,
        error: 'Deletion requires confirmation. Set X-Confirm-Delete header to "true"',
        requiresConfirmation: true,
      },
      { status: 400 }
    );
  }

  const result = await deleteReport(id);

  if (!result.success) {
    return NextResponse.json(
      { success: false, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    message: `Report ${id} deleted successfully`,
  });
}

