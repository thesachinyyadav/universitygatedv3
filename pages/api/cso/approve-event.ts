import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const {
      request_id,
      status,
      rejection_reason,
      approved_by,
    } = req.body;

    // Validation
    if (!request_id || !status || !approved_by) {
      return res.status(400).json({ error: 'Request ID, status, and approver ID are required' });
    }

    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Status must be either "approved" or "rejected"' });
    }

    if (status === 'rejected' && !rejection_reason) {
      return res.status(400).json({ error: 'Rejection reason is required when rejecting' });
    }

    // Update event request status
    const updateData: any = {
      status,
      approved_by,
      approved_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (status === 'rejected') {
      updateData.rejection_reason = rejection_reason;
    }

    const { data: updatedRequest, error: updateError } = await supabase
      .from('event_requests')
      .update(updateData)
      .eq('id', request_id)
      .select()
      .single();

    if (updateError) {
      console.error('[APPROVE_EVENT] Update error:', updateError);
      return res.status(500).json({ error: 'Failed to update event request' });
    }

    console.log('[APPROVE_EVENT] Request updated:', request_id, 'Status:', status);

    // The database trigger will automatically create the event if approved
    // trigger: create_event_on_approval()

    return res.status(200).json({
      success: true,
      request: updatedRequest,
      message: status === 'approved' 
        ? 'Event request approved! Event is now available for visitor registration.' 
        : 'Event request rejected.',
    });
  } catch (error) {
    console.error('[APPROVE_EVENT] Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
