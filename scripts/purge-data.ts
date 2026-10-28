import { MongoClient } from 'mongodb';
async function main() {
 const args = process.argv.slice(2); const receipt = args.find(a => a.startsWith('--receipt='))?.slice('--receipt='.length);
 if (!args.includes('--confirm-delete')) throw new Error('Pass --confirm-delete to delete expired records, or --receipt=<reference> --confirm-delete for one withdrawal.');
 if (receipt && !/^[0-9a-f-]{36}$/.test(receipt)) throw new Error('Invalid response reference.');
 if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI is required.');
 const client = new MongoClient(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 5000 });
 try {
  await client.connect(); const db = client.db(process.env.MONGODB_DB_NAME || 'neetpg_research');
  if (receipt) {
   const deleted = await db.collection('survey_responses').findOneAndDelete({ receipt });
   if (deleted) await db.collection('survey_drafts').deleteOne({ anonymousSessionId: deleted.submissionToken });
   console.log(deleted ? 'Response and associated draft deleted. Apply this deletion to managed exports and backups according to your retention policy.' : 'No response found.');
  } else {
   const results = await Promise.all(['survey_responses', 'survey_drafts', 'admin_sessions', 'rate_limits'].map(name => db.collection(name).deleteMany({ expiresAt: { $lte: new Date() } })));
   console.log(`Deleted ${results.reduce((n,r) => n+r.deletedCount,0)} expired records.`);
  }
 } finally { await client.close(); }
}
main().catch(error => { console.error(error instanceof Error && !error.name.startsWith('Mongo') ? error.message : 'Data deletion failed. Check database configuration.'); process.exitCode = 1; });
