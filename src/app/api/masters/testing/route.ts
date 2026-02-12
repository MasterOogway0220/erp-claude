/**
 * Testing Master API
 * GET /api/masters/testing - Fetch all testing types
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const tests = await prisma.testingMaster.findMany({
      orderBy: { testName: 'asc' },
    });

    return NextResponse.json({
      success: true,
      tests,
      testingMasters: tests, // Support both field names
      count: tests.length,
    });
  } catch (error) {
    console.error('Error fetching testing masters:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch testing masters',
      },
      { status: 500 }
    );
  }
}
