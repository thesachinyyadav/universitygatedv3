import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import type { UserRole } from '@/types/database';

export default function Navbar() {
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [showLoginDropdown, setShowLoginDropdown] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  useEffect(() => {
    // Check if user is logged in
    const userData = localStorage.getItem('user');
    if (userData) {
      const user = JSON.parse(userData);
      setIsLoggedIn(true);
      setUserRole(user.role);
    }
  }, [router.pathname]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    setIsLoggedIn(false);
    setUserRole(null);
    router.push('/');
    setShowMobileMenu(false);
  };

  const getRoleDashboard = () => {
    switch (userRole) {
      case 'guard':
        return '/guard';
      case 'organiser':
        return '/organiser';
      case 'cso':
        return '/cso';
      default:
        return '/';
    }
  };

  return (
    <nav className="bg-primary-600 text-white shadow-lg sticky top-0 z-50">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo and Title */}
          <Link href="/" className="flex items-center space-x-2 md:space-x-3 hover:opacity-90 transition">
            <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full p-1 md:p-2 flex items-center justify-center shadow-lg">
              <Image
                src="/christunifavcion.png"
                alt="Christ University"
                width={48}
                height={48}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-base md:text-xl font-bold leading-tight">Christ University</h1>
              <p className="text-xs text-tertiary-200">Gated Access Portal</p>
            </div>
            <div className="sm:hidden">
              <h1 className="text-base font-bold">Christ Gated</h1>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-4">
            {isLoggedIn ? (
              <>
                <Link
                  href={getRoleDashboard()}
                  className="px-4 py-2 hover:bg-primary-700 rounded-lg transition flex items-center space-x-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="capitalize">{userRole} Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="px-6 py-2 bg-tertiary-600 hover:bg-tertiary-700 rounded-lg transition flex items-center space-x-2 font-semibold shadow-md"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="relative">
                <button
                  onClick={() => setShowLoginDropdown(!showLoginDropdown)}
                  className="px-6 py-2 bg-tertiary-600 hover:bg-tertiary-700 rounded-lg transition font-semibold shadow-md active:scale-95"
                >
                  Login
                </button>

                {/* Login Dropdown */}
                {showLoginDropdown && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-2xl py-2 text-gray-800 border border-gray-100">
                    <div className="px-4 py-3 text-xs text-gray-500 font-semibold border-b border-gray-100">
                      Select Your Role
                    </div>
                    <Link
                      href="/visitor-register"
                      className="block px-4 py-3 hover:bg-primary-50 transition flex items-center space-x-3"
                      onClick={() => setShowLoginDropdown(false)}
                    >
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <span>Visitor / Participant</span>
                    </Link>
                    <Link
                      href="/login?role=guard"
                      className="block px-4 py-3 hover:bg-primary-50 transition flex items-center space-x-3"
                      onClick={() => setShowLoginDropdown(false)}
                    >
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                      </svg>
                      <span>Security Guard</span>
                    </Link>
                    <Link
                      href="/login?role=organiser"
                      className="block px-4 py-3 hover:bg-primary-50 transition flex items-center space-x-3"
                      onClick={() => setShowLoginDropdown(false)}
                    >
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                      </svg>
                      <span>Event Organiser</span>
                    </Link>
                    <Link
                      href="/login?role=cso"
                      className="block px-4 py-3 hover:bg-primary-50 transition flex items-center space-x-3 border-t border-gray-100"
                      onClick={() => setShowLoginDropdown(false)}
                    >
                      <svg className="w-5 h-5 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                      <span>Chief Security Officer</span>
                    </Link>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setShowMobileMenu(!showMobileMenu)}
            className="md:hidden p-2 hover:bg-primary-700 rounded-lg transition"
          >
            {showMobileMenu ? (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {showMobileMenu && (
          <div className="md:hidden pb-4 space-y-2">
            {isLoggedIn ? (
              <>
                <Link
                  href={getRoleDashboard()}
                  className="block w-full px-4 py-3 hover:bg-primary-700 rounded-lg transition flex items-center space-x-3"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span className="capitalize">{userRole} Dashboard</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full px-4 py-3 bg-tertiary-600 hover:bg-tertiary-700 rounded-lg transition flex items-center space-x-3 font-semibold"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  <span>Logout</span>
                </button>
              </>
            ) : (
              <div className="space-y-2">
                <div className="px-4 py-2 text-xs text-tertiary-200 font-semibold">
                  Select Your Role
                </div>
                <Link
                  href="/visitor-register"
                  className="block w-full px-4 py-3 hover:bg-primary-700 rounded-lg transition flex items-center space-x-3"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                  </svg>
                  <span>Visitor / Participant</span>
                </Link>
                <Link
                  href="/login?role=guard"
                  className="block w-full px-4 py-3 hover:bg-primary-700 rounded-lg transition flex items-center space-x-3"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                  <span>Security Guard</span>
                </Link>
                <Link
                  href="/login?role=organiser"
                  className="block w-full px-4 py-3 hover:bg-primary-700 rounded-lg transition flex items-center space-x-3"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                  <span>Event Organiser</span>
                </Link>
                <Link
                  href="/login?role=cso"
                  className="block w-full px-4 py-3 hover:bg-primary-700 rounded-lg transition flex items-center space-x-3 border-t border-primary-500"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                  </svg>
                  <span>Chief Security Officer</span>
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
