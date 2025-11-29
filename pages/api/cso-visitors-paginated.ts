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
      status_filter = '', // 'pending', 'approved', 'revoked'
      event_filter = '',
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
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,event_name.ilike.%${search}%`);
    }

    // Apply status filter if provided
    if (status_filter && typeof status_filter === 'string' && status_filter !== '') {
      query = query.eq('status', status_filter);
    }

    // Apply event filter if provided
    if (event_filter && typeof event_filter === 'string' && event_filter !== '') {
      query = query.eq('event_name', event_filter);
    }

    // Apply ordering
    query = query.order('created_at', { ascending: false });

    // Apply pagination
    query = query.range(offset, offset + limitNum - 1);

    const { data: visitors, error, count } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Get overall statistics (without filters for total counts)
    const { count: totalRegistered, error: totalError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true });

    if (totalError) {
      console.error('Error fetching total count:', totalError);
    }

    const { count: totalPending, error: pendingError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'pending');

    if (pendingError) {
      console.error('Error fetching pending count:', pendingError);
    }

    const { count: totalApproved, error: approvedError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'approved');

    if (approvedError) {
      console.error('Error fetching approved count:', approvedError);
    }

    const { count: totalRevoked, error: revokedError } = await supabase
      .from('visitors')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'revoked');

    if (revokedError) {
      console.error('Error fetching revoked count:', revokedError);
    }

    // Short cache for frequently updating data
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');

    return res.status(200).json({
      success: true,
      visitors: visitors || [],
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: count || 0, // Total matching filters
        totalPages: Math.ceil((count || 0) / limitNum),
      },
      stats: {
        total: totalRegistered || 0,
        pending: totalPending || 0,
        approved: totalApproved || 0,
        revoked: totalRevoked || 0,
      },
    });
  } catch (error) {
    console.error('Error in cso-visitors-paginated API:', error);
    return res.status(500).json({
      success: false,
      error: 'Failed to fetch visitors',
    });
  }
}
