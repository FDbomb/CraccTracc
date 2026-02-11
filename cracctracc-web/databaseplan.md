# Database Integration Plan for CraccTracc

This document outlines the detailed plan for integrating database persistence into the CraccTracc application. This plan is designed to be AI agent-friendly, providing explicit instructions for implementation.

## 1. Overall Goal & Revised Workflow

The primary objective is to automatically save every sailing analysis to the database, enabling users to access their past sessions and share them with others. This transforms the application from a transient tool into a persistent sailing logbook.

The revised workflow integrates file hashing and duplicate checking directly into the existing `/api/upload` route for a more streamlined and efficient process.

**Revised Upload Workflow:**

1.  **User Uploads File:** The user uploads a `.gpx` or `.vkx` file via the frontend.
2.  **Server Receives File:** The `app/api/upload/route.ts` endpoint receives the file.
3.  **Server-Side Hashing:** The server calculates the SHA-256 hash of the file's content.
4.  **Database Lookup:** The server queries the `analyses` table using the calculated `file_hash` to check for an existing analysis.
5.  **Conditional Logic:**
    *   **If Hash Exists (Duplicate File):**
        *   The server retrieves the `analysisId` of the existing record.
        *   It then creates a new entry in the `user_analyses` join table, linking the current `userId` to the existing `analysisId`. This grants the user access to the pre-existing analysis.
        *   The complete, existing `SailingAnalysis` data is fetched from the database and returned to the client.
    *   **If Hash is New (New File):**
        *   The server proceeds with the full parsing and analysis pipeline (as currently implemented).
        *   Once the `SailingAnalysis` object is generated, it is saved to the database:
            *   A new record is created in the `analyses` table.
            *   All associated detailed data (track points, manoeuvres) are created in their respective tables, linked by `analysisId`.
            *   A new record is created in the `user_analyses` table, linking the current user to this newly created analysis.
        *   The newly generated `SailingAnalysis` is returned to the client.

This approach provides a seamless experience for the user, as the system intelligently handles new and duplicate file uploads.

## 2. Database Schema

The following Drizzle ORM schema has been designed and already migrated to the database. It supports the storage of analysis data and the many-to-many relationship for collaborative access.

**File: `lib/db/schema.ts`**

```typescript
import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  primaryKey,
} from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Existing Auth Tables (from better-auth) - DO NOT MODIFY OR REMOVE
export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').default(false).notNull(),
  image: text('image'),
  phone: text('phone'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
});

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at').notNull(),
  updatedAt: timestamp('updated_at').notNull(),
});

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

// New Analysis Tables
export const analyses = pgTable('analyses', {
  id: text('id').primaryKey(),
  fileHash: text('file_hash').notNull().unique(),
  fileName: text('file_name').notNull(),
  startTime: timestamp('start_time').notNull(),
  endTime: timestamp('end_time').notNull(),
  totalDistance: real('total_distance').notNull(),
  maxSpeed: real('max_speed').notNull(),
  averageSpeed: real('average_speed').notNull(),
  tackCount: integer('tack_count').notNull(),
  gybeCount: integer('gybe_count').notNull(),
  averageTwa: real('average_twa').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const userAnalyses = pgTable(
  'user_analyses',
  {
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    analysisId: text('analysis_id')
      .notNull()
      .references(() => analyses.id, { onDelete: 'cascade' }),
  },
  t => ({
    pk: primaryKey(t.userId, t.analysisId),
  })
);

export const trackPoints = pgTable('track_points', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  utc: timestamp('utc').notNull(),
  lat: real('lat').notNull(),
  lon: real('lon').notNull(),
  sog: real('sog'),
  cog: real('cog'),
  hdg: real('hdg'),
  twa: real('twa'),
  tws: real('tws'),
  twd: real('twd'),
  roll: real('roll'),
  pitch: real('pitch'),
});

export const manoeuvres = pgTable('manoeuvres', {
  id: text('id').primaryKey(),
  analysisId: text('analysis_id')
    .notNull()
    .references(() => analyses.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  timestamp: timestamp('timestamp').notNull(),
  duration: real('duration'),
  startTwa: real('start_twa'),
  endTwa: real('end_twa'),
});

// RELATIONS
export const userRelations = relations(user, ({ many }) => ({
  sessions: many(session),
  accounts: many(account),
  userAnalyses: many(userAnalyses),
}));

export const analysesRelations = relations(analyses, ({ many }) => ({
  userAnalyses: many(userAnalyses),
  trackPoints: many(trackPoints),
  manoeuvres: many(manoeuvres),
}));

export const userAnalysesRelations = relations(userAnalyses, ({ one }) => ({
  user: one(user, {
    fields: [userAnalyses.userId],
    references: [user.id],
  }),
  analysis: one(analyses, {
    fields: [userAnalyses.analysisId],
    references: [analyses.id],
  }),
}));

export const sessionRelations = relations(session, ({ one }) => ({
  user: one(user, {
    fields: [session.userId],
    references: [user.id],
  }),
}));

export const accountRelations = relations(account, ({ one }) => ({
  user: one(user, {
    fields: [account.userId],
    references: [user.id],
  }),
}));

export const verificationRelations = relations(verification, ({ one }) => ({
  user: one(user, {
    fields: [verification.identifier],
    references: [user.id],
  }),
}));
```

