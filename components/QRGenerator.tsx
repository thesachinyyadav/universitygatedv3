import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import jsPDF from 'jspdf';
import { supabase } from '@/lib/supabaseClient';

interface QRGeneratorProps {
  visitorId: string;
  visitorName: string;
}

interface VisitorDetails {
  visitor_category: string;
  qr_color: string;
  event_name: string;
  date_of_visit_from: string;
  date_of_visit_to: string;
  email?: string;
  phone?: string;
}

export default function QRGenerator({ visitorId, visitorName }: QRGeneratorProps) {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [visitorDetails, setVisitorDetails] = useState<VisitorDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchVisitorDetails();
  }, [visitorId]);

  const fetchVisitorDetails = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('visitors')
        .select('visitor_category, qr_color, event_name, date_of_visit_from, date_of_visit_to, email, phone')
        .eq('id', visitorId)
        .single();

      if (error) {
        console.error('[QR_GENERATOR] Error fetching visitor details:', error);
        // Use default color if fetch fails
        await generateQR('#254a9a');
      } else if (data) {
        setVisitorDetails(data);
        await generateQR(data.qr_color || '#254a9a');
      }
    } catch (error) {
      console.error('[QR_GENERATOR] Unexpected error:', error);
      await generateQR('#254a9a');
    } finally {
      setIsLoading(false);
    }
  };

  const generateQR = async (qrColor: string) => {
    try {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
      const qrData = `${appUrl}/verify?id=${visitorId}`;
      const url = await QRCode.toDataURL(qrData, {
        width: 400,
        margin: 2,
        color: {
          dark: qrColor, // Use visitor's category color
          light: '#FFFFFF',
        },
      });
      setQrCodeUrl(url);
    } catch (error) {
      console.error('[QR_GENERATOR] Error generating QR code:', error);
    }
  };

  const downloadQR = () => {
    if (!qrCodeUrl) {
      console.error('[QR_DOWNLOAD] No QR code URL available');
      alert('QR code is not ready yet. Please wait a moment and try again.');
      return;
    }
    
    try {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `QR-${visitorName.replace(/\s+/g, '_')}-${visitorId.slice(0, 8)}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      console.log('[QR_DOWNLOAD] ✓ QR image download initiated');
    } catch (error) {
      console.error('[QR_DOWNLOAD] Error downloading QR image:', error);
      alert('Failed to download QR image. Please try again.');
    }
  };

  const downloadPDF = async () => {
    if (!qrCodeUrl) {
      console.error('[PDF_DOWNLOAD] No QR code URL available');
      alert('QR code is not ready yet. Please wait a moment and try again.');
      return;
    }

    try {
      console.log('[PDF_DOWNLOAD] Starting PDF generation...');
      
      // Load the Christ University logo
      const logoImg = new Image();
      logoImg.src = '/christunilogo.png';
      
      await new Promise((resolve, reject) => {
        logoImg.onload = resolve;
        logoImg.onerror = () => {
          console.warn('[PDF_DOWNLOAD] Logo failed to load, continuing without logo');
          resolve(null);
        };
        // Timeout after 2 seconds if logo doesn't load
        setTimeout(resolve, 2000);
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      // Clean white background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, 0, 210, 297, 'F');
      
      // Header section with gold border
      pdf.setDrawColor(189, 163, 97); // Gold color
      pdf.setLineWidth(1);
      pdf.rect(10, 10, 190, 35, 'S');
      
      // Add Christ University Logo (left corner inside border)
      if (logoImg.complete && logoImg.naturalHeight !== 0) {
        try {
          // Use actual image aspect ratio to avoid distortion
          const imgWidth = logoImg.naturalWidth;
          const imgHeight = logoImg.naturalHeight;
          const aspectRatio = imgWidth / imgHeight;
          
          // Set height and calculate width based on aspect ratio
          const logoHeight = 22;
          const logoWidth = logoHeight * aspectRatio;
          
          pdf.addImage(logoImg, 'PNG', 15, 16, logoWidth, logoHeight);
        } catch (err) {
          console.warn('[PDF_DOWNLOAD] Could not add logo to PDF:', err);
        }
      }
      
      // "University Gated" text (right side, aligned properly)
      pdf.setTextColor(37, 74, 154); // Primary blue
      pdf.setFontSize(18);
      pdf.setFont('helvetica', 'bold');
      pdf.text('University Gated', 195, 23, { align: 'right' });
      
      // Subtitle below "University Gated"
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(120, 120, 120);
      pdf.text('Access Management System', 195, 30, { align: 'right' });

      // Main content area with better spacing
      pdf.setDrawColor(220, 220, 220);
      pdf.setLineWidth(0.3);
      pdf.rect(10, 55, 190, 210, 'S');
      
      // Visitor name - Large and prominent
      pdf.setTextColor(37, 74, 154);
      pdf.setFontSize(24);
      pdf.setFont('helvetica', 'bold');
      pdf.text(visitorName.toUpperCase(), 105, 73, { align: 'center' });
      
      // Decorative line under name
      pdf.setDrawColor(189, 163, 97);
      pdf.setLineWidth(0.8);
      pdf.line(55, 78, 155, 78);

      // Visitor Category Badge
      if (visitorDetails?.visitor_category) {
        const categoryText = visitorDetails.visitor_category.toUpperCase();
        const categoryColors: { [key: string]: number[] } = {
          'student': [9, 41, 135],       // Deep Blue (#092987)
          'speaker': [255, 179, 0],      // Amber
          'vip': [128, 0, 0]             // Maroon
        };
        const colorRGB = categoryColors[visitorDetails.visitor_category] || [9, 41, 135];
        
        // Category badge
        pdf.setFillColor(colorRGB[0], colorRGB[1], colorRGB[2]);
        pdf.roundedRect(70, 85, 70, 12, 3, 3, 'F');
        
        // Category text
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(categoryText, 105, 93, { align: 'center' });
      }

      // Event Details Section
      if (visitorDetails?.event_name) {
        // Event label
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('EVENT', 105, 109, { align: 'center' });
        
        // Event name - highlighted with background
        pdf.setFillColor(255, 250, 240); // Light beige/cream background
        pdf.roundedRect(25, 112, 160, 14, 2, 2, 'F');
        
        // Event name text - larger and bolder
        pdf.setTextColor(37, 74, 154); // Primary blue for emphasis
        pdf.setFontSize(16);
        pdf.setFont('helvetica', 'bold');
        pdf.text(visitorDetails.event_name, 105, 121, { align: 'center', maxWidth: 150 });
      }

      // Event Dates
      if (visitorDetails?.date_of_visit_from && visitorDetails?.date_of_visit_to) {
        pdf.setTextColor(100, 100, 100);
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.text('VALID DATES', 105, 132, { align: 'center' });
        
        const fromDate = new Date(visitorDetails.date_of_visit_from).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const toDate = new Date(visitorDetails.date_of_visit_to).toLocaleDateString('en-IN', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        
        pdf.setTextColor(37, 74, 154);
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        pdf.text(`${fromDate}  to  ${toDate}`, 105, 141, { align: 'center' });
      }

      // QR Code with elegant border
      if (qrCodeUrl) {
        // Colored border frame
        if (visitorDetails?.qr_color) {
          const hexColor = visitorDetails.qr_color.replace('#', '');
          const r = parseInt(hexColor.substring(0, 2), 16);
          const g = parseInt(hexColor.substring(2, 4), 16);
          const b = parseInt(hexColor.substring(4, 6), 16);
          
          // Shadow for 3D effect
          pdf.setFillColor(220, 220, 220);
          pdf.roundedRect(52, 148, 107, 107, 5, 5, 'F');
          
          // Colored border frame (thicker and more prominent)
          pdf.setFillColor(r, g, b);
          pdf.roundedRect(50, 146, 110, 110, 5, 5, 'F');
          
          // White background for QR
          pdf.setFillColor(255, 255, 255);
          pdf.roundedRect(57, 153, 96, 96, 3, 3, 'F');
        }
        
        // QR Code image - centered perfectly
        pdf.addImage(qrCodeUrl, 'PNG', 62, 158, 86, 86);
      }

      // Instructions
      pdf.setTextColor(60, 60, 60);
      pdf.setFontSize(11);
      pdf.setFont('helvetica', 'bold');
      pdf.text('This QR code is required for entry verification.', 105, 267, { align: 'center' });
      
      // Visitor ID
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.setTextColor(150, 150, 150);
      pdf.text(`Visitor ID: ${visitorId}`, 105, 273, { align: 'center' });

      // Footer
      pdf.setFillColor(37, 74, 154);
      pdf.rect(0, 275, 210, 22, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Christ University Gated Access Management', 105, 284, { align: 'center' });
      
      pdf.setFontSize(7);
      pdf.setFont('helvetica', 'normal');
      pdf.text('Secure • Efficient • Contactless', 105, 290, { align: 'center' });

      // Save PDF
      const safeEventName = visitorDetails?.event_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
      pdf.save(`ChristUniversity_AccessPass_${visitorName.replace(/\s+/g, '_')}_${safeEventName}.pdf`);
      console.log('[PDF_DOWNLOAD] ✓ PDF download initiated successfully');
    } catch (error) {
      console.error('[PDF_DOWNLOAD] Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="card text-center max-w-lg mx-auto shadow-xl"
    >
      {/* Success Icon SVG */}
      <div className="mb-6">
        <svg className="w-16 h-16 mx-auto text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>

      <h2 className="text-2xl md:text-3xl font-bold text-primary-600 mb-3">
        Registration Successful
      </h2>
      
      <p className="text-gray-600 mb-8 px-4">
        Your access request has been recorded. Present this QR code at the security gate.
      </p>

      {/* QR Code Display with Colored Border */}
      <div className="mb-6 inline-block">
        <div 
          className="p-1 rounded-xl shadow-lg"
          style={{ 
            backgroundColor: visitorDetails?.qr_color || '#254a9a',
            padding: '8px'
          }}
        >
          <div className="bg-white p-4 rounded-lg">
            {qrCodeUrl && !isLoading ? (
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-64 h-64 md:w-80 md:h-80" />
            ) : (
              <div className="w-64 h-64 md:w-80 md:h-80 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
        </div>
        {visitorDetails?.qr_color && (
          <p className="text-xs text-gray-500 text-center mt-2">
            Color-coded QR for {visitorDetails.visitor_category} category
          </p>
        )}
      </div>

      {/* Visitor Info */}
      <div className="mb-6 bg-primary-50 p-4 rounded-lg space-y-3">
        <div>
          <p className="text-sm text-gray-700">
            <span className="font-semibold text-primary-600">Name:</span> {visitorName}
          </p>
        </div>
        
        {visitorDetails?.visitor_category && (
          <div>
            <p className="text-sm text-gray-700 mb-2">
              <span className="font-semibold text-primary-600">Category:</span>
            </p>
            <span 
              className="inline-block px-4 py-2 rounded-full text-white font-semibold text-sm shadow-md"
              style={{ backgroundColor: visitorDetails.qr_color }}
            >
              {visitorDetails.visitor_category === 'student' && '🎓 Student'}
              {visitorDetails.visitor_category === 'speaker' && '🎤 Speaker/Guest'}
              {visitorDetails.visitor_category === 'vip' && '⭐ VIP'}
            </span>
          </div>
        )}

        {visitorDetails?.event_name && (
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-primary-600">Event:</span> {visitorDetails.event_name}
            </p>
          </div>
        )}

        {visitorDetails?.date_of_visit_from && visitorDetails?.date_of_visit_to && (
          <div>
            <p className="text-sm text-gray-700">
              <span className="font-semibold text-primary-600">Valid Dates:</span>
            </p>
            <p className="text-xs text-gray-600 mt-1">
              {new Date(visitorDetails.date_of_visit_from).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })} 
              {' to '}
              {new Date(visitorDetails.date_of_visit_to).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })}
            </p>
          </div>
        )}

        <div>
          <p className="text-xs text-gray-500">
            <span className="font-semibold">Visitor ID:</span> {visitorId}
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={downloadPDF}
          className="w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download PDF Pass</span>
        </button>
        
        <button
          onClick={downloadQR}
          className="w-full bg-tertiary-600 hover:bg-tertiary-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Download QR Image</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <a
            href="/retrieve-qr"
            className="flex-1 text-center text-primary-600 hover:text-primary-700 font-medium py-2 text-sm inline-flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Retrieve QR Later</span>
          </a>
          <a
            href="/"
            className="flex-1 text-center text-primary-600 hover:text-primary-700 font-medium py-2 text-sm inline-flex items-center justify-center space-x-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Return to Home</span>
          </a>
        </div>
      </div>

      {/* Important Notice */}
      <div className="mt-6 p-4 bg-amber-50 border-l-4 border-amber-400 rounded-r-lg text-left">
        <div className="flex items-start space-x-3">
          <svg className="w-6 h-6 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className="font-semibold text-gray-800 text-sm">Important</p>
            <p className="text-sm text-gray-600 mt-1">
              Save or print this QR code. You'll need it for entry verification at the security gate.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
