import { beforeEach,describe,it,expect } from 'vitest';
import { campaignFromSearch,campaignSchema,preferenceSchema,POLICY_VERSION } from '@/lib/privacy-schema';
import { finalSubmissionSchema } from '@/lib/validation';
import { encryptEmail,decryptEmail } from '@/lib/contact-crypto';
import { validSubmission } from './fixtures';
const submission=()=>({...validSubmission(),termsAccepted:true,privacyAcknowledged:true,emailOptIn:false,email:''});
beforeEach(()=>{process.env.AUTH_SECRET='privacy-unit-test-secret-of-at-least-32-characters';});
describe('policy and email consent validation',()=>{
 it('requires explicit terms and privacy acknowledgements',()=>{expect(finalSubmissionSchema.safeParse(submission()).success).toBe(true);expect(finalSubmissionSchema.safeParse({...submission(),termsAccepted:false}).success).toBe(false);expect(finalSubmissionSchema.safeParse({...submission(),privacyAcknowledged:undefined}).success).toBe(false);});
 it('allows a survey without email and rejects email without an opt-in',()=>{expect(finalSubmissionSchema.safeParse(submission()).success).toBe(true);expect(finalSubmissionSchema.safeParse({...submission(),email:'student@example.invalid'}).success).toBe(false);});
 it('requires a valid email only when opted in',()=>{expect(finalSubmissionSchema.safeParse({...submission(),emailOptIn:true}).success).toBe(false);expect(finalSubmissionSchema.safeParse({...submission(),emailOptIn:true,email:'not-an-email'}).success).toBe(false);expect(finalSubmissionSchema.safeParse({...submission(),emailOptIn:true,email:'student@example.invalid'}).success).toBe(true);});
 it('rejects stale notice versions and tracking data supplied with rejection',()=>{expect(preferenceSchema.safeParse({analytics:true,policyVersion:'old'}).success).toBe(false);expect(preferenceSchema.safeParse({analytics:false,policyVersion:POLICY_VERSION,campaign:{source:'newsletter'}}).success).toBe(false);});
});
describe('minimal campaign labels',()=>{
 it('extracts only the five allowed tags',()=>{expect(campaignFromSearch('?utm_source=college-group&utm_medium=social&utm_campaign=pilot&email=private%40example.com&name=someone')).toEqual({source:'college-group',medium:'social',campaign:'pilot'});});
 it('drops malformed, oversized, and obvious personal labels',()=>{expect(campaignFromSearch('?utm_source=person%40example.com&utm_term='+ 'x'.repeat(101))).toBeUndefined();expect(campaignSchema.safeParse({source:'<script>alert(1)</script>'}).success).toBe(false);expect(campaignSchema.safeParse({source:'valid',ip:'1.2.3.4'}).success).toBe(false);});
 it('does not fabricate attribution on direct visits',()=>{expect(campaignFromSearch('')).toBeUndefined();expect(campaignSchema.safeParse({}).success).toBe(false);});
});
describe('encrypted optional contacts',()=>{
 it('encrypts with a fresh IV and preserves only encrypted data for storage',()=>{const one=encryptEmail('student@example.invalid'),two=encryptEmail('student@example.invalid');expect(one).not.toContain('student@example.invalid');expect(one).not.toBe(two);expect(decryptEmail(one)).toBe('student@example.invalid');});
 it('rejects tampering and use of a different encryption secret',()=>{const value=encryptEmail('student@example.invalid');expect(()=>decryptEmail(value.slice(0,-1)+(value.endsWith('0')?'1':'0'))).toThrow();process.env.AUTH_SECRET='different-test-secret-of-at-least-32-characters';expect(()=>decryptEmail(value)).toThrow();});
});
