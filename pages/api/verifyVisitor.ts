import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import type { Visitor } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { id, guard_username } = req.query;

    if (!id || typeof id !== 'string') {
      return res.status(400).json({ error: 'Visitor ID is required' });
    }

    // Fetch visitor from database
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      return res.status(404).json({ error: 'Visitor not found', verified: false });
    }

    const visitor = data as Visitor;

    // Check if status is revoked
    if (visitor.status === 'revoked') {
      return res.status(200).json({
        verified: false,
        visitor: {
          id: visitor.id,
          name: visitor.name,
          email: visitor.email,
          phone: visitor.phone,
          register_number: visitor.register_number,
          event_name: visitor.event_name,
          visitor_category: visitor.visitor_category,
          purpose: visitor.purpose,
          date_of_visit: visitor.date_of_visit,
          date_of_visit_from: visitor.date_of_visit_from,
          date_of_visit_to: visitor.date_of_visit_to,
          status: visitor.status,
          photo_url: visitor.photo_url,
        },
      });
    }

    // Check if current date is within the valid visit period
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison
    
    let isWithinDateRange = true;
    let dateError = '';
    
    if (visitor.date_of_visit_from && visitor.date_of_visit_to) {
      const fromDate = new Date(visitor.date_of_visit_from);
      const toDate = new Date(visitor.date_of_visit_to);
      fromDate.setHours(0, 0, 0, 0);
      toDate.setHours(23, 59, 59, 999); // End of day
      
      if (today < fromDate) {
        isWithinDateRange = false;
        dateError = 'Event has not started yet';
      } else if (today > toDate) {
        isWithinDateRange = false;
        dateError = 'Event date has passed';
      }
    } else if (visitor.date_of_visit) {
      const visitDate = new Date(visitor.date_of_visit);
      visitDate.setHours(0, 0, 0, 0);
      
      if (today.getTime() !== visitDate.getTime()) {
        isWithinDateRange = false;
        if (today > visitDate) {
          dateError = 'Event date has passed';
        } else {
          dateError = 'Event has not started yet';
        }
      }
    }

    // Check if access is granted
    const isVerified = visitor.status === 'approved' && isWithinDateRange;

    // If verified successfully and guard_username provided, update verification tracking
    if (isVerified && guard_username && typeof guard_username === 'string') {
      console.log(`[VERIFY] Updating verification tracking for visitor ${id} by guard ${guard_username}`);
      
      const { data: updateData, error: updateError } = await supabase
        .from('visitors')
        .update({
          verified_by: guard_username,
          verified_at: new Date().toISOString()
        })
        .eq('id', id)
        .select();
      
      if (updateError) {
        console.error('[VERIFY] Error updating verification tracking:', updateError);
        // Don't fail the request if tracking update fails
      } else {
        console.log('[VERIFY] Successfully updated verification tracking:', updateData);
      }
    } else {
      console.log('[VERIFY] Skipping verification tracking update:', {
        isVerified,
        hasGuardUsername: !!guard_username,
        guard_username
      });
    }

    return res.status(200).json({
      verified: isVerified,
      dateError: dateError || undefined,
      visitor: {
        id: visitor.id,
        name: visitor.name,
        email: visitor.email,
        phone: visitor.phone,
        register_number: visitor.register_number,
        event_name: visitor.event_name,
        visitor_category: visitor.visitor_category,
        purpose: visitor.purpose,
        date_of_visit: visitor.date_of_visit,
        date_of_visit_from: visitor.date_of_visit_from,
        date_of_visit_to: visitor.date_of_visit_to,
        status: visitor.status,
        photo_url: visitor.photo_url,
      },
    });
  } catch (error) {
    console.error('Error verifying visitor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
