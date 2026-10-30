import 'server-only';
import { createCipheriv, createDecipheriv, createHmac, hkdfSync, randomBytes } from 'node:crypto';
import { securityEnv } from './env';
function key() { return Buffer.from(hkdfSync('sha256', securityEnv().AUTH_SECRET, 'recallmd-contact-encryption-v1', 'AES-256-GCM', 32)); }
export function encryptEmail(email:string) {
 const iv=randomBytes(12); const cipher=createCipheriv('aes-256-gcm',key(),iv); const content=Buffer.concat([cipher.update(email,'utf8'),cipher.final()]);
 return ['v1',iv.toString('hex'),cipher.getAuthTag().toString('hex'),content.toString('hex')].join(':');
}
export function decryptEmail(encoded:string) {
 const [version,iv,tag,content]=encoded.split(':');
 if(version!=='v1'||!iv||!tag||!content) throw new Error('CONTACT_DECRYPTION_FAILED');
 const decipher=createDecipheriv('aes-256-gcm',key(),Buffer.from(iv,'hex')); decipher.setAuthTag(Buffer.from(tag,'hex'));
 return Buffer.concat([decipher.update(Buffer.from(content,'hex')),decipher.final()]).toString('utf8');
}
export function emailHash(email:string) { return createHmac('sha256',Buffer.from(hkdfSync('sha256',securityEnv().AUTH_SECRET,'recallmd-contact-hash-v1','HMAC-SHA256',32))).update(email.toLowerCase()).digest('hex'); }
