import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import QRScanner from '@/components/QRScanner';
import ManualEntry from '@/components/ManualEntry';
import type { Visitor } from '@/types/database';

interface ScanHistoryItem {
  id: string;
  timestamp: Date;
  verified: boolean;
  visitor?: Partial<Visitor>;
}

interface NotificationProps {
  verified: boolean;
  visitorName?: string;
  dateError?: string;
}

export default function GuardDashboard() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [verificationResult, setVerificationResult] = useState<{
    verified: boolean;
    visitor?: Partial<Visitor>;
    dateError?: string;
  } | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [scanHistory, setScanHistory] = useState<ScanHistoryItem[]>([]);
  const [selectedVisitor, setSelectedVisitor] = useState<Partial<Visitor> | null>(null);
  const [notification, setNotification] = useState<NotificationProps | null>(null);

  useEffect(() => {
    const userData = localStorage.getItem('user');
    if (!userData) {
      router.push('/login?role=guard');
      return;
    }
    const parsedUser = JSON.parse(userData);
    if (parsedUser.role !== 'guard') {
      router.push('/');
      return;
    }
    setUser(parsedUser);
  }, [router]);

  const handleScan = async (visitorId: string) => {
    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const guardUsername = user?.username || 'unknown';
      console.log(`[GUARD] Verifying visitor ${visitorId} as guard: ${guardUsername}`);
      
      const response = await fetch(`/api/verifyVisitor?id=${encodeURIComponent(visitorId)}&guard_username=${encodeURIComponent(guardUsername)}`);
      const data = await response.json();
      
      console.log('[GUARD] Verification result:', data);

      setVerificationResult(data);
      
      // Show notification
      setNotification({
        verified: data.verified,
        visitorName: data.visitor?.name,
        dateError: data.dateError
      });
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setNotification(null);
      }, 4000);
      
      // Add to scan history
      const historyItem: ScanHistoryItem = {
        id: visitorId,
        timestamp: new Date(),
        verified: data.verified,
        visitor: data.visitor
      };
      setScanHistory(prev => [historyItem, ...prev]); // Add to top of list
      
      // Auto-clear result after 3 seconds for continuous scanning
      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);
    } catch (error) {
      console.error('Verification error:', error);
      setVerificationResult({ verified: false });
      
      // Show error notification
      setNotification({
        verified: false
      });
      
      // Auto-hide notification after 4 seconds
      setTimeout(() => {
        setNotification(null);
      }, 4000);
      
      // Add failed scan to history
      const historyItem: ScanHistoryItem = {
        id: visitorId,
        timestamp: new Date(),
        verified: false
      };
      setScanHistory(prev => [historyItem, ...prev]);
      
      // Auto-clear error after 3 seconds
      setTimeout(() => {
        setVerificationResult(null);
      }, 3000);
    } finally {
      setIsVerifying(false);
    }
  };

  const clearHistory = () => {
    setScanHistory([]);
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-3 sm:py-4 md:py-6 px-3 sm:px-4">
      <div className="container mx-auto max-w-6xl">
        <div className="mb-3 sm:mb-4">
          <h1 className="text-lg sm:text-xl font-bold text-primary-600 mb-1 flex items-center space-x-2">
            <svg className="w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="text-base sm:text-lg md:text-xl">Security Guard Dashboard</span>
          </h1>
          <p className="text-gray-600 text-xs sm:text-sm">
            Welcome, <strong>{user.username}</strong> | Scan QR to verify
          </p>
        </div>

        <div className="space-y-3 sm:space-y-4">
          {/* 1. Scan QR Code */}
          <QRScanner onScan={handleScan} />

          {/* 2. Scan History */}
          <div className="card p-3 sm:p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
                <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                  Scan History
                  {scanHistory.length > 0 && (
                    <span className="ml-2 text-xs sm:text-sm font-normal text-gray-500">
                      ({scanHistory.length})
                    </span>
                  )}
                </h3>
              </div>
              {scanHistory.length > 0 && (
                <button
                  onClick={clearHistory}
                  className="text-xs sm:text-sm text-red-600 hover:text-red-700 font-medium px-3 py-1 rounded-lg hover:bg-red-50 transition"
                >
                  Clear
                </button>
              )}
            </div>

            {scanHistory.length === 0 ? (
              <div className="text-center py-4 text-gray-400">
                <svg className="w-10 h-10 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-xs">No scans yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                <AnimatePresence>
                  {scanHistory.map((item, index) => (
                    <motion.div
                      key={`${item.id}-${item.timestamp.getTime()}`}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      transition={{ duration: 0.2 }}
                      onClick={() => item.visitor && setSelectedVisitor(item.visitor as Visitor)}
                      className={`p-2 rounded-lg border-2 cursor-pointer hover:shadow-md transition ${
                        item.verified
                          ? 'bg-green-50 border-green-200 hover:bg-green-100'
                          : 'bg-red-50 border-red-200 hover:bg-red-100'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {/* Photo */}
                        {item.visitor?.photo_url ? (
                          <img 
                            src={item.visitor.photo_url} 
                            alt={item.visitor.name}
                            className="w-10 h-10 rounded-full object-cover border-2 border-white shadow-sm flex-shrink-0"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                          </div>
                        )}
                        
                        {/* Visitor Info */}
                        <div className="flex-1 min-w-0">
                          {item.visitor ? (
                            <>
                              <p className="font-semibold text-gray-800 text-xs truncate">
                                {item.visitor.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {item.visitor.event_name || 'No event'} • {item.timestamp.toLocaleTimeString()}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="font-medium text-red-600 text-xs">
                                Invalid ID
                              </p>
                              <p className="text-xs text-gray-500">
                                {item.timestamp.toLocaleTimeString()}
                              </p>
                            </>
                          )}
                        </div>

                        {/* Status Badge */}
                        <span className={`text-xs px-2 py-1 rounded-full font-semibold flex-shrink-0 ${
                          item.verified
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {item.verified ? '✓' : '✗'}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* 3. Current Scan Result */}
          <div className="card p-3 sm:p-4">
            <h3 className="text-base sm:text-lg font-semibold text-gray-800 mb-2 sm:mb-3 flex items-center space-x-2">
              <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span>Current Scan</span>
            </h3>

              {isVerifying && (
                <div className="text-center py-6 sm:py-8">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-maroon-600 mx-auto mb-3"></div>
                  <p className="text-gray-600 text-xs sm:text-sm">Verifying...</p>
                </div>
              )}

              {!isVerifying && !verificationResult && (
                <div className="text-center py-6 sm:py-8 text-gray-400">
                  <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                  <p className="text-xs sm:text-sm">Scan QR to verify</p>
                </div>
              )}

              {!isVerifying && verificationResult && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center"
                >
                  {verificationResult.verified ? (
                    <div className="bg-green-50 border-2 border-green-500 rounded-lg p-3 sm:p-4 md:p-6">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h2 className="text-lg sm:text-xl font-bold text-green-700 mb-2 sm:mb-3">
                        ACCESS GRANTED
                      </h2>
                      
                      {/* Visitor Photo */}
                      {verificationResult.visitor?.photo_url && (
                        <div className="flex justify-center mb-3">
                          <img 
                            src={verificationResult.visitor.photo_url} 
                            alt={verificationResult.visitor.name}
                            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover border-4 border-green-500 shadow-lg"
                          />
                        </div>
                      )}
                      
                      {verificationResult.visitor && (
                        <div className="space-y-1.5 text-left bg-white p-2 sm:p-3 rounded-lg text-xs sm:text-sm">
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold">Name:</span>
                            <span className="text-right break-words">{verificationResult.visitor.name}</span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold">Event:</span>
                            <span className="text-right break-words">{verificationResult.visitor.event_name || 'N/A'}</span>
                          </div>
                          {verificationResult.visitor.register_number && (
                            <div className="flex justify-between gap-2">
                              <span className="font-semibold">Register No:</span>
                              <span className="text-right font-mono text-primary-600">{verificationResult.visitor.register_number}</span>
                            </div>
                          )}
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold">Date:</span>
                            <span className="text-right">
                              {verificationResult.visitor.date_of_visit
                                ? new Date(verificationResult.visitor.date_of_visit).toLocaleDateString()
                                : 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between gap-2">
                            <span className="font-semibold">Status:</span>
                            <span className={`badge-${verificationResult.visitor.status}`}>
                              {verificationResult.visitor.status?.toUpperCase()}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-red-50 border-2 border-red-500 rounded-lg p-3 sm:p-4 md:p-6">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-2 sm:mb-3 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <h2 className="text-lg sm:text-xl font-bold text-red-700 mb-2 sm:mb-3">
                        ACCESS DENIED
                      </h2>
                      <p className="text-red-600 text-xs sm:text-sm font-semibold">
                        {verificationResult.dateError || 'Invalid QR or access revoked'}
                      </p>
                    </div>
                  )}

                  <button
                    onClick={() => setVerificationResult(null)}
                    className="mt-3 sm:mt-4 btn-secondary w-full text-xs sm:text-sm py-2.5"
                  >
                    Continue Scanning
                  </button>
                </motion.div>
              )}
            </div>

          {/* 4. Manual Entry */}
          <ManualEntry onVerify={handleScan} />
        </div>
      </div>

      {/* Visitor Details Modal */}
      <AnimatePresence>
        {selectedVisitor && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedVisitor(null)}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white p-6 rounded-t-2xl">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold">Visitor Details</h2>
                  <button
                    onClick={() => setSelectedVisitor(null)}
                    className="text-white hover:bg-white/20 rounded-full p-2 transition"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Photo */}
              <div className="p-6">
                <div className="flex justify-center mb-6">
                  {selectedVisitor.photo_url ? (
                    <img 
                      src={selectedVisitor.photo_url} 
                      alt={selectedVisitor.name}
                      className="w-32 h-32 rounded-full object-cover border-4 border-primary-200 shadow-lg"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center border-4 border-gray-300">
                      <svg className="w-16 h-16 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Name</label>
                    <p className="text-lg font-bold text-gray-800">{selectedVisitor.name}</p>
                  </div>

                  {selectedVisitor.register_number && (
                    <div className="bg-primary-50 -mx-6 px-6 py-3 border-l-4 border-primary-600">
                      <p className="text-base font-extrabold text-primary-900 mb-1">
                        ID NUMBER
                      </p>
                      <p className="text-2xl font-black text-primary-600 font-mono tracking-wide">
                        {selectedVisitor.register_number}
                      </p>
                    </div>
                  )}

                  {selectedVisitor.email && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Email</label>
                      <p className="text-gray-700">{selectedVisitor.email}</p>
                    </div>
                  )}

                  {selectedVisitor.phone && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Phone</label>
                      <p className="text-gray-700">{selectedVisitor.phone}</p>
                    </div>
                  )}

                  {selectedVisitor.event_name && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Event</label>
                      <p className="text-gray-700">{selectedVisitor.event_name}</p>
                    </div>
                  )}

                  {selectedVisitor.visitor_category && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Category</label>
                      <p className="text-gray-700 capitalize">{selectedVisitor.visitor_category}</p>
                    </div>
                  )}

                  {(selectedVisitor.date_of_visit_from && selectedVisitor.date_of_visit_to) && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Visit Period</label>
                      <p className="text-gray-700">
                        {new Date(selectedVisitor.date_of_visit_from).toLocaleDateString()} - {new Date(selectedVisitor.date_of_visit_to).toLocaleDateString()}
                      </p>
                    </div>
                  )}

                  {selectedVisitor.purpose && (
                    <div>
                      <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Purpose</label>
                      <p className="text-gray-700">{selectedVisitor.purpose}</p>
                    </div>
                  )}

                  <div>
                    <label className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Status</label>
                    <span className={`inline-block mt-1 px-3 py-1 rounded-full text-sm font-semibold ${
                      selectedVisitor.status === 'approved' 
                        ? 'bg-green-100 text-green-700'
                        : selectedVisitor.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedVisitor.status?.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* Close Button */}
                <button
                  onClick={() => setSelectedVisitor(null)}
                  className="mt-6 w-full bg-primary-600 hover:bg-primary-700 text-white font-semibold py-3 rounded-lg transition"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Notification Toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, x: 300 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 300 }}
            transition={{ duration: 0.3 }}
            className="fixed top-4 right-4 z-50 max-w-sm"
          >
            <div className={`rounded-lg shadow-2xl border-2 overflow-hidden ${
              notification.verified 
                ? 'bg-green-50 border-green-500' 
                : 'bg-red-50 border-red-500'
            }`}>
              <div className="p-4 flex items-start space-x-3">
                {/* Icon */}
                <div className={`flex-shrink-0 ${
                  notification.verified ? 'text-green-500' : 'text-red-500'
                }`}>
                  {notification.verified ? (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  )}
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold text-sm ${
                    notification.verified ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {notification.verified ? 'ACCESS GRANTED ✓' : 'ACCESS DENIED ✗'}
                  </p>
                  {notification.visitorName && (
                    <p className="text-xs text-gray-700 mt-1 truncate">
                      {notification.visitorName}
                    </p>
                  )}
                  {!notification.verified && notification.dateError && (
                    <p className="text-xs text-red-700 mt-1 font-semibold">
                      {notification.dateError}
                    </p>
                  )}
                  {!notification.verified && !notification.visitorName && !notification.dateError && (
                    <p className="text-xs text-gray-700 mt-1">
                      Invalid QR Code
                    </p>
                  )}
                </div>

                {/* Close button */}
                <button
                  onClick={() => setNotification(null)}
                  className={`flex-shrink-0 rounded-full p-1 hover:bg-white/50 transition ${
                    notification.verified ? 'text-green-600' : 'text-red-600'
                  }`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              {/* Progress bar */}
              <motion.div
                initial={{ width: '100%' }}
                animate={{ width: '0%' }}
                transition={{ duration: 4, ease: 'linear' }}
                className={`h-1 ${
                  notification.verified ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
