import React from 'react';
import { Flag } from 'lucide-react';

interface FooterProps {
  onReportIssueClick: () => void;
}

export function Footer({ onReportIssueClick }: FooterProps) {
  return (
    <footer className="brand-footer px-4 py-3 sm:px-6">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-warm-cream/75">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wide text-warm-cream">Tambyte</span>
          <span className="text-gold" aria-hidden="true">·</span>
          <span>Campus Study &amp; Tambyte Map Foundation (Phase 2)</span>
        </div>

        <div className="flex items-center gap-4">
          {/* "Report an issue" link placeholder */}
          {/* PHASE 2 NOTE: Connect to student feedback modal / Supabase issue reports table */}
          <button
            type="button"
            onClick={onReportIssueClick}
            className="group flex min-h-[36px] items-center gap-1.5 rounded-lg px-2 text-xs font-medium text-warm-cream/85 hover:text-gold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <Flag className="h-3.5 w-3.5 text-gold/80 group-hover:text-gold transition-colors" aria-hidden="true" />
            <span className="underline decoration-warm-cream/40 underline-offset-4 group-hover:decoration-gold">
              Report an issue
            </span>
          </button>
        </div>
      </div>
    </footer>
  );
}
