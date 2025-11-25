import { motion } from 'framer-motion';
import Link from 'next/link';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-600 via-primary-700 to-primary-800">
      <div className="container mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
          {/* Compact Hero Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center text-white mb-6 sm:mb-8"
          >
            {/* Logo + Title - Inline on larger screens */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-3 sm:gap-4 mb-4 sm:mb-6">
              <div className="h-12 sm:h-14 md:h-16 bg-white rounded-lg px-3 sm:px-4 py-2 shadow-2xl flex items-center">
                <Image
                  src="/christunilogo.png"
                  alt="Christ University"
                  width={160}
                  height={50}
                  className="h-full w-auto object-contain"
                />
              </div>
              <div className="text-center md:text-left">
                <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold leading-tight">
                  Christ University
                </h1>
                <h2 className="text-sm sm:text-base md:text-lg font-light text-tertiary-200">
                  Gated Access Management
                </h2>
              </div>
            </div>

            {/* Tagline */}
            <p className="text-xs sm:text-sm md:text-base text-gray-200 max-w-xl mx-auto mb-4 sm:mb-6 px-4">
              Secure, efficient entry management for events and campus access
            </p>

            {/* Main CTA */}
            <Link href="/visitor-register">
              <motion.button
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
                className="bg-tertiary-600 hover:bg-tertiary-700 text-white font-bold text-sm sm:text-base md:text-lg px-6 sm:px-8 py-3 sm:py-3.5 rounded-lg inline-flex items-center space-x-2 shadow-2xl transition-all w-full sm:w-auto justify-center max-w-sm mx-auto"
              >
                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
                <span>Request Entry Access</span>
              </motion.button>
            </Link>

            {/* Retrieve QR Link */}
            <div className="mt-3 sm:mt-4">
              <Link href="/retrieve-qr">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  className="text-white/90 hover:text-white font-medium text-xs sm:text-sm inline-flex items-center space-x-2 border border-white/30 hover:border-white/50 px-4 py-2 rounded-lg transition-all backdrop-blur-sm bg-white/10"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <span>Retrieve Lost QR Code</span>
                </motion.button>
              </Link>
            </div>
          </motion.div>

          {/* Compact Features - 3 columns always */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4 max-w-4xl mx-auto mb-6 sm:mb-8 px-2">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="card bg-white/95 backdrop-blur text-center hover:shadow-lg transition-all p-3 sm:p-4"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-primary-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
                <svg className="text-primary-600 w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 mb-1">
                Quick Register
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">
                Instant QR access
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="card bg-white/95 backdrop-blur text-center hover:shadow-lg transition-all p-3 sm:p-4"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-tertiary-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
                <svg className="text-tertiary-600 w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 mb-1">
                Scan & Verify
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">
                Contactless entry
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="card bg-white/95 backdrop-blur text-center hover:shadow-lg transition-all p-3 sm:p-4"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 mx-auto bg-primary-100 rounded-lg flex items-center justify-center mb-2 sm:mb-3">
                <svg className="text-primary-600 w-5 h-5 sm:w-6 sm:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xs sm:text-sm md:text-base font-bold text-gray-800 mb-1">
                Secure Access
              </h3>
              <p className="text-[10px] sm:text-xs text-gray-600 leading-tight">
                Encrypted data
              </p>
            </motion.div>
          </div>

          {/* Compact How it Works */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="max-w-3xl mx-auto card bg-white/90 backdrop-blur p-4 sm:p-5 md:p-6 mb-6 sm:mb-8"
          >
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-center text-primary-600 mb-4 sm:mb-5">
              How It Works
            </h3>
            <div className="flex justify-between items-start gap-2 sm:gap-4">
              <div className="flex-1 text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-lg flex items-center justify-center text-sm sm:text-base font-bold mb-2 shadow-md">
                  1
                </div>
                <h4 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm">Register</h4>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  Fill quick form
                </p>
              </div>
              <div className="flex items-center pt-4">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex-1 text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto bg-gradient-to-br from-tertiary-600 to-tertiary-700 text-white rounded-lg flex items-center justify-center text-sm sm:text-base font-bold mb-2 shadow-md">
                  2
                </div>
                <h4 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm">Download</h4>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  Get QR pass
                </p>
              </div>
              <div className="flex items-center pt-4">
                <svg className="w-3 h-3 sm:w-4 sm:h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
              <div className="flex-1 text-center">
                <div className="w-8 h-8 sm:w-10 sm:h-10 mx-auto bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-lg flex items-center justify-center text-sm sm:text-base font-bold mb-2 shadow-md">
                  3
                </div>
                <h4 className="font-semibold text-gray-800 mb-1 text-xs sm:text-sm">Enter</h4>
                <p className="text-[10px] sm:text-xs text-gray-600">
                  Show at gate
                </p>
              </div>
            </div>
          </motion.div>

          {/* Compact Security Image Section */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="max-w-3xl mx-auto mb-6 sm:mb-8 px-2"
          >
            <div className="card overflow-hidden">
              <div className="relative w-full h-32 sm:h-48 md:h-64">
                <Image
                  src="/securityimage.jpg"
                  alt="Campus Security"
                  fill
                  className="object-cover"
                />
              </div>
              <div className="p-3 sm:p-4 bg-white">
                <h3 className="text-sm sm:text-base md:text-lg font-bold text-primary-600 mb-1 sm:mb-2">
                  Campus Safety & Security
                </h3>
                <p className="text-gray-600 mb-2 sm:mb-3 text-xs sm:text-sm leading-relaxed">
                  Christ University provides a safe environment for all students, faculty, and visitors.
                </p>
                <a
                  href="https://christuniversity.in/view-pdf/safety-and-security-of-students-on-campus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1.5 text-primary-600 hover:text-primary-700 font-semibold transition-colors text-xs sm:text-sm"
                >
                  <svg className="w-3 h-3 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Full Safety Policy</span>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </motion.div>

          {/* Compact Footer */}
          <div className="mt-6 sm:mt-8 text-center text-white/80 text-[10px] sm:text-xs px-4">
            <p>© 2025 Christ University • Secure Gated Access Management</p>
          </div>
        </div>
      </div>
  );
}
