import { ObjectId } from 'mongodb';
import { json, handleError, HttpError } from '@/lib/http';
import { requireAdmin } from '@/lib/auth';
import { getDb } from '@/lib/mongodb';
export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin(); const { id } = await context.params;
    if (!/^[a-f0-9]{24}$/.test(id)) throw new HttpError(404, 'NOT_FOUND', 'Response not found.');
    const response = await (await getDb()).collection('survey_responses').findOne({ _id: new ObjectId(id), expiresAt: { $gt: new Date() } }, { projection: { withdrawalHash: 0, submissionToken: 0 } });
    if (!response) throw new HttpError(404, 'NOT_FOUND', 'Response not found.');
    return json({ response });
  } catch (error) { return handleError(error); }
}
