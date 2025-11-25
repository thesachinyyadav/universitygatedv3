import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import type { Visitor } from '@/types/database';

export default function VerifyPage() {
  const router = useRouter();
  const { id } = router.query;
  const [visitor, setVisitor] = useState<Partial<Visitor> | null>(null);
  const [isVerified, setIsVerified] = useState<boolean | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (id && typeof id === 'string') {
      verifyVisitor(id);
    }
  }, [id]);

  const verifyVisitor = async (visitorId: string) => {
    try {
      const response = await fetch(`/api/verifyVisitor?id=${visitorId}`);
      const data = await response.json();

      setIsVerified(data.verified);
      setVisitor(data.visitor);
    } catch (error) {
      console.error('Verification error:', error);
      setIsVerified(false);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 sm:h-16 sm:w-16 border-b-2 border-maroon-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Verifying access...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-3 sm:px-4 py-4 sm:py-6">
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="card max-w-md w-full text-center p-3 sm:p-4 md:p-6"
      >
        {isVerified && visitor ? (
          <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 sm:p-4 md:p-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center mb-3"
            >
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <h1 className="text-xl sm:text-2xl font-bold text-green-700 mb-3 sm:mb-4">
              ACCESS GRANTED
            </h1>
            <div className="space-y-1.5 sm:space-y-2 text-left bg-white p-3 sm:p-4 rounded-lg text-xs sm:text-sm">
              <div className="flex justify-between border-b pb-2 gap-2">
                <span className="font-semibold text-gray-700">Name:</span>
                <span className="text-gray-900 text-right break-words">{visitor.name}</span>
              </div>
              
              {visitor.visitor_category && (
                <div className="flex justify-between border-b pb-2 gap-2 items-center">
                  <span className="font-semibold text-gray-700">Category:</span>
                  <span 
                    className="px-2 sm:px-3 py-1 rounded-full text-white text-xs font-semibold whitespace-nowrap"
                    style={{ backgroundColor: visitor.qr_color || '#254a9a' }}
                  >
                    {visitor.visitor_category === 'student' && '🎓 STUDENT'}
                    {visitor.visitor_category === 'speaker' && '🎤 SPEAKER'}
                    {visitor.visitor_category === 'vip' && '⭐ VIP'}
                  </span>
                </div>
              )}
              
              {visitor.event_name && (
                <div className="flex justify-between border-b pb-2 gap-2">
                  <span className="font-semibold text-gray-700">Event:</span>
                  <span className="text-gray-900 text-right break-words">{visitor.event_name}</span>
                </div>
              )}
              
              {visitor.date_of_visit_from && visitor.date_of_visit_to && (
                <div className="flex flex-col sm:flex-row sm:justify-between border-b pb-2 gap-1 sm:gap-2">
                  <span className="font-semibold text-gray-700">Valid Dates:</span>
                  <span className="text-gray-900 text-xs sm:text-sm">
                    {new Date(visitor.date_of_visit_from).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short' 
                    })} 
                    {' - '}
                    {new Date(visitor.date_of_visit_to).toLocaleDateString('en-IN', { 
                      day: 'numeric', 
                      month: 'short',
                      year: 'numeric'
                    })}
                  </span>
                </div>
              )}
              
              {visitor.date_of_visit && (
                <div className="flex justify-between border-b pb-2 gap-2">
                  <span className="font-semibold text-gray-700">Date:</span>
                  <span className="text-gray-900">
                    {new Date(visitor.date_of_visit).toLocaleDateString()}
                  </span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 gap-2">
                <span className="font-semibold text-gray-700">Status:</span>
                <span className={`badge-${visitor.status}`}>
                  {visitor.status?.toUpperCase()}
                </span>
              </div>
            </div>
            <div className="mt-3 sm:mt-4 p-2 sm:p-3 bg-white rounded-lg text-xs text-gray-600">
              <p>✓ Authorized for entry</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date().toLocaleTimeString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 sm:p-4 md:p-6">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="flex justify-center mb-3"
            >
              <svg className="w-16 h-16 sm:w-20 sm:h-20 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </motion.div>
            <h1 className="text-xl sm:text-2xl font-bold text-red-700 mb-3 sm:mb-4">
              ACCESS DENIED
            </h1>
            <p className="text-red-600 mb-2 sm:mb-3 text-xs sm:text-sm">
              QR code invalid or access revoked
            </p>
            <div className="bg-white p-2 sm:p-3 rounded-lg text-xs text-gray-600 flex items-start space-x-2">
              <svg className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p>Contact organiser if error</p>
            </div>
          </div>
        )}

        <button
          onClick={() => router.push('/')}
          className="mt-4 sm:mt-6 btn-secondary w-full text-xs sm:text-sm py-2.5"
        >
          Return Home
        </button>
      </motion.div>
    </div>
  );
}
