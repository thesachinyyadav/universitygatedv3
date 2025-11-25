import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import type { VisitorStatus } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PATCH') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitor_id, status } = req.body;

    // Validate inputs
    if (!visitor_id || !status) {
      return res.status(400).json({ error: 'Visitor ID and status are required' });
    }

    if (!['pending', 'approved', 'revoked'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status value' });
    }

    // Update visitor status
    const { data, error } = await supabase
      .from('visitors')
      .update({ status: status as VisitorStatus })
      .eq('id', visitor_id)
      .select()
      .single();

    if (error) {
      console.error('Supabase error:', error);
      return res.status(500).json({ error: 'Failed to update visitor status' });
    }

    return res.status(200).json({
      success: true,
      visitor: data,
    });
  } catch (error) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
