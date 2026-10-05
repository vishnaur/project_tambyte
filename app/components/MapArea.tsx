'use client';

import React from 'react';
import { MapPin, ZoomIn, ZoomOut, Layers } from 'lucide-react';

interface MapAreaProps {
  onSelectSampleSpot: () => void;
  selectedSpotId: string | null;
}

export function MapArea({ onSelectSampleSpot, selectedSpotId }: MapAreaProps) {
  return (
    <main
      className="relative flex-1 bg-slate-100/80 p-4 sm:p-6 lg:p-8 overflow-hidden flex flex-col"
      aria-label="Campus Interactive Map Viewport"
    >
      {/* 
        MAIN MAP CONTAINER 
        PHASE 2 NOTE: Hand-drawn SVG campus map will replace the placeholder contents here.
        SVG layers will include campus paths, building outlines, tree canopies, 
        and interactive <g> hotspot nodes dynamically loaded from Supabase.
      */}
      <div className="relative flex flex-1 flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-300 bg-slate-100 p-6 text-center transition-colors shadow-inner">
        {/* Subtle architectural grid pattern to represent the canvas space */}
        <div
          className="pointer-events-none absolute inset-0 rounded-2xl opacity-40"
          style={{
            backgroundImage:
              'radial-gradient(circle at 1px 1px, #94a3b8 1px, transparent 0)',
            backgroundSize: '24px 24px',
          }}
          aria-hidden="true"
        />

        {/* Floating placeholder map controls for Phase 2 visual indication */}
        <div className="absolute top-4 right-4 z-10 flex flex-col gap-1.5 rounded-xl border border-slate-200 bg-white/90 p-1.5 shadow-sm backdrop-blur-sm">
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Zoom In (Phase 2)"
            aria-label="Zoom In (Phase 2)"
          >
            <ZoomIn className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Zoom Out (Phase 2)"
            aria-label="Zoom Out (Phase 2)"
          >
            <ZoomOut className="h-4 w-4" aria-hidden="true" />
          </button>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            title="Toggle Map Layers (Phase 2)"
            aria-label="Toggle Map Layers (Phase 2)"
          >
            <Layers className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Center Canvas Placeholder Text */}
        <div className="relative z-10 max-w-md px-4">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-emerald-600 shadow-sm border border-slate-200/80">
            <MapPin className="h-7 w-7" aria-hidden="true" />
          </div>

          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-800">
            Map goes here
          </h1>

          <p className="mt-2 text-xs sm:text-sm leading-relaxed text-slate-500">
            Hand-drawn SVG campus map container (Phase 2). No external tile services
            or dependencies required.
          </p>

          {/* 
            SAMPLE SPOT MARKER BUTTON
            Demonstrates interaction flow: clicking reveals the Spot Details panel.
          */}
          <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              type="button"
              onClick={onSelectSampleSpot}
              className={`flex min-h-[44px] items-center gap-2 rounded-xl px-5 py-2.5 text-xs font-semibold shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600 focus-visible:ring-offset-2 ${
                selectedSpotId === 'sample-spot-1'
                  ? 'bg-emerald-700 text-white ring-2 ring-emerald-600 ring-offset-2'
                  : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95'
              }`}
            >
              <MapPin className="h-4 w-4" aria-hidden="true" />
              <span>Sample Spot: Main Library Steps</span>
            </button>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            Click marker above to test Spot Details panel interaction.
          </p>
        </div>
      </div>
    </main>
  );
}
