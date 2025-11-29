import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

/**
 * API Endpoint: Get Area of Interest Statistics
 * Purpose: Aggregated stats by area without loading all rows
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch area of interest data with limit
    const { data, error } = await supabase
      .from('visitors')
      .select('area_of_interest, has_arrived, accompanying_count')
      .limit(10000); // Prevent fetching unlimited rows

    if (error) throw error;

    // Group by area of interest
    const areaMap = new Map<string, { total: number; arrived: number }>();
    
    data?.forEach((visitor) => {
      let interests: string[] = [];
      const peopleCount = 1 + (visitor.accompanying_count || 0);
      
      try {
        if (typeof visitor.area_of_interest === 'string') {
          const parsed = JSON.parse(visitor.area_of_interest);
          interests = Array.isArray(parsed) ? parsed : [visitor.area_of_interest];
        } else if (Array.isArray(visitor.area_of_interest)) {
          interests = visitor.area_of_interest;
        } else {
          interests = ['Not Specified'];
        }
      } catch {
        interests = visitor.area_of_interest ? [visitor.area_of_interest] : ['Not Specified'];
      }

      interests.forEach((area) => {
        if (!areaMap.has(area)) {
          areaMap.set(area, { total: 0, arrived: 0 });
        }
        const stats = areaMap.get(area)!;
        stats.total += peopleCount;
        if (visitor.has_arrived) {
          stats.arrived += peopleCount;
        }
      });
    });

    // Convert to array and sort
    const areaStats = Array.from(areaMap.entries())
      .map(([area, stats]) => ({
        area,
        total: stats.total,
        arrived: stats.arrived,
      }))
      .sort((a, b) => b.total - a.total);

    // Longer cache for less frequently changing area stats
    res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=120');

    return res.status(200).json({
      success: true,
      areas: areaStats,
    });
  } catch (error) {
    console.error('Error fetching area stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
