import { it, expect, vi } from 'vitest';
vi.mock('@/lib/mongodb',()=>({getDb:async()=>({collection:()=>({aggregate:()=>({toArray:async()=>[{}]}),countDocuments:async()=>0})})}));
import { getAnalytics } from '@/lib/analytics';
it('provides an honest empty analytics state with no invented counts or invalid denominator',async()=>{const result=await getAnalytics();expect(result.total).toBe(0);expect(result.drafts).toBe(0);expect(result.completionRate).toBeNull();expect(result.topStage).toBeNull();expect(result.topRecall).toBeNull();expect(Object.values(result.charts).every(chart=>chart.length===0)).toBe(true);});
