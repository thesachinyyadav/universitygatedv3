import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import Image from 'next/image';
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
      
      // Load the Christ University logo (only in browser)
      let logoImg: HTMLImageElement | null = null;
      if (typeof window !== 'undefined') {
        logoImg = new window.Image();
        logoImg.src = '/christunilogo.png';
        
        await new Promise((resolve, reject) => {
          if (logoImg) {
            logoImg.onload = resolve;
            logoImg.onerror = () => {
              console.warn('[PDF_DOWNLOAD] Logo failed to load, continuing without logo');
              resolve(null);
            };
          }
          // Timeout after 2 seconds if logo doesn't load
          setTimeout(resolve, 2000);
        });
      }

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
        pdf.rect(70, 85, 70, 12, 'F');
        
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
        pdf.rect(25, 112, 160, 14, 'F');
        
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
        try {
          // Colored border frame
          if (visitorDetails?.qr_color) {
            const hexColor = visitorDetails.qr_color.replace('#', '');
            
            // Validate hex color and parse RGB values
            if (hexColor.length === 6 && /^[0-9A-Fa-f]{6}$/.test(hexColor)) {
              const r = parseInt(hexColor.substring(0, 2), 16);
              const g = parseInt(hexColor.substring(2, 4), 16);
              const b = parseInt(hexColor.substring(4, 6), 16);
              
              // Validate RGB values are valid numbers
              if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                // Shadow for 3D effect
                pdf.setFillColor(220, 220, 220);
                pdf.rect(52, 148, 107, 107, 'F');
                
                // Colored border frame (thicker and more prominent)
                pdf.setFillColor(r, g, b);
                pdf.rect(50, 146, 110, 110, 'F');
                
                // White background for QR
                pdf.setFillColor(255, 255, 255);
                pdf.rect(57, 153, 96, 96, 'F');
              } else {
                console.warn('[PDF_DOWNLOAD] Invalid RGB values parsed from color:', hexColor);
              }
            } else {
              console.warn('[PDF_DOWNLOAD] Invalid hex color format:', visitorDetails.qr_color);
            }
          }
          
          // QR Code image - centered perfectly
          console.log('[PDF_DOWNLOAD] Adding QR code image to PDF...');
          pdf.addImage(qrCodeUrl, 'PNG', 62, 158, 86, 86);
          console.log('[PDF_DOWNLOAD] ✓ QR code image added successfully');
        } catch (imgError) {
          console.error('[PDF_DOWNLOAD] Error adding QR image to PDF:', imgError);
          // Add a placeholder text if QR code fails
          pdf.setTextColor(255, 0, 0);
          pdf.setFontSize(10);
          pdf.text('QR Code unavailable', 105, 200, { align: 'center' });
        }
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

      // Save PDF with better error handling
      try {
        const safeEventName = visitorDetails?.event_name?.replace(/[^a-zA-Z0-9]/g, '_') || 'Event';
        const fileName = `ChristUniversity_AccessPass_${visitorName.replace(/\s+/g, '_')}_${safeEventName}.pdf`;
        
        // Try to save the PDF
        pdf.save(fileName);
        console.log('[PDF_DOWNLOAD] ✓ PDF download initiated successfully:', fileName);
        
        // Show success message after a brief delay
        setTimeout(() => {
          alert('PDF downloaded successfully! Check your Downloads folder.');
        }, 500);
      } catch (saveError) {
        console.error('[PDF_DOWNLOAD] Error saving PDF:', saveError);
        
        // Fallback: try to open in new window
        try {
          const pdfBlob = pdf.output('blob');
          const blobUrl = URL.createObjectURL(pdfBlob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = `ChristUniversity_AccessPass_${visitorName.replace(/\s+/g, '_')}.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(blobUrl);
          console.log('[PDF_DOWNLOAD] ✓ PDF downloaded via fallback method');
        } catch (fallbackError) {
          console.error('[PDF_DOWNLOAD] Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }
    } catch (error) {
      console.error('[PDF_DOWNLOAD] Error generating PDF:', error);
      alert('Failed to generate PDF. Please try again or check your browser settings.');
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="bg-white rounded-2xl shadow-lg border border-gray-100 text-center max-w-lg mx-auto p-6 sm:p-8"
    >
      {/* Success Icon */}
      <div className="mb-5">
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center shadow-lg">
          <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>
      </div>

      <h2 className="text-xl sm:text-2xl font-bold text-gray-800 mb-2">
        Your Access Pass
      </h2>
      
      <p className="text-gray-500 text-sm mb-6 px-2">
        Present this QR code at the security gate for verification
      </p>

      {/* QR Code Display with Subtle Border */}
      <div className="mb-6 inline-block">
        <div className="relative">
          {/* Subtle gradient border */}
          <div 
            className="absolute inset-0 rounded-2xl opacity-20"
            style={{ 
              backgroundColor: visitorDetails?.qr_color || '#254a9a',
            }}
          />
          <div 
            className="relative bg-white rounded-2xl shadow-lg border-2 p-5"
            style={{ 
              borderColor: visitorDetails?.qr_color ? `${visitorDetails.qr_color}40` : '#254a9a40',
            }}
          >
            {qrCodeUrl && !isLoading ? (
              <img src={qrCodeUrl} alt="QR Code" className="mx-auto w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72" />
            ) : (
              <div className="w-56 h-56 sm:w-64 sm:h-64 md:w-72 md:h-72 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
              </div>
            )}
          </div>
        </div>
        {visitorDetails?.visitor_category && (
          <div className="mt-3 flex items-center justify-center space-x-2">
            <span 
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: visitorDetails?.qr_color || '#254a9a' }}
            />
            <p className="text-xs text-gray-500">
              {visitorDetails.visitor_category.charAt(0).toUpperCase() + visitorDetails.visitor_category.slice(1)} Access Pass
            </p>
          </div>
        )}
      </div>

      {/* Visitor Info */}
      <div className="mb-6 bg-gray-50 border border-gray-100 p-4 sm:p-5 rounded-xl space-y-4">
        {/* Name & Category Row */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="text-left">
            <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Visitor Name</p>
            <p className="text-base font-semibold text-gray-800 mt-0.5">{visitorName}</p>
          </div>
          
          {visitorDetails?.visitor_category && (
            <span 
              className="inline-flex items-center px-3 py-1.5 rounded-lg text-white font-medium text-xs shadow-sm"
              style={{ 
                backgroundColor: visitorDetails.qr_color,
                opacity: 0.9
              }}
            >
              {visitorDetails.visitor_category === 'student' && '🎓 Student'}
              {visitorDetails.visitor_category === 'speaker' && '🎤 Speaker'}
              {visitorDetails.visitor_category === 'vip' && '⭐ VIP'}
            </span>
          )}
        </div>

        {/* Divider */}
        <div className="border-t border-gray-200"></div>

        {/* Event & Dates */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {visitorDetails?.event_name && (
            <div className="text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Event</p>
              <p className="text-sm text-gray-700 mt-0.5">{visitorDetails.event_name}</p>
            </div>
          )}

          {visitorDetails?.date_of_visit_from && visitorDetails?.date_of_visit_to && (
            <div className="text-left">
              <p className="text-xs text-gray-400 uppercase tracking-wider font-medium">Valid Period</p>
              <p className="text-sm text-gray-700 mt-0.5">
                {new Date(visitorDetails.date_of_visit_from).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short'
                })} - {new Date(visitorDetails.date_of_visit_to).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </p>
            </div>
          )}
        </div>

        {/* Visitor ID */}
        <div className="pt-2 border-t border-gray-200">
          <p className="text-xs text-gray-400 text-center">
            ID: <span className="font-mono text-gray-500">{visitorId}</span>
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3">
        <button
          onClick={downloadPDF}
          className="w-full bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 shadow-md hover:shadow-lg"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>Download PDF Pass</span>
        </button>
        
        <button
          onClick={downloadQR}
          className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3.5 px-6 rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 border border-gray-200"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <span>Download QR Image</span>
        </button>

        <div className="flex flex-col sm:flex-row gap-3 pt-3 border-t border-gray-100">
          <a
            href="/retrieve-qr"
            className="flex-1 text-center text-gray-500 hover:text-primary-600 font-medium py-2 text-sm inline-flex items-center justify-center space-x-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Retrieve Later</span>
          </a>
          <a
            href="/"
            className="flex-1 text-center text-gray-500 hover:text-primary-600 font-medium py-2 text-sm inline-flex items-center justify-center space-x-1.5 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
            <span>Return Home</span>
          </a>
        </div>
      </div>

      {/* Important Notice */}
      <div className="mt-6 p-4 bg-amber-50 border border-amber-200 rounded-xl">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="text-left">
            <p className="font-semibold text-gray-700 text-sm">Save your pass</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Download or screenshot this QR code for entry at the security gate.
            </p>
          </div>
        </div>
      </div>

      {/* Powered by Socio */}
      <div className="mt-6 pt-4 border-t border-gray-100 flex flex-col items-center">
        <p className="text-[10px] text-gray-400 mb-1">Powered by</p>
        <Image
          src="/socio.png"
          alt="Socio"
          width={70}
          height={26}
          className="object-contain opacity-50 hover:opacity-80 transition-opacity"
        />
      </div>
    </motion.div>
  );
}
