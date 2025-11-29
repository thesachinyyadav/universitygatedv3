import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

/**
 * API Endpoint: Export All Visitors for Excel Report
 * Purpose: Fetch all visitors for download (with limit)
 */
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Fetch all visitors with a reasonable limit
    const { data: visitors, error } = await supabase
      .from('visitors')
      .select('name, phone, email, event_name, visitor_category, area_of_interest, accompanying_count, has_arrived, arrived_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50000); // Increased limit for exports

    if (error) throw error;

    return res.status(200).json({
      success: true,
      visitors: visitors || [],
      total: visitors?.length || 0,
    });
  } catch (error) {
    console.error('Error fetching visitors for export:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
