import React from 'react';
import { Compass, User, LogOut, SlidersHorizontal, X, ShieldCheck } from 'lucide-react';

interface NavbarProps {
  isAdmin?: boolean;
  onAdminLoginClick: () => void;
  onAdminDashboardClick?: () => void; // Click to open dashboard
  onAdminLogoutClick?: () => void;
  isFilterOpenOnMobile: boolean;
  onToggleMobileFilters: () => void;
}

export function Navbar({
  isAdmin = false,
  onAdminLoginClick,
  onAdminDashboardClick,
  onAdminLogoutClick,
  isFilterOpenOnMobile,
  onToggleMobileFilters,
}: NavbarProps) {
  return (
    <header className="cat-pattern-background brand-header sticky top-0 z-30 flex h-16 w-full items-center justify-between px-4 sm:px-6">
      {/* Brand title & logo */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="group flex items-center gap-2.5 text-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy focus-visible:ring-offset-2 rounded-lg"
          aria-label="Tambyte Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-deep-crimson text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-warm-cream leading-none">
              Tambyte
            </span>
            <span className="text-[11px] font-medium text-warm-cream mt-0.5 leading-none">
              Grab A Byte &amp; Tambay Maps
            </span>
          </div>
        </a>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Filter Toggle */}
        <button
          type="button"
          onClick={onToggleMobileFilters}
          className="flex md:hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900"
          aria-label={isFilterOpenOnMobile ? 'Close filters' : 'Open filters'}
        >
          {isFilterOpenOnMobile ? (
            <>
              <X className="h-4 w-4" />
              <span>Close</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-4 w-4 text-dark-burgundy" />
              <span>Filters</span>
            </>
          )}
        </button>

        {/* When Logged In as Admin vs Visitor */}
        {isAdmin ? (
          <div className="flex items-center gap-2">
            {/* THIS BUTTON OPENS YOUR ADMIN DASHBOARD */}
            <button
              type="button"
              onClick={onAdminDashboardClick}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl bg-dark-burgundy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-deep-maroon transition-colors"
            >
              <ShieldCheck className="h-4 w-4" />
              <span>Manage Spots</span>
            </button>

            {/* Logout Button */}
            <button
              type="button"
              onClick={onAdminLogoutClick}
              className="flex min-h-[40px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <LogOut className="h-3.5 w-3.5 text-slate-500" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onAdminLoginClick}
            className="flex min-h-[44px] items-center gap-2 rounded-xl bg-deep-maroon px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-dark-burgundy active:scale-[0.98]"
          >
            <User className="h-3.5 w-3.5 text-slate-300" />
            <span className="whitespace-nowrap">Admin Login</span>
          </button>
        )}
      </div>
    </header>
  );
}