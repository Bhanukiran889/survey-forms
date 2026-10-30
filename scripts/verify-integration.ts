import './load-env';
// Opt-in integration verification. Only a newly generated disposable database is dropped.
import { MongoClient } from 'mongodb';
import { randomBytes } from 'node:crypto';
import { hashPassword } from '../lib/password';
import { spawn, type ChildProcess } from 'node:child_process';
import { questions, SURVEY_VERSION } from '../lib/survey-schema';
import assert from 'node:assert/strict';
import { EARLY_ACCESS_OFFER, OFFER_VERSION, POLICY_VERSION } from '../lib/privacy-schema';
let phase='setup';
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
 server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--hostname','127.0.0.1','--port',String(port)],{cwd:process.cwd(),env:{...process.env,NODE_ENV:'development',MONGODB_URI:uri,MONGODB_DB_NAME:testName,AUTH_SECRET:randomBytes(48).toString('base64url'),APP_URL:origin,NEXT_DIST_DIR:'.next-integration',NEXT_PUBLIC_TURNSTILE_SITE_KEY:'',TURNSTILE_SECRET_KEY:''},stdio:['ignore','pipe','pipe']});
 // Do not relay framework/driver logs, which may include hostnames or env paths.
 server.stdout?.resume();server.stderr?.resume();
 for(let i=0;i<120;i++){try{if((await fetch(origin)).ok)break;}catch{}if(i===119)throw new Error('Integration server did not start.');await new Promise(resolve=>setTimeout(resolve,500));}
 const call=(path:string,method='GET',body?:unknown,cookie='')=>fetch(`${origin}${path}`,{method,headers:{Origin:origin,...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},...(body?{body:JSON.stringify(body)}:{}),redirect:'manual'});
 assert.equal((await call('/api/admin/analytics')).status,401);
 assert.equal((await call('/admin/dashboard')).status,307);
 phase='privacy choice and consent-gated attribution';
 assert.equal((await call('/api/privacy/attribution','POST',{source:'blocked'})).status,403);
 assert.equal(await db.collection('campaign_attribution').countDocuments({}),0);
 const rejected=await call('/api/privacy/preferences','POST',{analytics:false,policyVersion:POLICY_VERSION});assert.equal(rejected.status,200);const privacyCookie=cookieOf(rejected,'recallmd_privacy');assert.ok(privacyCookie);
 assert.equal((await call('/api/privacy/attribution','POST',{source:'blocked'},privacyCookie)).status,403);
 assert.equal((await db.collection('privacy_preferences').findOne({}))?.analytics,false);
 const accepted=await call('/api/privacy/preferences','POST',{analytics:true,policyVersion:POLICY_VERSION,campaign:{source:'integration',medium:'test',campaign:'research-pilot'}},privacyCookie);assert.equal(accepted.status,200);
 assert.equal(await db.collection('campaign_attribution').countDocuments({}),1);
 phase='encrypted draft email and recovery';
 const payload={surveyVersion:SURVEY_VERSION,consent:true,termsAccepted:true,privacyAcknowledged:true,emailOptIn:true,email:'student@example.invalid',responses:Object.fromEntries(questions.filter(q=>q.required).map(q=>[q.id,{values:[q.options[0].value]}]))};
 const draft=await call('/api/survey/draft','POST',{...payload,currentSection:3});assert.equal(draft.status,200);const draftCookie=cookieOf(draft,'recallmd_draft');assert.ok(draftCookie);
 const recovered=await call('/api/survey/draft/current','GET',undefined,draftCookie);assert.equal(recovered.status,200);assert.equal((await recovered.json()).currentSection,3);
 const draftContact=await db.collection('survey_draft_contacts').findOne({});assert.ok(draftContact?.emailCiphertext);assert.ok(!JSON.stringify(draftContact).includes(payload.email));
 const saved=await db.collection('survey_drafts').findOne({});assert.equal(saved?.responses.q1.values[0],'q1_a1');assert.ok(saved?.expiresAt instanceof Date);
 phase='bot checks and browser-bound submission ticket';
 assert.equal((await call('/api/survey/submit','POST',payload,draftCookie)).status,422);
 const challengeResponse=await call('/api/survey/protection','POST',{},draftCookie);assert.equal(challengeResponse.status,200);const challenge=await challengeResponse.json();assert.equal(challenge.mode,'basic');
 const proof={ticket:challenge.ticket,website:''};
 assert.equal((await call('/api/survey/submit','POST',{...payload,protection:{...proof,website:'https://bot.invalid'}},draftCookie)).status,403);
 assert.equal(await db.collection('survey_responses').countDocuments({}),0);
 if(challenge.readyInMs>0){assert.equal((await call('/api/survey/submit','POST',{...payload,protection:proof},draftCookie)).status,429);await new Promise(resolve=>setTimeout(resolve,challenge.readyInMs+150));}
 const protectedPayload={...payload,protection:proof};
 phase='atomic submission and duplicate safety';
 const submission=await call('/api/survey/submit','POST',protectedPayload,`${draftCookie}; ${privacyCookie}`);assert.equal(submission.status,201);const receipt=await submission.json();
 const duplicate=await call('/api/survey/submit','POST',protectedPayload,`${draftCookie}; ${privacyCookie}`);assert.equal(duplicate.status,200);assert.equal((await duplicate.json()).receipt,receipt.receipt);assert.equal(await db.collection('survey_responses').countDocuments({}),1);
 assert.equal(await db.collection('early_access_contacts').countDocuments({}),1);assert.equal(await db.collection('consent_events').countDocuments({type:'survey_submission'}),1);assert.equal(await db.collection('survey_draft_contacts').countDocuments({}),0);
 const subscriptionContact=await db.collection('early_access_contacts').findOne({});assert.equal(subscriptionContact?.offerVersion,OFFER_VERSION);assert.equal(subscriptionContact?.offerTerms,EARLY_ACCESS_OFFER);assert.ok(subscriptionContact?.optedInAt instanceof Date);
 const recoveredReceipt=await call('/api/survey/draft/current','GET',undefined,draftCookie);assert.equal(recoveredReceipt.status,200);const privateDetails=await recoveredReceipt.json();assert.equal(privateDetails.receipt,receipt.receipt);assert.equal(privateDetails.withdrawalKey,receipt.withdrawalKey);
 const storedResponse=await db.collection('survey_responses').findOne({});assert.equal(storedResponse?.botProtection.method,'basic');assert.ok(storedResponse?.botProtection.verifiedAt instanceof Date);assert.ok(!JSON.stringify(storedResponse).includes(challenge.ticket));assert.equal(storedResponse?.policyVersion,POLICY_VERSION);assert.equal(storedResponse?.attribution.firstTouch.source,'integration');assert.ok(!JSON.stringify(storedResponse).includes(payload.email));
 phase='administrator access, contact review and exports';
 const login=await call('/api/admin/login','POST',{email:'integration@example.invalid',password});assert.equal(login.status,200);const adminCookie=cookieOf(login,'recallmd_admin');assert.ok(adminCookie);
 const analytics=await call('/api/admin/analytics','GET',undefined,adminCookie);assert.equal(analytics.status,200);const insight=await analytics.json();assert.equal(insight.total,1);assert.equal(insight.drafts,0);assert.equal(insight.completionRate,100);assert.ok(insight.charts.stages.length);assert.equal(insight.optIns,1);assert.equal(insight.charts.sources[0].name,'integration');
 const listing=await call('/api/admin/responses?page=1&limit=1','GET',undefined,adminCookie);assert.equal(listing.status,200);const list=await listing.json();assert.equal(list.total,1);assert.equal(list.rows.length,1);
 const detail=await call(`/api/admin/responses/${list.rows[0]._id}`,'GET',undefined,adminCookie);assert.equal(detail.status,200);const detailBody=await detail.json();assert.equal(detailBody.response.questionSnapshot.length,28);assert.equal(detailBody.response.withdrawalHash,undefined);
 const csv=await call('/api/admin/export?limit=1','GET',undefined,adminCookie);assert.equal(csv.status,200);const csvText=await csv.text();assert.ok(csvText.includes('Q28.'));assert.ok(!csvText.includes(payload.email));
 assert.equal((await call('/api/admin/contacts')).status,401);
 const contactList=await call('/api/admin/contacts','GET',undefined,adminCookie);assert.equal(contactList.status,200);const contactBody=await contactList.json();assert.equal(contactBody.rows[0].email,payload.email);assert.equal((await call(`/api/admin/contacts/${contactBody.rows[0].id}`,'PATCH',{status:'selected'},adminCookie)).status,200);
 phase='tracking revocation';
 assert.equal((await call('/api/privacy/preferences','POST',{analytics:false,policyVersion:POLICY_VERSION},privacyCookie)).status,200);assert.equal(await db.collection('campaign_attribution').countDocuments({}),0);assert.equal((await db.collection('survey_responses').findOne({}))?.attribution,undefined);
 phase='email-only withdrawal';
 assert.equal((await call('/api/survey/withdraw','POST',{receipt:receipt.receipt,key:receipt.withdrawalKey,action:'email'})).status,200);assert.equal(await db.collection('early_access_contacts').countDocuments({}),0);assert.equal(await db.collection('survey_responses').countDocuments({}),1);
 phase='logout and complete withdrawal';
 const logout=await call('/api/admin/logout','POST',{},adminCookie);assert.equal(logout.status,200);assert.equal((await call('/api/admin/session','GET',undefined,adminCookie)).status,401);
 const withdrawal=await call('/api/survey/withdraw','POST',{receipt:receipt.receipt,key:receipt.withdrawalKey});assert.equal(withdrawal.status,200);assert.equal(await db.collection('survey_responses').countDocuments({}),0);
 assert.equal(await db.collection('consent_events').countDocuments({receipt:receipt.receipt}),0);
 phase='required policy acknowledgements';
 const missing=await call('/api/survey/submit','POST',{...payload,termsAccepted:false},draftCookie);assert.equal(missing.status,422);
 phase='transaction rollback';
 const nextDraft=await call('/api/survey/draft','POST',{...payload,currentSection:6});assert.equal(nextDraft.status,200);const nextCookie=cookieOf(nextDraft,'recallmd_draft');assert.ok(nextCookie);
 await db.command({collMod:'consent_events',validator:{$jsonSchema:{required:['forcedFailureOnlyInDisposableIntegrationDatabase']}},validationLevel:'strict'});
 const nextProtectionResponse=await call('/api/survey/protection','POST',{},nextCookie);assert.equal(nextProtectionResponse.status,200);const nextProtection=await nextProtectionResponse.json();await new Promise(resolve=>setTimeout(resolve,nextProtection.readyInMs+150));
 const failed=await call('/api/survey/submit','POST',{...payload,protection:{ticket:nextProtection.ticket,website:''}},nextCookie);assert.equal(failed.status,500);assert.equal(await db.collection('survey_responses').countDocuments({}),0);assert.equal(await db.collection('early_access_contacts').countDocuments({}),0);assert.equal(await db.collection('survey_drafts').countDocuments({submittedAt:{$exists:true}}),0);
 await db.command({collMod:'consent_events',validator:{},validationLevel:'strict'});
 console.log('Bot protection verified: rejected missing proof, honeypot spam and instant submissions; persisted only the verification result.');
 console.log('Privacy integration verified: consent gating, encrypted email recovery, versioned acknowledgements, contact review, attribution removal, independent email withdrawal and real transaction rollback.');
 console.log('Integration verified: real Atlas draft recovery, submission/idempotency, admin login/logout, protected pages/APIs, analytics, listing/detail, CSV export, and withdrawal.');
}
async function cleanup(){
 server?.kill('SIGTERM');
 if(client){try{if(/^recallmd_test_[a-f0-9]{16}$/.test(testName)&&testName!==configuredName){await client.db(testName).dropDatabase();console.log('Disposable integration database removed. Configured application database was not modified.');}}finally{await client.close();}}
}
main().catch(()=>{console.error(`Integration verification failed at: ${phase}. Check Atlas access, permission to create a disposable recallmd_test_* database, and the local integration port. No secrets are logged.`);process.exitCode=1;}).finally(cleanup);
