import React from 'react';
import { User, LogOut, SlidersHorizontal, X, ShieldCheck, } from 'lucide-react';

interface NavbarProps {
  isAdmin?: boolean;
  onAdminLoginClick: () => void;
  onAdminDashboardClick?: () => void;
  onAdminLogoutClick?: () => void;
  onShareSpotClick?: () => void; // New prop for students to contribute
  isFilterOpenOnMobile: boolean;
  onToggleMobileFilters: () => void;
}

function TambyteLogoMark() {
  return (
    <svg
      viewBox="0 0 48 48"
      className="h-5 w-5"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="24" cy="24" r="19" stroke="currentColor" strokeWidth="2.7" />
      <path
        d="M11.5 35.5 18.1 20.7 35.7 12.3 28.2 29.8 11.5 35.5Z"
        fill="currentColor"
        stroke="currentColor"
        strokeLinejoin="round"
        strokeWidth="1.5"
      />
      <ellipse
        cx="23.7"
        cy="24"
        rx="4.2"
        ry="7.2"
        transform="rotate(43 23.7 24)"
        fill="#970023"
        stroke="#970023"
        strokeWidth="1"
      />
      <path
        d="M19 29.1c3.1-1.3 6-4.5 8.7-9.4"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.2"
      />
    </svg>
  );
}

export function Navbar({
  isAdmin = false,
  onAdminLoginClick,
  onAdminDashboardClick,
  onAdminLogoutClick,
  onShareSpotClick,
  isFilterOpenOnMobile,
  onToggleMobileFilters,
}: NavbarProps) {
  return (
    <header className="cat-pattern-background brand-header sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6">
       <div className="flex items-center gap-3">
        <a
          href="/"
          className="group flex items-center gap-1.5 text-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy focus-visible:ring-offset-2 rounded-lg"
          aria-label="Tambyte Home"
        >
          {/* Logo Red (Snug fit) */}
          <div className="flex h-9 w-10 shrink-0 items-center justify-center -translate-y-0.5 transition-transform duration-150 group-hover:scale-105">
            <img
              src="/logo-red.png"
              alt="Tambyte Red Logo"
              className="h-full w-full object-contain drop-shadow-sm"
            />
          </div>
          {/* Clean Typography Lockup */}
          <div className="flex flex-col justify-center">
            <span className="text-xl font-bold tracking-normal text-white leading-none font-brand">
              Tambyte
            </span>
            <span className="text-[9.5px] font-semibold tracking-[0.14em] text-rose-200/90 mt-1 leading-none uppercase">
              Grab A Byte &amp; Tambay Maps
            </span>
          </div>  
        </a>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1 sm:gap-3">
       {/*<button
          type="button"
          onClick={onShareSpotClick}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gold/50 bg-deep-crimson text-white shadow-sm transition-colors hover:bg-dark-burgundy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
          aria-label="Add a spot"
          title="Add a spot"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" aria-hidden="true" />
        </button>
        
        upper left button

        */}

        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={onToggleMobileFilters}
          className="flex min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 max-[380px]:px-2.5 md:hidden"
          aria-label={isFilterOpenOnMobile ? 'Close filters' : 'Open filters'}
        >
          {isFilterOpenOnMobile ? (
            <>
              <X className="h-4 w-4" />
              <span className="max-[380px]:hidden">Close</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-4 w-4 text-dark-burgundy" />
              <span className="max-[380px]:hidden">Filters</span>
            </>
          )}
        </button>


        {/* When Logged In as Admin vs Visitor */}
        {isAdmin ? (
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={onAdminDashboardClick}
              className="flex h-10 w-10 items-center justify-center gap-1.5 rounded-xl bg-dark-burgundy px-0 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-deep-maroon sm:h-auto sm:w-auto sm:min-h-[40px] sm:px-3.5 sm:py-1.5"
              aria-label="Manage Spots"
              title="Manage Spots"
            >
              <ShieldCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Manage Spots</span>
            </button>

            <button
              type="button"
              onClick={onAdminLogoutClick}
              className="flex h-10 w-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-0 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 sm:h-auto sm:w-auto sm:min-h-[40px] sm:px-3 sm:py-1.5"
              aria-label="Sign Out"
              title="Sign Out"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdminLoginClick}
            className="flex h-10 w-10 items-center justify-center gap-2 rounded-xl bg-deep-maroon px-0 text-xs font-semibold text-white shadow-sm transition-all hover:bg-dark-burgundy active:scale-[0.98] sm:h-auto sm:w-auto sm:min-h-[40px] sm:px-4 sm:py-2"
            aria-label="Admin Login"
            title="Admin Login"
          >
            <User className="h-3.5 w-3.5 text-slate-300" />
            <span className="hidden whitespace-nowrap sm:inline">Admin Login</span>
          </button>
        )}
      </div>
    </header>
  );
}