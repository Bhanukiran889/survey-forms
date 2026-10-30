import './load-env';
import { z } from 'zod';
const checks={MONGODB_URI:z.string().regex(/^mongodb(?:\+srv)?:\/\//).safeParse(process.env.MONGODB_URI).success,MONGODB_DB_NAME:z.string().regex(/^[a-zA-Z0-9_-]+$/).safeParse(process.env.MONGODB_DB_NAME||'neetpg_research').success,AUTH_SECRET:z.string().min(32).safeParse(process.env.AUTH_SECRET).success,APP_URL:z.url().safeParse(process.env.APP_URL||'http://localhost:3000').success,RESPONSE_RETENTION_DAYS:z.coerce.number().int().min(1).max(3650).safeParse(process.env.RESPONSE_RETENTION_DAYS||365).success};
for(const[key,valid]of Object.entries(checks))console.log(`${key}: ${valid?'valid':'MISSING OR INVALID'}`);
if(process.env.NODE_ENV==='production'&&!process.env.APP_URL?.startsWith('https://')){console.error('Production APP_URL must use HTTPS.');process.exitCode=1;}
if(Object.values(checks).some(value=>!value))process.exitCode=1;
if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)console.log('Administrator provisioning requires a 16+ character ADMIN_PASSWORD. This does not block survey saving or an already provisioned account.');
console.log('No credentials or environment-file contents are printed.');
