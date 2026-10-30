import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { decryptEmail } from '@/lib/contact-crypto';
import { json,route } from '@/lib/http';
import { z } from 'zod';
import type { ContactRecord } from '@/models/privacy';
const querySchema=z.object({page:z.coerce.number().int().min(1).max(100000).default(1),limit:z.coerce.number().int().min(1).max(100).default(20),status:z.enum(['pending_review','selected','declined']).optional()});
export const GET=route(async request=>{await requireAdmin();const query=querySchema.parse(Object.fromEntries(new URL(request.url).searchParams));const col=(await getDb()).collection<ContactRecord>('early_access_contacts');const filter={expiresAt:{$gt:new Date()},...(query.status?{status:query.status}:{})};const[rows,total]=await Promise.all([col.find(filter).sort({createdAt:-1,_id:-1}).skip((query.page-1)*query.limit).limit(query.limit).toArray(),col.countDocuments(filter)]);return json({rows:rows.map(r=>({id:r._id?.toHexString(),receipt:r.receipt,email:decryptEmail(r.emailCiphertext),status:r.status,optedInAt:r.optedInAt,offerVersion:r.offerVersion})),total,page:query.page,pages:Math.ceil(total/query.limit)});});
