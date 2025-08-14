import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

const Header = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const handleLogout = () => {
    // Add logout logic here if needed
    try {
      localStorage.removeItem('token');
    } catch {}
    navigate('/');
  };

  return (
    <header className="bg-[rgb(4,26,71)] text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Login Page Layout - Centered Title Only */}
          {location.pathname === '/' && (
            <div className="w-full grid grid-cols-3 items-center">
              {/* Left: Brand Logo */}
              <div className="justify-self-start flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/Logo (1).svg"
                  alt="Face Verification App Logo"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
              </div>

              {/* Center: Title */}
              <div className="justify-self-center">
                <h1 className="text-xl font-bold text-white">
                  Face Verification App
                </h1>
              </div>

              {/* Right: empty to keep center perfectly centered */}
              <div className="justify-self-end" />
            </div>
          )}

          {/* Dashboard Layout - Logo, Centered Title, Logout */}
          {location.pathname === '/dashboard' && (
            <>
              {/* Logo on the left */}
              <div className="flex items-center">
                <img
                  className="h-8 w-auto"
                  src="/Logo (1).svg"
                  alt="Face Verification App Logo"
                  onLoad={(e) => {
                    e.target.style.display = 'block';
                  }}
                  onError={(e) => {
                    e.target.style.display = 'none';
                    console.log('Logo failed to load');
                  }}
                />
              </div>

              {/* Centered title */}
              <div className="flex-1 flex justify-center">
                <h1 className="text-xl font-bold text-white">
                  Face Verification App
                </h1>
              </div>

              {/* Logout button on the right */}
              <div className="flex items-center">
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 text-sm font-medium text-white hover:bg-white/10 rounded-md transition-colors duration-200"
                >
                  Logout
                </button>
              </div>
            </>
          )}

          {/* Mobile menu button - only show on dashboard */}
          {location.pathname === '/dashboard' && (
            <div className="md:hidden">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-white hover:text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-white/30"
                aria-expanded="false"
              >
                <span className="sr-only">Open main menu</span>
                {/* Icon when menu is closed */}
                <svg
                  className={`${isMobileMenuOpen ? 'hidden' : 'block'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
                {/* Icon when menu is open */}
                <svg
                  className={`${isMobileMenuOpen ? 'block' : 'hidden'} h-6 w-6`}
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Mobile menu - only for dashboard */}
      {location.pathname === '/dashboard' && (
        <div className={`${isMobileMenuOpen ? 'block' : 'hidden'} md:hidden`}>
          <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3 bg-[rgb(4,26,71)] border-t border-white/10">
            <button
              onClick={handleLogout}
              className="block w-full text-left px-3 py-2 text-base font-medium text-white hover:text-white hover:bg-white/10 rounded-md transition-colors duration-200"
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
