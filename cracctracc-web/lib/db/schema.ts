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
  (t) => ({
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

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified')
    .$defaultFn(() => false)
    .notNull(),
  image: text('image'),
  phone: text('phone'),
  createdAt: timestamp('created_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
  updatedAt: timestamp('updated_at')
    .$defaultFn(() => /* @__PURE__ */ new Date())
    .notNull(),
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
  createdAt: timestamp('created_at').$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
  updatedAt: timestamp('updated_at').$defaultFn(
    () => /* @__PURE__ */ new Date()
  ),
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

/*
export const verificationRelations = relations(verification, ({ one }) => ({
  user: one(user, {
    fields: [verification.identifier],
    references: [user.id],
  }),
}));
*/
