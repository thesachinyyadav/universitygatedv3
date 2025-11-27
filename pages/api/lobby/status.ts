import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { data, error } = await supabase
      .from('lobby_status')
      .select('*');

    if (error) throw error;

    // Short cache for real-time data
    res.setHeader('Cache-Control', 'private, max-age=3, stale-while-revalidate=10');

    return res.status(200).json({ success: true, lobbies: data });
  } catch (error: any) {
    console.error('Error fetching lobby status:', error);
    return res.status(500).json({ error: error.message });
  }
}
