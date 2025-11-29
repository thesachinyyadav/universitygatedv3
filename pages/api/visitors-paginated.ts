import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      page = '1',
      limit = '50',
      search = '',
    } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Build the base query
    let query = supabase
      .from('visitors')
      .select('*', { count: 'exact' });

    // Apply search filter if provided
    if (search && typeof search === 'string' && search.trim() !== '') {
      query = query.or(`name.ilike.%${search}%,phone.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // Apply ordering: not arrived first, then by arrival time, then by creation time
    query = query
      .order('has_arrived', { ascending: false })
      .order('arrived_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: visitors, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Get total counts (without search filter for overall stats)
    const { count: totalRegistered, error: totalError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total count:', totalError);
    }

    const { count: totalArrived, error: arrivedError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('has_arrived', true);

    if (arrivedError) {
      console.error('Error fetching arrived count:', arrivedError);
    }

    // Short cache for frequently updating data
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');

    return res.status(200).json({
      success: true,
      visitors: visitors || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0, // Total matching search
        totalPages: Math.ceil((count || 0) / limitNum),
      },
      stats: {
        totalRegistered: totalRegistered || 0,
        totalArrived: totalArrived || 0,
        totalPending: (totalRegistered || 0) - (totalArrived || 0),
      },
    });
  } catch (error) {
    console.error('Error in visitors-paginated API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch visitors',
    });
  }
}