## 3. Implementation Steps (AI Agent Friendly)

The following steps detail the implementation process. Each step includes the target file, purpose, and the exact code to be added or modified.

### Step 3.1: Create Database Query Service

**Purpose:** To encapsulate all database interaction logic for analyses, keeping the API route clean and focused on request handling.

**File:** `lib/db/queries.ts`

**Action:** Create this new file with the following content.

```typescript
// lib/db/queries.ts
import { db } from './index';
import { analyses, trackPoints, manoeuvres, userAnalyses } from './schema';
import { eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { SailingAnalysis } from '../types/sailing'; // Assuming this type exists

/**
 * Finds an analysis by its file hash.
 * @param fileHash The SHA-256 hash of the file.
 * @returns The analysis record if found, otherwise null.
 */
export async function findAnalysisByHash(fileHash: string) {
  return db.query.analyses.findFirst({
    where: eq(analyses.fileHash, fileHash),
  });
}

/**
 * Creates a new analysis record and its associated track points and manoeuvres.
 * @param analysisData The complete SailingAnalysis object.
 * @param fileHash The SHA-256 hash of the file.
 * @param fileName The original name of the file.
 * @returns The ID of the newly created analysis.
 */
export async function createAnalysis(analysisData: SailingAnalysis, fileHash: string, fileName: string) {
  const analysisId = uuidv4();

  // Save analysis summary
  await db.insert(analyses).values({
    id: analysisId,
    fileHash: fileHash,
    fileName: fileName,
    startTime: new Date(analysisData.metadata.startTime),
    endTime: new Date(analysisData.metadata.endTime),
    totalDistance: analysisData.summary.totalDistance,
    maxSpeed: analysisData.summary.maxSpeed,
    averageSpeed: analysisData.summary.averageSpeed,
    tackCount: analysisData.summary.tackCount,
    gybeCount: analysisData.summary.gybeCount,
    averageTwa: analysisData.summary.averageTwa,
    createdAt: new Date(),
  });

  // Save track points
  const trackPointValues = analysisData.trackPoints.map(tp => ({
    id: uuidv4(),
    analysisId: analysisId,
    utc: new Date(tp.utc),
    lat: tp.lat,
    lon: tp.lon,
    sog: tp.sog,
    cog: tp.cog,
    hdg: tp.hdg,
    twa: tp.twa,
    tws: tp.tws,
    twd: tp.twd,
    roll: tp.roll,
    pitch: tp.pitch,
  }));
  if (trackPointValues.length > 0) {
    await db.insert(trackPoints).values(trackPointValues);
  }

  // Save manoeuvres
  const manoeuvreValues = analysisData.manoeuvres.map(m => ({
    id: uuidv4(),
    analysisId: analysisId,
    type: m.type,
    timestamp: new Date(m.timestamp),
    duration: m.duration,
    startTwa: m.startTwa,
    endTwa: m.endTwa,
  }));
  if (manoeuvreValues.length > 0) {
    await db.insert(manoeuvres).values(manoeuvreValues);
  }

  return analysisId;
}

/**
 * Links a user to an analysis in the user_analyses join table.
 * Prevents duplicate links.
 * @param userId The ID of the user.
 * @param analysisId The ID of the analysis.
 */
export async function linkUserToAnalysis(userId: string, analysisId: string) {
  // Check if the link already exists
  const existingLink = await db.query.userAnalyses.findFirst({
    where: (userAnalyses, { and, eq }) => and(
      eq(userAnalyses.userId, userId),
      eq(userAnalyses.analysisId, analysisId)
    ),
  });

  if (!existingLink) {
    await db.insert(userAnalyses).values({
      userId: userId,
      analysisId: analysisId,
    });
  }
}

/**
 * Retrieves a complete SailingAnalysis object from the database by its ID.
 * @param analysisId The ID of the analysis to retrieve.
 * @returns The reconstructed SailingAnalysis object, or null if not found.
 */
export async function getAnalysisById(analysisId: string): Promise<SailingAnalysis | null> {
  const analysisSummary = await db.query.analyses.findFirst({
    where: eq(analyses.id, analysisId),
  });

  if (!analysisSummary) {
    return null;
  }

  const trackPointsData = await db.query.trackPoints.findMany({
    where: eq(trackPoints.analysisId, analysisId),
    orderBy: (tp, { asc }) => [asc(tp.utc)],
  });

  const manoeuvresData = await db.query.manoeuvres.findMany({
    where: eq(manoeuvres.analysisId, analysisId),
    orderBy: (m, { asc }) => [asc(m.timestamp)],
  });

  // Reconstruct SailingAnalysis object
  return {
    trackPoints: trackPointsData.map(tp => ({
      utc: tp.utc.getTime(),
      lat: tp.lat,
      lon: tp.lon,
      sog: tp.sog || 0,
      cog: tp.cog || 0,
      hdg: tp.hdg || 0,
      twa: tp.twa || 0,
      tws: tp.tws || 0,
      twd: tp.twd || 0,
      roll: tp.roll || 0,
      pitch: tp.pitch || 0,
    })),
    manoeuvres: manoeuvresData.map(m => ({
      id: m.id,
      type: m.type as any, // Type assertion needed due to Drizzle's generic type for enums
      timestamp: m.timestamp.getTime(),
      duration: m.duration || 0,
      startTwa: m.startTwa || 0,
      endTwa: m.endTwa || 0,
    })),
    summary: {
      totalDistance: analysisSummary.totalDistance,
      totalTime: (analysisSummary.endTime.getTime() - analysisSummary.startTime.getTime()) / (1000 * 60), // minutes
      averageSpeed: analysisSummary.averageSpeed,
      maxSpeed: analysisSummary.maxSpeed,
      tackCount: analysisSummary.tackCount,
      gybeCount: analysisSummary.gybeCount,
      averageTwa: analysisSummary.averageTwa,
    },
    metadata: {
      filename: analysisSummary.fileName,
      fileType: 'gpx', // Assuming gpx for now, can be stored in db later if needed
      fileSize: 0, // Not stored in db currently
      trackPointCount: trackPointsData.length,
      startTime: analysisSummary.startTime.getTime(),
      endTime: analysisSummary.endTime.getTime(),
    },
  };
}
```

