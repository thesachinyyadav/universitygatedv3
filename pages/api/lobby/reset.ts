import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lobby_name, user_id } = req.body;

  if (!lobby_name || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  try {
    const { error } = await supabase.rpc('reset_lobby', {
      p_lobby_name: lobby_name,
      p_user_id: user_id,
    });

    if (error) throw error;

    return res.status(200).json({ success: true, message: `${lobby_name} reset successfully` });
  } catch (error: any) {
    console.error('Error resetting lobby:', error);
    return res.status(500).json({ error: error.message });
  }
}
