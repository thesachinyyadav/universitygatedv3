import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Fetch event requests for a specific organiser
    try {
      const { organiser_id } = req.query;

      if (!organiser_id) {
        return res.status(400).json({ error: 'Organiser ID is required' });
      }

      const { data: requests, error } = await supabase
        .from('event_requests')
        .select('*')
        .eq('organiser_id', organiser_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[EVENT_REQUESTS] Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch event requests' });
      }

      return res.status(200).json({ requests: requests || [] });
    } catch (error) {
      console.error('[EVENT_REQUESTS] Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // Create new event request
    try {
      const {
        organiser_id,
        department,
        event_name,
        event_description,
        date_from,
        date_to,
        expected_students,
        max_capacity,
      } = req.body;

      // Validation
      if (!organiser_id || !department || !event_name || !date_from || !date_to || !expected_students || !max_capacity) {
        return res.status(400).json({ error: 'All required fields must be provided' });
      }

      if (expected_students > max_capacity) {
        return res.status(400).json({ error: 'Max capacity must be greater than or equal to expected students' });
      }

      if (new Date(date_from) > new Date(date_to)) {
        return res.status(400).json({ error: 'End date must be after start date' });
      }

      if (new Date(date_from) < new Date()) {
        return res.status(400).json({ error: 'Event date cannot be in the past' });
      }

      // Insert event request
      const { data: newRequest, error } = await supabase
        .from('event_requests')
        .insert([
          {
            organiser_id,
            department,
            event_name,
            event_description: event_description || null,
            date_from,
            date_to,
            expected_students: parseInt(expected_students),
            max_capacity: parseInt(max_capacity),
            status: 'pending',
          },
        ])
        .select()
        .single();

      if (error) {
        console.error('[EVENT_REQUESTS] Insert error:', error);
        return res.status(500).json({ error: 'Failed to create event request' });
      }

      console.log('[EVENT_REQUESTS] New request created:', newRequest.id);
      
      // The database trigger will automatically:
      // 1. Create notification for CSO
      // So we just return success

      return res.status(201).json({
        success: true,
        request: newRequest,
        message: 'Event request submitted successfully. CSO will review it.',
      });
    } catch (error) {
      console.error('[EVENT_REQUESTS] Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
