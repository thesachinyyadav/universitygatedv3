import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse pagination parameters
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 50, 100); // Max 100
    const offset = (page - 1) * limit;
    const eventId = req.query.event_id as string;
    const search = req.query.search as string;
    const status = req.query.status as string;

    // Build query
    let query = supabase
      .from('visitors')
      .select('*', { count: 'exact' });

    // Apply filters
    if (eventId) {
      query = query.eq('event_id', eventId);
    }
    if (status && status !== 'all') {
      query = query.eq('status', status);
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
    }

    // Apply pagination and ordering
    const { data: visitors, error, count } = await query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch visitors' });
    }

    // Set cache headers for better performance
    res.setHeader('Cache-Control', 'private, max-age=10, stale-while-revalidate=30');

    return res.status(200).json({ 
      visitors,
      pagination: {
        page,
        limit,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / limit),
        hasMore: offset + limit < (count || 0),
      }
    });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
