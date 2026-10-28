import { describe, it, expect } from 'vitest';
import { csvCell, responsesCsv } from '@/lib/csv';
import { responseQuery } from '@/lib/responses';
import { validSubmission } from './fixtures';
describe('CSV safety', () => {
 it.each(['=1+1', '+CMD()', '-1+2', '@SUM(A1)', '  =SUM(A1)', '\t=1', '\r@x'])('neutralizes spreadsheet formula %j', value => { expect(csvCell(value)).toBe(`"'${value}"`); });
 it('escapes quotes, newlines and commas', () => expect(csvCell('a,"b"\nc')).toBe('"a,""b""\nc"'));
 it('exports all 28 answers and submission metadata with a BOM', () => { const s = validSubmission(); const csv = responsesCsv([{ ...s, receipt: 'reference', submittedAt: new Date('2026-10-28T00:00:00Z') }]); expect(csv.startsWith('\uFEFF')).toBe(true); expect(csv).toContain('Q28.'); expect(csv).toContain('MBBS student preparing alongside college'); expect(csv).toContain('2026-10-28T00:00:00.000Z'); });
 it('uses the stored historic option label', () => { const s = validSubmission(); const csv = responsesCsv([{ ...s, receipt: 'reference', submittedAt: new Date(), questionSnapshot: [{ id:'q1', number:1, version:1, prompt:'Old wording', required:true, type:'single', options:[{ value:'q1_a1',label:'Historic answer' }] }] }]); expect(csv).toContain('Historic answer'); });
});
describe('response filtering and pagination', () => {
 it('defaults to page 1 with 20 responses', () => { const { query, filter } = responseQuery('http://localhost/api'); expect(query.page).toBe(1); expect(query.limit).toBe(20); expect(filter.status).toBe('submitted'); expect(filter.expiresAt).toBeDefined(); });
 it('bounds pagination and rejects malformed dates', () => { for (const q of ['page=0','limit=101','from=nope','from=2026-12-01&to=2026-01-01']) expect(() => responseQuery(`http://localhost/api?${q}`)).toThrow(); });
 it('escapes regex search and uses IST day boundaries', () => { const { filter } = responseQuery('http://localhost/api?search=%5Ba%5D.*&from=2026-10-28&to=2026-10-28'); expect(JSON.stringify(filter.$or)).toContain('\\\\[a\\\\]\\\\.\\\\*'); expect(JSON.stringify(filter.submittedAt)).toContain('2026-10-27T18:30:00.000Z'); expect(JSON.stringify(filter.submittedAt)).toContain('2026-10-28T18:30:00.000Z'); });
});