### Step 3.2: Modify Upload API Endpoint

**Purpose:** To implement the server-side hashing, duplicate analysis check, and the logic for saving new analyses or linking users to existing ones.

**File:** `app/api/upload/route.ts`

**Action:** Replace the entire content of this file with the following code.

```typescript
// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { FileParser } from '../../../lib/parsers';
import { DataProcessor } from '../../../lib/utils/dataProcessing';
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import { createHash } from 'crypto'; // For server-side hashing
import { findAnalysisByHash, createAnalysis, linkUserToAnalysis, getAnalysisById } from '@/lib/db/queries'; // New DB queries
import { SailingAnalysis } from '@/lib/types/sailing'; // Import SailingAnalysis type

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session || !session.user?.id) { // Ensure user ID is available
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  }

  const userId = session.user.id;

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // Read file content for hashing
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const fileHash = createHash('sha256').update(fileBuffer).digest('hex');

    // 1. Check if analysis already exists in DB
    const existingAnalysis = await findAnalysisByHash(fileHash);

    if (existingAnalysis) {
      // If exists, link user to existing analysis and return it
      await linkUserToAnalysis(userId, existingAnalysis.id);
      const fullAnalysis = await getAnalysisById(existingAnalysis.id);
      if (fullAnalysis) {
        return NextResponse.json(fullAnalysis);
      } else {
        // This case should ideally not happen if existingAnalysis was found
        return NextResponse.json({ error: 'Failed to retrieve existing analysis' }, { status: 500 });
      }
    }

    // If not existing, proceed with parsing and analysis
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

    if (!parseResult.success || !parseResult.data) {
      return NextResponse.json(
        { error: parseResult.error?.message || 'Failed to parse file' },
        { status: 400 }
      );
    }

    // Process the track data
    const analysis: SailingAnalysis = await DataProcessor.processTrackData(
      parseResult.data.trackPoints,
      parseResult.data.metadata,
      {
        windOptions: {
          useWeatherAPI: true, // Always use weather API for new analyses
        },
      }
    );

    // 2. Save new analysis to DB and link user
    const newAnalysisId = await createAnalysis(analysis, fileHash, file.name);
    await linkUserToAnalysis(userId, newAnalysisId);

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
```

### Step 3.3: Frontend Integration (High-Level)

**Purpose:** To acknowledge that the frontend will need to be updated to reflect the new backend behavior.

**Action:** This step is for awareness and will not involve code changes in this session.

*   The `FileUpload` component (likely `components/upload/FileUpload.tsx`) will continue to send the file to `/api/upload`.
*   The response from `/api/upload` will now always be a complete `SailingAnalysis` object, whether it was newly generated or retrieved from the database.
*   Future work will involve creating a "Past Sessions" view (e.g., in `app/dashboard/page.tsx`) that queries the database to list analyses linked to the user and allows them to view previously uploaded data.

