'use client';

import React from 'react';
import { Compass, User, SlidersHorizontal, X } from 'lucide-react';

interface NavbarProps {
  onAdminLoginClick: () => void;
  isFilterOpenOnMobile: boolean;
  onToggleMobileFilters: () => void;
}

export function Navbar({
  onAdminLoginClick,
  isFilterOpenOnMobile,
  onToggleMobileFilters,
}: NavbarProps) {
  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur-md sm:px-6">
      {/* Zone 1: Brand title & logo */}
      <div className="flex items-center gap-3">
        <a
          href="/"
          className="group flex items-center gap-2.5 text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 rounded-lg"
          aria-label="Tambyte Home"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm transition-transform duration-150 group-hover:scale-105">
            <Compass className="h-5 w-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-slate-900 leading-none">
              Tambyte
            </span>
            <span className="text-[11px] font-medium text-slate-500 mt-0.5 leading-none">
              Campus Study &amp; Tambay Map
            </span>
          </div>
        </a>
      </div>

      {/* Zone 2 & 3: Mobile Filter Toggle and Admin Action */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Mobile Filter Toggle Button */}
        <button
          type="button"
          onClick={onToggleMobileFilters}
          className="flex md:hidden min-h-[44px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label={isFilterOpenOnMobile ? 'Close filters' : 'Open filters'}
          aria-expanded={isFilterOpenOnMobile}
        >
          {isFilterOpenOnMobile ? (
            <>
              <X className="h-4 w-4" aria-hidden="true" />
              <span>Close Filters</span>
            </>
          ) : (
            <>
              <SlidersHorizontal className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              <span>Filters</span>
            </>
          )}
        </button>

        {/* Admin Login Placeholder */}
        {/* PHASE 2 NOTE: Connect to Supabase Auth / campus single sign-on */}
        <button
          type="button"
          onClick={onAdminLoginClick}
          className="flex min-h-[44px] items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2"
        >
          <User className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />
          <span className="whitespace-nowrap">Admin Login</span>
        </button>
      </div>
    </header>
  );
}
