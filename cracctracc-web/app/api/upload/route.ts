import { NextRequest, NextResponse } from 'next/server';
import { FileParser } from '../../../lib/parsers';
import { DataProcessor } from '../../../lib/utils/dataProcessing';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Create parser instance
    const parser = new FileParser();

    // Validate file type
    if (!parser.validateFileType(file)) {
      const supportedFormats = parser.getSupportedFormats();
      return NextResponse.json(
        {
          error: `Unsupported file type. Please use: ${supportedFormats.map((f) => `.${f}`).join(', ')}`,
        },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > parser.getMaxFileSize()) {
      return NextResponse.json(
        { error: 'File size too large. Maximum size is 50MB.' },
        { status: 400 }
      );
    }

    // Parse the file
    const parseResult = await parser.parseFile(file);

    if (!parseResult.success) {
      return NextResponse.json(
        { error: parseResult.error?.message || 'Failed to parse file' },
        { status: 400 }
      );
    }

    // Process the track data
    if (!parseResult.data) {
      return NextResponse.json(
        { error: 'No data found in parsed file' },
        { status: 400 }
      );
    }

    const analysis = await DataProcessor.processTrackData(
      parseResult.data.trackPoints,
      parseResult.data.metadata,
      {
        windOptions: {
          useWeatherAPI: true,
        },
      }
    );

    return NextResponse.json(analysis);
  } catch (error) {
    console.error('Upload processing error:', error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Processing failed: ${error.message}`
            : 'Unknown processing error occurred',
      },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
