import React from 'react';
import { X, Clock, MapPin, Zap, Volume2, ShieldCheck } from 'lucide-react';

export interface SpotData {
  id: string;
  name: string;
  category: string;
  hours: string;
  locationDescription: string;
  noiseLevel: string;
  outletsAvailable: boolean;
}

interface SpotDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spot?: SpotData | null;
}

export function SpotDetailPanel({
  isOpen,
  onClose,
  spot,
}: SpotDetailPanelProps) {
  if (!isOpen) {
    return null;
  }

  // Fallback sample placeholder data if spot is null
  const activeSpot: SpotData = spot || {
    id: 'sample-spot-1',
    name: 'Main Library Veranda',
    category: 'Quiet Study',
    hours: '7:00 AM - 9:00 PM',
    locationDescription: '2nd Floor North Wing, beside the Old Academic Quad',
    noiseLevel: 'Low (Whisper zone)',
    outletsAvailable: true,
  };

  return (
    <>
      {/* Mobile Backdrop for bottom sheet */}
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* 
        SPOT DETAILS PANEL CONTAINER:
        - Mobile: Slide-up bottom sheet with top drag handle affordance
        - Desktop: Floating right-hand side panel card inside the viewport
        PHASE 2 NOTE: Dynamic props populated from Supabase `spots` and `spot_reviews` tables.
      */}
      <aside
        className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 md:absolute md:top-6 md:right-6 md:bottom-auto md:left-auto md:w-96 md:max-h-[calc(100%-3rem)] md:rounded-2xl md:border md:shadow-lg"
        aria-labelledby="spot-detail-title"
        role="dialog"
        aria-modal="true"
      >
        {/* Mobile Grab Handle Affordance */}
        <div
          className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 md:hidden"
          aria-hidden="true"
        />

        {/* Header: Title, Category Badge, and Close Button */}
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {/* Category badge */}
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200/60">
              {activeSpot.category}
            </span>
            <h2
              id="spot-detail-title"
              className="mt-2 text-lg sm:text-xl font-bold tracking-tight text-slate-900 truncate"
            >
              {activeSpot.name}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
            aria-label="Close spot details"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {/* Spot Attributes */}
        <div className="mt-5 space-y-3.5 border-t border-slate-100 pt-4 text-xs sm:text-sm text-slate-600">
          {/* Hours */}
          <div className="flex items-start gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-emerald-600 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Hours: </span>
              <span>{activeSpot.hours}</span>
            </div>
          </div>

          {/* Location details */}
          <div className="flex items-start gap-2.5">
            <MapPin className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Location: </span>
              <span>{activeSpot.locationDescription}</span>
            </div>
          </div>

          {/* Outlets */}
          <div className="flex items-start gap-2.5">
            <Zap className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Power Outlets: </span>
              <span>{activeSpot.outletsAvailable ? 'Available nearby' : 'None reported'}</span>
            </div>
          </div>

          {/* Noise Level */}
          <div className="flex items-start gap-2.5">
            <Volume2 className="h-4 w-4 shrink-0 text-slate-400 mt-0.5" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Noise Level: </span>
              <span>{activeSpot.noiseLevel}</span>
            </div>
          </div>
        </div>

        {/* Phase 2 Data Hook & Extensibility Note */}
        <div className="mt-6 rounded-xl bg-slate-50 border border-slate-200/80 p-3.5 text-xs text-slate-500">
          <div className="flex items-center gap-1.5 font-semibold text-slate-700 mb-1">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span>Phase 2 Extension Hook</span>
          </div>
          <p className="leading-relaxed">
            In Phase 2, student tips, photo galleries, live seat availability, and
            directions routing will render directly inside this detail sheet.
          </p>
        </div>

        {/* Primary Action Button (Proof of Pattern) */}
        <div className="mt-5">
          <button
            type="button"
            onClick={onClose}
            className="w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-slate-800 active:scale-[0.99] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          >
            Dismiss Details
          </button>
        </div>
      </aside>
    </>
  );
}
