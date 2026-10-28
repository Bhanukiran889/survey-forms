import 'server-only';
import { MongoClient, type Db } from 'mongodb';
import { databaseEnv, responseRetentionDays } from './env';

declare global { var recallMongo: Promise<MongoClient> | undefined; var recallIndexes: Promise<void> | undefined; }
export class DatabaseUnavailable extends Error { constructor() { super('The research database is currently unavailable. Please try again shortly.'); this.name = 'DatabaseUnavailable'; } }
export async function connectDatabase(): Promise<Db> {
  const env = databaseEnv();
  if (!global.recallMongo) {
    const client = new MongoClient(env.MONGODB_URI, { maxPoolSize: 10, minPoolSize: 0, serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000, socketTimeoutMS: 10000, maxIdleTimeMS: 60000 });
    global.recallMongo = client.connect().catch(() => { global.recallMongo = undefined; global.recallIndexes = undefined; throw new DatabaseUnavailable(); });
  }
  try { return (await global.recallMongo).db(env.MONGODB_DB_NAME); } catch { throw new DatabaseUnavailable(); }
}
export async function ensureIndexes(db: Db) {
  responseRetentionDays();
  await Promise.all([
    db.collection('survey_responses').createIndexes([
      { key: { submissionToken: 1 }, unique: true }, { key: { receipt: 1 }, unique: true },
      { key: { submittedAt: -1, _id: -1 } }, { key: { preparationStage: 1, submittedAt: -1 } }, { key: { surveyVersion: 1, submittedAt: -1 } },
      { key: { expiresAt: 1 }, expireAfterSeconds: 0 },
    ]),
    db.collection('survey_drafts').createIndexes([{ key: { anonymousSessionId: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }, { key: { submittedAt: 1, expiresAt: 1 } }]),
    db.collection('admin_users').createIndex({ email: 1 }, { unique: true }),
    db.collection('admin_sessions').createIndexes([{ key: { tokenHash: 1 }, unique: true }, { key: { expiresAt: 1 }, expireAfterSeconds: 0 }]),
    db.collection('rate_limits').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
  ]);
}
export async function getDb() {
  const db = await connectDatabase();
  if (!global.recallIndexes) global.recallIndexes = ensureIndexes(db).catch(() => { global.recallIndexes = undefined; throw new DatabaseUnavailable(); });
  await global.recallIndexes;
  return db;
}
