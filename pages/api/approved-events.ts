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
    // Fetch approved events that:
    // 1. Are approved (via events table - only approved requests create events)
    // 2. Haven't ended yet (date_to >= today)
    // 3. Have available capacity (current_registrations < max_capacity)

    const today = new Date().toISOString().split('T')[0];

    const { data: events, error } = await supabase
      .from('events')
      .select('*')
      .gte('date_to', today)
      .order('date_from', { ascending: true });

    if (error) {
      console.error('[APPROVED_EVENTS] Database error:', error);
      return res.status(500).json({ error: 'Failed to fetch events' });
    }

    // Filter events with available capacity and format response
    const availableEvents = (events || [])
      .filter(event => event.current_registrations < event.max_capacity)
      .map(event => ({
        id: event.id,
        event_name: event.event_name,
        department: event.department,
        date_from: event.date_from,
        date_to: event.date_to,
        description: event.description,
        max_capacity: event.max_capacity,
        current_registrations: event.current_registrations,
        available_slots: event.max_capacity - event.current_registrations,
      }));

    console.log('[APPROVED_EVENTS] Found:', availableEvents.length, 'events');

    return res.status(200).json({ 
      events: availableEvents,
      count: availableEvents.length 
    });
  } catch (error) {
    console.error('[APPROVED_EVENTS] Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
