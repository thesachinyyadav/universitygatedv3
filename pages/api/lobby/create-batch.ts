import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { lobby_name, people_count, volunteers, user_id, notes } = req.body;

  if (!lobby_name || !people_count || !volunteers || !user_id) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  // Validate volunteers array
  if (!Array.isArray(volunteers) || volunteers.length === 0) {
    return res.status(400).json({ error: 'At least one volunteer is required' });
  }

  // Validate volunteer structure
  for (const volunteer of volunteers) {
    if (!volunteer.name || !volunteer.register_number) {
      return res.status(400).json({ error: 'Each volunteer must have name and register_number' });
    }
  }

  try {
    const { data, error } = await supabase.rpc('create_batch_exit', {
      p_lobby_name: lobby_name,
      p_people_count: people_count,
      p_volunteers: volunteers,
      p_user_id: user_id,
      p_notes: notes || null,
    });

    if (error) throw error;

    return res.status(200).json({ success: true, batch: data });
  } catch (error: any) {
    console.error('Error creating batch exit:', error);
    return res.status(500).json({ error: error.message });
  }
}
