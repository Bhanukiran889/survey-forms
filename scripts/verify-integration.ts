// Opt-in integration verification. Only a newly generated disposable database is dropped.
import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../lib/password';
import { spawn, type ChildProcess } from 'node:child_process';
import { questions, SURVEY_VERSION } from '../lib/survey-schema';
import assert from 'node:assert/strict';
const configuredName = process.env.MONGODB_DB_NAME || 'neetpg_research';
const testName = `recallmd_test_${randomBytes(8).toString('hex')}`;
const port = Number(process.env.INTEGRATION_PORT || 3101);
const origin = `http://localhost:${port}`;
const uri = process.env.MONGODB_TEST_URI || process.env.MONGODB_URI;
const password = randomBytes(24).toString('base64url');
let server: ChildProcess | undefined;
let client: MongoClient | undefined;
function cookieOf(response: Response, name: string) { return response.headers.getSetCookie().find(c => c.startsWith(`${name}=`))?.split(';')[0] ?? ''; }
async function main() {
 if (!uri || !/^recallmd_test_[a-f0-9]{16}$/.test(testName) || testName === configuredName) throw new Error('Integration isolation check failed.');
 client = new MongoClient(uri, { serverSelectionTimeoutMS: 5000, connectTimeoutMS: 5000 }); await client.connect();
 const db = client.db(testName); const passwordHash = await hashPassword(password); const now=new Date();
 await db.collection('admin_users').insertOne({email:'integration@example.invalid',passwordHash,role:'admin',active:true,createdAt:now,updatedAt:now});
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'development',MONGODB_URI:uri,MONGODB_DB_NAME:testName,AUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:origin,NEXT_DIST_DIR:'.next-integration'},stdio:['ignore','pipe','pipe']});
 // Do not relay framework/driver logs, which may include hostnames or env paths.
 server.stdout?.resume();server.stderr?.resume();
 for(let i=0;i<120;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===119)throw new Error('Integration server did not start.');await new Promise(resolve=>setTimeout(resolve,500));}
 const call=(path:string,method='GET',body?:unknown,cookie='')=>fetch(`${origin}${path}`,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual'});
 assert.equal((await call('/api/admin/analytics')).status,401);
 assert.equal((await call('/admin/dashboard')).status,307);
 const payload={surveyVersion:SURVEY_VERSION,consent:false,responses:Object.fromEntries(questions.filter(q=>q.required).map(q=>[q.id,{values:[q.options[0].value]}]))};
 const draft=await call('/api/survey/draft','POST',{...payload,currentSection:3});assert.equal(draft.status,200);const draftCookie=cookieOf(draft,'recallmd_draft');assert.ok(draftCookie);
 const recovered=await call('/api/survey/draft/current','GET',undefined,draftCookie);assert.equal(recovered.status,200);assert.equal((await recovered.json()).currentSection,3);
 const saved=await db.collection('survey_drafts').findOne({});assert.equal(saved?.responses.q1.values[0],'q1_a1');assert.ok(saved?.expiresAt instanceof Date);
 const submission=await call('/api/survey/submit','POST',payload,draftCookie);assert.equal(submission.status,201);const receipt=await submission.json();
 const duplicate=await call('/api/survey/submit','POST',payload,draftCookie);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).receipt,receipt.receipt);assert.equal(await db.collection('survey_responses').countDocuments({}),1);
 const login=await call('/api/admin/login','POST',{email:'integration@example.invalid',password});assert.equal(login.status,200);const adminCookie=cookieOf(login,'recallmd_admin');assert.ok(adminCookie);
 const analytics=await call('/api/admin/analytics','GET',undefined,adminCookie);assert.equal(analytics.status,200);const insight=await analytics.json();assert.equal(insight.total,1);assert.equal(insight.drafts,0);assert.equal(insight.completionRate,100);assert.ok(insight.charts.stages.length);
 const listing=await call('/api/admin/responses?page=1&limit=1','GET',undefined,adminCookie);assert.equal(listing.status,200);const list=await listing.json();assert.equal(list.total,1);assert.equal(list.rows.length,1);
 const detail=await call(`/api/admin/responses/${list.rows[0]._id}`,'GET',undefined,adminCookie);assert.equal(detail.status,200);const detailBody=await detail.json();assert.equal(detailBody.response.questionSnapshot.length,28);assert.equal(detailBody.response.withdrawalHash,undefined);
 const csv=await call('/api/admin/export?limit=1','GET',undefined,adminCookie);assert.equal(csv.status,200);assert.ok((await csv.text()).includes('Q28.'));
 const logout=await call('/api/admin/logout','POST',{},adminCookie);assert.equal(logout.status,200);assert.equal((await call('/api/admin/session','GET',undefined,adminCookie)).status,401);
 const withdrawal=await call('/api/survey/withdraw','POST',{receipt:receipt.receipt,key:receipt.withdrawalKey});assert.equal(withdrawal.status,200);assert.equal(await db.collection('survey_responses').countDocuments({}),0);
 console.log('Integration verified: real Atlas draft recovery, submission/idempotency, admin login/logout, protected pages/APIs, analytics, listing/detail, CSV export, and withdrawal.');
}
async function cleanup(){
 server?.kill('SIGTERM');
 if(client){try{if(/^recallmd_test_[a-f0-9]{16}$/.test(testName)&&testName!==configuredName){await client.db(testName).dropDatabase();console.log('Disposable integration database removed. Configured application database was not modified.');}}finally{await client.close();}}
}
main().catch(()=>{console.error('Integration verification failed. Check Atlas access, permission to create a disposable recallmd_test_* database, and the local integration port. No secrets are logged.');process.exitCode=1;}).finally(cleanup);
