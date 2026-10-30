import './load-env';
import { MongoClient } from 'mongodb';
async function main() {
 if (!process.env.MONGODB_URI?.match(/^mongodb(?:\+srv)?:\/\//)) throw new Error('Missing URI');
 const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 });
 try { await client.connect(); await client.db(process.env.MONGODB_DB_NAME || 'neetpg_research').command({ ping: 1 }); console.log('MongoDB connection verified. Database credentials are not printed.'); } finally { await client.close(); }
}
main().catch(() => { console.error('Database check failed. Check the URI, database user, cluster status, DNS, and Atlas network allowlist.'); process.exitCode = 1; });
