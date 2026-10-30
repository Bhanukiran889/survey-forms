import './load-env';
import { z } from 'zod';
const siteKey=process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim(),secretKey=process.env.TURNSTILE_SECRET_KEY?.trim();
const botKeysValid=!!siteKey&&!!secretKey&&/^[a-zA-Z0-9_-]{10,256}$/.test(siteKey)&&/^[a-zA-Z0-9_-]{10,256}$/.test(secretKey);
const testBotKeys=!!siteKey&&!!secretKey&&(/^[123]x0{10}/.test(siteKey)||/^[123]x0{10}/.test(secretKey));
if(!siteKey&&!secretKey)console.log('Bot protection: built-in spam checks active; configure both Turnstile keys for stronger verification.');
else if(!botKeysValid||(process.env.NODE_ENV==='production'&&testBotKeys)){console.log('Bot protection: INVALID CONFIGURATION. Provide both keys; test keys are forbidden in production.');process.exitCode=1;}
else console.log('Bot protection: enhanced verification configured.');
const checks={MONGODB_URI:z.string().regex(/^mongodb(?:\+srv)?:\/\//).safeParse(process.env.MONGODB_URI).success,MONGODB_DB_NAME:z.string().regex(/^[a-zA-Z0-9_-]+$/).safeParse(process.env.MONGODB_DB_NAME||'neetpg_research').success,AUTH_SECRET:z.string().min(32).safeParse(process.env.AUTH_SECRET).success,APP_URL:z.url().safeParse(process.env.APP_URL||'http://localhost:3000').success,RESPONSE_RETENTION_DAYS:z.coerce.number().int().min(1).max(3650).safeParse(process.env.RESPONSE_RETENTION_DAYS||365).success};
for(const[key,valid]of Object.entries(checks))console.log(`${key}: ${valid?'valid':'MISSING OR INVALID'}`);
if(process.env.NODE_ENV==='production'&&!process.env.APP_URL?.startsWith('https://')){console.error('Production APP_URL must use HTTPS.');process.exitCode=1;}
if(Object.values(checks).some(value=>!value))process.exitCode=1;
if(!process.env.ADMIN_PASSWORD||process.env.ADMIN_PASSWORD.length<16)console.log('Administrator provisioning requires a 16+ character ADMIN_PASSWORD. This does not block survey saving or an already provisioned account.');
console.log('No credentials or environment-file contents are printed.');
