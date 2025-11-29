import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

/**
 * API Endpoint: Get Day-wise Statistics
 * Purpose: Aggregated stats by date
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('visitors')
      .select('arrived_at, has_arrived, accompanying_count')
      .eq('has_arrived', true)
      .order('arrived_at', { ascending: true })
      .limit(10000);

    if (error) throw error;

    // Group by date
    const dateMap = new Map<string, { visitors: number; footfall: number }>();
    
    data?.forEach((visitor) => {
      if (visitor.arrived_at) {
        const date = new Date(visitor.arrived_at).toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        
        if (!dateMap.has(date)) {
          dateMap.set(date, { visitors: 0, footfall: 0 });
        }
        
        const stats = dateMap.get(date)!;
        stats.visitors += 1;
        stats.footfall += 1 + (visitor.accompanying_count || 0);
      }
    });

    // Convert to array
    const dayWiseStats = Array.from(dateMap.entries())
      .map(([date, stats]) => ({
        date,
        visitors: stats.visitors,
        footfall: stats.footfall,
      }));

    // Longer cache for historical day-wise data
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

    return res.status(200).json({
      success: true,
      days: dayWiseStats,
    });
  } catch (error) {
    console.error('Error fetching day-wise stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
