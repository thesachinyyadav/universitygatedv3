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
    const { data: visitors, error } = await supabase
      .from('visitors')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to fetch visitors' });
    }

    return res.status(200).json({ visitors });
  } catch (error) {
    console.error('Error fetching visitors:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
