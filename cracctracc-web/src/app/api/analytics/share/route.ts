import { NextRequest, NextResponse } from 'next/server';
import { SailingAnalysis } from '../../../../lib/types/sailing';
import { createHash } from 'crypto';

interface ShareRequest {
  data: SailingAnalysis;
  options?: {
    expiresIn?: number; // hours
    password?: string;
    publicSummaryOnly?: boolean;
  };
}

interface ShareRecord {
  id: string;
  data: SailingAnalysis | Partial<SailingAnalysis>;
  createdAt: number;
  expiresAt?: number;
  passwordHash?: string;
  viewCount: number;
  lastViewed?: number;
}

// In-memory storage (in production, use database)
const shareStorage = new Map<string, ShareRecord>();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as ShareRequest;
    const { data, options = {} } = body;

    if (!data || !data.trackPoints) {
      return NextResponse.json(
        { error: 'No analysis data provided' },
        { status: 400 }
      );
    }

    // Generate unique share ID
    const shareId = generateShareId(data);
    
    // Prepare data for sharing
    const shareData = options.publicSummaryOnly 
      ? createPublicSummary(data)
      : data;

    // Calculate expiration
    const expiresAt = options.expiresIn 
      ? Date.now() + (options.expiresIn * 60 * 60 * 1000)
      : undefined;

    // Hash password if provided
    const passwordHash = options.password 
      ? createHash('sha256').update(options.password).digest('hex')
      : undefined;

    // Store share record
    const shareRecord: ShareRecord = {
      id: shareId,
      data: shareData,
      createdAt: Date.now(),
      expiresAt,
      passwordHash,
      viewCount: 0
    };

    shareStorage.set(shareId, shareRecord);

    // Return share information
    return NextResponse.json({
      shareId,
      shareUrl: `${getBaseUrl(request)}/share/${shareId}`,
      expiresAt,
      hasPassword: !!options.password,
      publicSummaryOnly: !!options.publicSummaryOnly
    });

  } catch (error) {
    console.error('Share creation error:', error);
    return NextResponse.json(
      { error: 'Failed to create share link' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');
  const password = searchParams.get('password');

  if (!shareId) {
    return NextResponse.json(
      { error: 'Share ID required' },
      { status: 400 }
    );
  }

  const shareRecord = shareStorage.get(shareId);

  if (!shareRecord) {
    return NextResponse.json(
      { error: 'Share not found' },
      { status: 404 }
    );
  }

  // Check expiration
  if (shareRecord.expiresAt && Date.now() > shareRecord.expiresAt) {
    shareStorage.delete(shareId);
    return NextResponse.json(
      { error: 'Share has expired' },
      { status: 410 }
    );
  }

  // Check password if required
  if (shareRecord.passwordHash) {
    if (!password) {
      return NextResponse.json(
        { error: 'Password required' },
        { status: 401 }
      );
    }

    const providedHash = createHash('sha256').update(password).digest('hex');
    if (providedHash !== shareRecord.passwordHash) {
      return NextResponse.json(
        { error: 'Invalid password' },
        { status: 401 }
      );
    }
  }

  // Update view statistics
  shareRecord.viewCount++;
  shareRecord.lastViewed = Date.now();

  return NextResponse.json({
    data: shareRecord.data,
    metadata: {
      shareId,
      createdAt: shareRecord.createdAt,
      viewCount: shareRecord.viewCount,
      lastViewed: shareRecord.lastViewed
    }
  });
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const shareId = searchParams.get('id');

  if (!shareId) {
    return NextResponse.json(
      { error: 'Share ID required' },
      { status: 400 }
    );
  }

  const deleted = shareStorage.delete(shareId);

  if (!deleted) {
    return NextResponse.json(
      { error: 'Share not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({
    message: 'Share deleted successfully'
  });
}

function generateShareId(data: SailingAnalysis): string {
  const hash = createHash('md5');
  hash.update(JSON.stringify({
    trackPointCount: data.trackPoints.length,
    startTime: data.trackPoints[0]?.utc,
    endTime: data.trackPoints[data.trackPoints.length - 1]?.utc,
    totalDistance: data.summary.totalDistance,
    timestamp: Date.now()
  }));
  return hash.digest('hex').substring(0, 12);
}

function createPublicSummary(data: SailingAnalysis): Partial<SailingAnalysis> {
  return {
    summary: data.summary,
    metadata: {
      ...data.metadata,
      filename: 'Shared Analysis', // Remove original filename for privacy
    },
    manoeuvres: data.manoeuvres.map(m => ({
      ...m,
      id: '' // Remove internal IDs
    }))
    // Exclude detailed track points for privacy
  };
}

function getBaseUrl(request: NextRequest): string {
  const { protocol, host } = new URL(request.url);
  return `${protocol}//${host}`;
}

// Cleanup expired shares (call periodically)
export function cleanupExpiredShares(): void {
  const now = Date.now();
  for (const [id, record] of shareStorage.entries()) {
    if (record.expiresAt && now > record.expiresAt) {
      shareStorage.delete(id);
    }
  }
}