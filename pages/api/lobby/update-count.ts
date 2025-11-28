import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { lobby_name, new_count, user_id } = req.body;

    if (!lobby_name || new_count === undefined || new_count === null) {
      return res.status(400).json({ error: 'lobby_name and new_count are required' });
    }

    if (new_count < 0) {
      return res.status(400).json({ error: 'Count cannot be negative' });
    }

    const { data, error } = await supabase
      .from('lobby_status')
      .update({ 
        current_count: new_count,
        last_updated: new Date().toISOString()
      })
      .eq('lobby_name', lobby_name)
      .select()
      .single();

    if (error) throw error;

    return res.status(200).json({ success: true, lobby: data });
  } catch (error: any) {
    console.error('Error updating lobby count:', error);
    return res.status(500).json({ error: error.message });
  }
}
