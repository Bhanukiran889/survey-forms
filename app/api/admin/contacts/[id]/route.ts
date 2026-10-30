import { ObjectId } from 'mongodb';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
import { assertSameOrigin,handleError,HttpError,json,readJson } from '@/lib/http';
export async function PATCH(request:Request,context:{params:Promise<{id:string}>}){try{assertSameOrigin(request);await requireAdmin();const{id}=await context.params;if(!/^[a-f0-9]{24}$/.test(id))throw new HttpError(404,'NOT_FOUND','Contact not found.');const data=await readJson(request,z.object({status:z.enum(['pending_review','selected','declined'])}).strict());const result=await(await getDb()).collection('early_access_contacts').updateOne({_id:new ObjectId(id),expiresAt:{$gt:new Date()}},{$set:{status:data.status,updatedAt:new Date()}});if(!result.matchedCount)throw new HttpError(404,'NOT_FOUND','Contact not found.');return json({updated:true});}catch(error){return handleError(error);}}
