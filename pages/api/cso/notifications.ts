import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'GET') {
    // Fetch notifications for CSO user
    try {
      const { user_id } = req.query;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { data: notifications, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user_id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[NOTIFICATIONS] Database error:', error);
        return res.status(500).json({ error: 'Failed to fetch notifications' });
      }

      const unreadCount = notifications?.filter(n => !n.is_read).length || 0;

      return res.status(200).json({ 
        notifications: notifications || [],
        unread_count: unreadCount 
      });
    } catch (error) {
      console.error('[NOTIFICATIONS] Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'PATCH') {
    // Mark notification as read
    try {
      const { notification_id } = req.body;

      if (!notification_id) {
        return res.status(400).json({ error: 'Notification ID is required' });
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notification_id);

      if (error) {
        console.error('[NOTIFICATIONS] Update error:', error);
        return res.status(500).json({ error: 'Failed to update notification' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[NOTIFICATIONS] Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  if (req.method === 'POST') {
    // Mark all notifications as read
    try {
      const { user_id } = req.body;

      if (!user_id) {
        return res.status(400).json({ error: 'User ID is required' });
      }

      const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', user_id)
        .eq('is_read', false);

      if (error) {
        console.error('[NOTIFICATIONS] Update error:', error);
        return res.status(500).json({ error: 'Failed to update notifications' });
      }

      return res.status(200).json({ success: true });
    } catch (error) {
      console.error('[NOTIFICATIONS] Server error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
