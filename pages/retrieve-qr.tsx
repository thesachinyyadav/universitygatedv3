import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { motion } from 'framer-motion';
import Image from 'next/image';
import QRGenerator from '../components/QRGenerator';
import { supabase } from '../lib/supabaseClient';

export default function RetrieveQR() {
  const router = useRouter();
  const { id: urlVisitorId } = router.query;

  const [searchMethod, setSearchMethod] = useState<'email' | 'phone'>('email');
  const [searchValue, setSearchValue] = useState('');
  const [visitorId, setVisitorId] = useState('');
  const [visitorName, setVisitorName] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If visitor ID is in URL, auto-fetch
    if (urlVisitorId && typeof urlVisitorId === 'string') {
      handleRetrieve(urlVisitorId, 'id');
    }
  }, [urlVisitorId]);

  const handleRetrieve = async (value?: string, method?: string) => {
    const searchVal = value || searchValue;
    const searchMeth = method || searchMethod;

    if (!searchVal) {
      setError('Please enter your details');
      return;
    }

    setError('');
    setLoading(true);

    try {
      let query = supabase.from('visitors').select('*');

      if (searchMeth === 'id') {
        query = query.eq('id', searchVal);
      } else if (searchMeth === 'email') {
        query = query.ilike('email', searchVal);
      } else if (searchMeth === 'phone') {
        query = query.ilike('phone', searchVal);
      }

      const { data, error: dbError } = await query.single();

      if (dbError || !data) {
        setError('No visitor found with that information. Please check and try again.');
        setLoading(false);
        return;
      }

      // Found visitor
      setVisitorId(data.id);
      setVisitorName(data.name);
      setShowQR(true);

    } catch (err) {
      console.error('[RETRIEVE_QR] Error:', err);
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setShowQR(false);
    setVisitorId('');
    setVisitorName('');
    setSearchValue('');
    setError('');
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      <div className="container mx-auto px-4 py-6 sm:py-8">
        {!showQR ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-md mx-auto"
          >
            <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-5 sm:p-8">
              {/* Icon */}
              <div className="text-center mb-5">
                <div className="w-16 h-16 mx-auto bg-gradient-to-br from-primary-500 to-primary-700 rounded-2xl flex items-center justify-center shadow-md">
                  <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                  </svg>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl font-bold text-center text-gray-800 mb-2">
                Retrieve Your QR Code
              </h1>
              <p className="text-center text-gray-500 text-sm mb-6">
                Enter your registration details to retrieve your access pass
              </p>

              {/* Search Method Tabs - Only Email and Phone */}
              <div className="flex space-x-2 mb-5 p-1 bg-gray-100 rounded-xl">
                <button
                  onClick={() => setSearchMethod('email')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    searchMethod === 'email'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span>Email</span>
                  </div>
                </button>
                <button
                  onClick={() => setSearchMethod('phone')}
                  className={`flex-1 py-2.5 px-3 rounded-lg font-medium text-sm transition-all duration-200 ${
                    searchMethod === 'phone'
                      ? 'bg-white text-gray-800 shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  <div className="flex items-center justify-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    <span>Phone</span>
                  </div>
                </button>
              </div>

              {/* Input Field */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {searchMethod === 'email' && 'Email Address'}
                  {searchMethod === 'phone' && 'Phone Number'}
                </label>
                <input
                  type={searchMethod === 'email' ? 'email' : 'tel'}
                  value={searchValue}
                  onChange={(e) => setSearchValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleRetrieve()}
                  placeholder={
                    searchMethod === 'email' ? 'your.email@example.com' :
                    '+91 1234567890'
                  }
                  className="input-field text-sm"
                  autoComplete={searchMethod === 'email' ? 'email' : 'tel'}
                  autoCapitalize="none"
                  autoCorrect="off"
                  spellCheck={false}
                  inputMode={searchMethod === 'email' ? 'email' : 'tel'}
                />
              </div>

              {/* Error Message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-start space-x-2"
                >
                  <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Retrieve Button */}
              <button
                onClick={() => handleRetrieve()}
                disabled={loading || !searchValue}
                className="w-full py-3.5 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-700 hover:to-primary-800 text-white font-semibold rounded-xl shadow-md hover:shadow-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching...
                  </span>
                ) : (
                  <span className="flex items-center justify-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <span>Retrieve QR Code</span>
                  </span>
                )}
              </button>

              {/* Info Box */}
              <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-xl">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-lg flex items-center justify-center flex-shrink-0">
                    <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700">How to retrieve</p>
                    <p className="text-xs text-gray-500 mt-1">
                      Enter the same {searchMethod} you used during registration.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Back Link */}
            <div className="text-center mt-6">
              <a href="/" className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center space-x-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Back to Home</span>
              </a>
            </div>

            {/* Powered by Socio */}
            <div className="mt-8 flex flex-col items-center justify-center">
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
        ) : (
          <div>
            <div className="max-w-4xl mx-auto mb-4">
              <button
                onClick={handleBack}
                className="text-primary-600 hover:text-primary-700 font-medium text-sm inline-flex items-center space-x-1"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                <span>Search Another</span>
              </button>
            </div>
            <QRGenerator visitorId={visitorId} visitorName={visitorName} />
          </div>
        )}
      </div>
    </div>
  );
}
