import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lobby_name, page = '1', limit = '10', date } = req.query;

  try {
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const offset = (pageNum - 1) * limitNum;

    // Determine the target date (use provided date or default to today)
    const targetDate = date ? (date as string) : new Date().toISOString().split('T')[0];
    
    console.log('[BATCH HISTORY] Querying for date:', targetDate, 'lobby:', lobby_name);

    // Use RPC to filter by date using PostgreSQL's date functions for accuracy
    const { data: allData, error: queryError, count } = await supabase
      .from('batch_exits')
      .select('*', { count: 'exact' })
      .gte('created_at', `${targetDate}T00:00:00`)
      .lt('created_at', `${targetDate}T23:59:59.999`)
      .order('created_at', { ascending: false });

    if (queryError) {
      console.error('[BATCH HISTORY] Query error:', queryError);
      throw queryError;
    }

    // Filter by lobby name if specified
    let filteredData = allData || [];
    if (lobby_name && lobby_name !== 'all') {
      filteredData = filteredData.filter(batch => batch.lobby_name === lobby_name);
    }

    console.log('[BATCH HISTORY] Found', filteredData.length, 'batches');

    // Apply pagination manually after filtering
    const paginatedData = filteredData.slice(offset, offset + limitNum);
    const totalFiltered = filteredData.length;

    // Short cache for frequently updating batch data
    res.setHeader('Cache-Control', 'private, max-age=5, stale-while-revalidate=15');

    return res.status(200).json({ 
      success: true, 
      batches: paginatedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalFiltered,
        totalPages: Math.ceil(totalFiltered / limitNum),
      },
      debug: {
        targetDate,
        totalInDb: allData?.length || 0,
        afterLobbyFilter: totalFiltered,
        returned: paginatedData.length
      }
    });
  } catch (error: any) {
    console.error('Error fetching batch history:', error);
    return res.status(500).json({ error: error.message });
  }
}
