import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

/**
 * API Endpoint: Get Analytics Statistics (Aggregated)
 * Purpose: Fetch summary stats without loading all visitor rows
 * Performance: O(1) - Uses database aggregation
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Get total registered count
    const { count: totalRegistered, error: countError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true });

    if (countError) throw countError;

    // Get total arrived count
    const { count: totalArrived, error: arrivedError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('has_arrived', true);

    if (arrivedError) throw arrivedError;

    // Get footfall data (need to fetch for calculation)
    // Use limit to prevent fetching all rows
    const { data: footfallData, error: footfallError } = await supabase
      .from('visitors')
      .select('accompanying_count, has_arrived')
      .limit(10000); // Reasonable limit for calculations

    if (footfallError) throw footfallError;

    // Calculate footfall
    const totalFootfallRegistered = footfallData?.reduce((sum, v) => 
      sum + 1 + (v.accompanying_count || 0), 0
    ) || 0;

    const totalFootfallArrived = footfallData?.filter(v => v.has_arrived)
      .reduce((sum, v) => sum + 1 + (v.accompanying_count || 0), 0) || 0;

    const arrivalRate = totalRegistered && totalRegistered > 0 
      ? Math.round(((totalArrived || 0) / totalRegistered) * 100) 
      : 0;

    // Cache for 30 seconds for more current stats
    res.setHeader('Cache-Control', 'private, max-age=30, stale-while-revalidate=60');

    return res.status(200).json({
      success: true,
      stats: {
        totalRegistered: totalRegistered || 0,
        totalArrived: totalArrived || 0,
        totalFootfallRegistered,
        totalFootfallArrived,
        arrivalRate,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics stats:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
