import { MongoClient } from 'mongodb';
import { hashPassword } from '../lib/password';
import { z } from 'zod';
const schema = z.object({ MONGODB_URI: z.string().regex(/^mongodb(?:\+srv)?:\/\//), MONGODB_DB_NAME: z.string().regex(/^[a-zA-Z0-9_-]+$/).default('neetpg_research'), ADMIN_EMAIL: z.email().transform(v => v.toLowerCase()), ADMIN_PASSWORD: z.string().min(16).max(256), AUTH_SECRET: z.string().min(32) });
async function main() {
 const result = schema.safeParse(process.env);
 if (!result.success) throw new Error('Set a valid MONGODB_URI, ADMIN_EMAIL, ADMIN_PASSWORD (16+ characters), and AUTH_SECRET (32+ characters).');
 const env = result.data; const client = new MongoClient(env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
 try {
  await client.connect(); const collection = client.db(env.MONGODB_DB_NAME).collection('admin_users');
  await collection.createIndex({ email: 1 }, { unique: true });
  if (await collection.findOne({ email: env.ADMIN_EMAIL })) { console.log('Administrator already exists. No credentials were changed.'); return; }
  const passwordHash = await hashPassword(env.ADMIN_PASSWORD); const now = new Date();
  await collection.insertOne({ email: env.ADMIN_EMAIL, passwordHash, role: 'admin', active: true, createdAt: now, updatedAt: now });
  console.log('Administrator created. Remove ADMIN_PASSWORD from .env.local after provisioning.');
 } finally { await client.close(); }
}
main().catch(() => { console.error('Administrator provisioning failed. Check environment variables, Atlas credentials, network access, and whether another provisioning process already created the account. No secrets are logged.'); process.exitCode = 1; });
