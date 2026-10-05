'use client';

import React from 'react';
import { Flag } from 'lucide-react';

interface FooterProps {
  onReportIssueClick: () => void;
}

export function Footer({ onReportIssueClick }: FooterProps) {
  return (
    <footer className="border-t border-slate-200 bg-white px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
        <div className="flex items-center gap-2">
          <span className="font-medium text-slate-700">Tambyte</span>
          <span aria-hidden="true">·</span>
          <span>Campus Study &amp; Tambyte Map Foundation (Phase 1)</span>
        </div>

        <div className="flex items-center gap-4">
          {/* "Report an issue" link placeholder */}
          {/* PHASE 2 NOTE: Connect to student feedback modal / Supabase issue reports table */}
          <button
            type="button"
            onClick={onReportIssueClick}
            className="group flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-slate-600 hover:text-emerald-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            <Flag className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" aria-hidden="true" />
            <span className="underline decoration-slate-300 underline-offset-4 group-hover:decoration-emerald-600">
              Report an issue
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
