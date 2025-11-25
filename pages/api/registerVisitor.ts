import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';
import type { Visitor } from '@/types/database';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      name, 
      phone, 
      email,
      register_number,
      event_id,
      event_name, 
      date_of_visit_from,
      date_of_visit_to,
      visitor_category,
      purpose,
      photo_data
    } = req.body;

    // Validate required fields
    if (!name || !event_id || !event_name || !date_of_visit_from || !date_of_visit_to || !visitor_category) {
      console.error('[REGISTER_VISITOR] Missing required fields:', {
        name: !!name,
        event_id: !!event_id,
        event_name: !!event_name,
        date_of_visit_from: !!date_of_visit_from,
        date_of_visit_to: !!date_of_visit_to,
        visitor_category: !!visitor_category
      });
      return res.status(400).json({ error: 'All required fields must be provided' });
    }

    let photoUrl = null;

    // Upload photo if provided
    if (photo_data) {
      try {
        // Convert base64 to buffer
        const base64Data = photo_data.replace(/^data:image\/\w+;base64,/, '');
        const buffer = Buffer.from(base64Data, 'base64');
        
        // Generate unique filename
        const fileName = `visitor-${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
        const filePath = `visitor-photos/${fileName}`;

        // Upload to Supabase storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('visitor-photos')
          .upload(filePath, buffer, {
            contentType: 'image/jpeg',
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          console.error('[REGISTER_VISITOR] Photo upload error:', uploadError);
        } else {
          // Get public URL
          const { data: urlData } = supabase.storage
            .from('visitor-photos')
            .getPublicUrl(filePath);
          
          photoUrl = urlData.publicUrl;
          console.log('[REGISTER_VISITOR] Photo uploaded:', photoUrl);
        }
      } catch (photoError) {
        console.error('[REGISTER_VISITOR] Photo processing error:', photoError);
        // Continue without photo if upload fails
      }
    }

    console.log('[REGISTER_VISITOR] Looking for event:', event_id);

    // First try to find in events table (for normal flow)
    let { data: event, error: eventError } = await supabase
      .from('events')
      .select('current_registrations, max_capacity, id')
      .eq('id', event_id)
      .single();

    // If not found in events, check if it's an event_request_id
    // and find the corresponding event
    if (eventError || !event) {
      console.log('[REGISTER_VISITOR] Not found in events table, checking event_requests...');
      
      const { data: eventRequest, error: reqError } = await supabase
        .from('event_requests')
        .select('id, max_capacity, status')
        .eq('id', event_id)
        .eq('status', 'approved')
        .single();
      
      if (reqError || !eventRequest) {
        console.error('[REGISTER_VISITOR] Event request not found or not approved:', reqError?.message);
        return res.status(404).json({ error: 'Event not found. Please ensure the event is approved.' });
      }
      
      console.log('[REGISTER_VISITOR] Found approved event_request, now looking for corresponding event...');
      
      // Now find the event created from this event_request
      const { data: linkedEvent, error: linkedError } = await supabase
        .from('events')
        .select('id, current_registrations, max_capacity')
        .eq('event_request_id', eventRequest.id)
        .single();
      
      if (linkedError || !linkedEvent) {
        console.error('[REGISTER_VISITOR] No event created for this request yet. Creating one...');
        
        // If no event exists yet, create it from the event_request
        const { data: newEvent, error: createError } = await supabase
          .from('events')
          .insert([{
            event_request_id: eventRequest.id,
            event_name: event_name,
            department: req.body.department || 'General',
            organiser_id: req.body.organiser_id,
            date_from: date_of_visit_from,
            date_to: date_of_visit_to,
            max_capacity: eventRequest.max_capacity,
            current_registrations: 0,
            description: req.body.description || ''
          }])
          .select()
          .single();
        
        if (createError || !newEvent) {
          console.error('[REGISTER_VISITOR] Failed to create event:', createError?.message);
          return res.status(500).json({ error: 'Failed to create event record' });
        }
        
        console.log('[REGISTER_VISITOR] Created new event:', newEvent.id);
        event = newEvent;
      } else {
        console.log('[REGISTER_VISITOR] Found linked event:', linkedEvent.id);
        event = linkedEvent;
      }
    }

    // Now we have a valid event, check capacity
    if (event && event.current_registrations >= event.max_capacity) {
      console.warn('[REGISTER_VISITOR] Event at capacity:', event.current_registrations, '/', event.max_capacity);
      return res.status(400).json({ error: 'Event is at full capacity' });
    }

    // Insert visitor into database
    // The trigger will automatically set the qr_color based on visitor_category
    // The trigger will automatically increment event registrations
    const { data, error } = await supabase
      .from('visitors')
      .insert([
        {
          name,
          phone,
          email,
          register_number,
          event_id: event!.id, // Use the actual event.id, not the request id
          event_name,
          date_of_visit_from,
          date_of_visit_to,
          visitor_category,
          purpose,
          photo_url: photoUrl,
          status: 'approved', // Auto-approved since event is already approved
        },
      ])
      .select()
      .single();

    if (error) {
      console.error('[REGISTER_VISITOR] Supabase error:', error);
      return res.status(500).json({ error: 'Failed to register visitor' });
    }

    console.log('[REGISTER_VISITOR] Visitor registered successfully:', data.id);

    // Return visitor data including the generated ID and QR color
    return res.status(201).json({
      success: true,
      visitor: data as Visitor,
    });
  } catch (error) {
    console.error('Error registering visitor:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
