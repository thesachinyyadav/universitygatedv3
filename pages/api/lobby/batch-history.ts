import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lobby_name } = req.query;

  try {
    let query = supabase
      .from('todays_batch_history')
      .select('*');

    if (lobby_name && lobby_name !== 'all') {
      query = query.eq('lobby_name', lobby_name);
    }

    const { data, error } = await query;

    if (error) throw error;

    return res.status(200).json({ success: true, batches: data });
  } catch (error: any) {
    console.error('Error fetching batch history:', error);
    return res.status(500).json({ error: error.message });
  }
}
