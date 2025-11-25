import type { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '../../lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { visitorId, email } = req.body;

    if (!visitorId || !email) {
      return res.status(400).json({ error: 'Visitor ID and email are required' });
    }

    // Fetch visitor details
    const { data: visitor, error } = await supabase
      .from('visitors')
      .select('*')
      .eq('id', visitorId)
      .single();

    if (error || !visitor) {
      return res.status(404).json({ error: 'Visitor not found' });
    }

    // Generate QR retrieval link
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const qrLink = `${appUrl}/retrieve-qr?id=${visitorId}`;

    // TODO: Integrate with your email service (SendGrid, Resend, AWS SES, etc.)
    // For now, we'll log and return the link
    // In production, send actual email here
    
    console.log('[EMAIL] QR Code Link for:', visitor.name);
    console.log('[EMAIL] Send to:', email);
    console.log('[EMAIL] Link:', qrLink);
    console.log('[EMAIL] Event:', visitor.event_name);

    // Example email template (implement with your email service):
    /*
    const emailHTML = `
      <h2>Your Christ University Access Pass</h2>
      <p>Dear ${visitor.name},</p>
      <p>Here is your QR code access pass for: <strong>${visitor.event_name}</strong></p>
      <p>Click the link below to view and download your QR code:</p>
      <p><a href="${qrLink}" style="padding: 10px 20px; background: #254a9a; color: white; text-decoration: none; border-radius: 5px;">View My QR Code</a></p>
      <p>Or copy this link: ${qrLink}</p>
      <p>Valid dates: ${new Date(visitor.date_of_visit_from).toLocaleDateString()} - ${new Date(visitor.date_of_visit_to).toLocaleDateString()}</p>
      <p>Best regards,<br>Christ University Security</p>
    `;
    */

    return res.status(200).json({ 
      success: true, 
      message: 'QR code link sent to email',
      qrLink, // For testing - remove in production
      note: 'Email service not configured. Link displayed for testing.'
    });

  } catch (error: any) {
    console.error('[EMAIL] Error:', error);
    return res.status(500).json({ error: 'Failed to send email' });
  }
}
