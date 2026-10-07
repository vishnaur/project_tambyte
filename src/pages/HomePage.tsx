import React, { useState } from 'react';
import { Navbar } from '../components/Navbar';
import { FilterPanel, FilterState } from '../components/FilterPanel';
import { MapArea } from '../components/MapArea';
import { SpotDetailPanel, SpotData } from '../components/SpotDetailPanel';
import { Footer } from '../components/Footer';
import { X, ShieldAlert, AlertCircle } from 'lucide-react';

export default function HomePage() {
  // Mobile filter drawer visibility state
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Spot detail bottom sheet/panel state
  const [selectedSpot, setSelectedSpot] = useState<SpotData | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // Interactive feedback dialogs for placeholder buttons (Admin & Report)
  const [activeModal, setActiveModal] = useState<'admin' | 'report' | null>(null);

  // Sample spot mock data to prove the SpotDetailPanel interaction works
  const sampleSpot: SpotData = {
    id: 'sample-spot-1',
    name: 'Main Library Veranda',
    category: 'Quiet Study',
    hours: '7:00 AM - 9:00 PM',
    locationDescription: '2nd Floor North Wing, beside the Old Academic Quad',
    noiseLevel: 'Low (Whisper zone)',
    outletsAvailable: true,
  };

  const handleSelectSampleSpot = () => {
    setSelectedSpot(sampleSpot);
    setIsDetailOpen(true);
    // On mobile, close filter drawer if open so user sees spot details
    setIsMobileFilterOpen(false);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
  };

  const handleFilterChange = (filters: FilterState) => {
    // PHASE 2 NOTE: Connect filter state to live Supabase query
    // Example: supabase.from('spots').select('*').ilike('name', `%${filters.searchQuery}%`)
  };

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 text-slate-900 antialiased font-sans">
      {/* 1. Top Navigation Bar */}
      <Navbar
        onAdminLoginClick={() => setActiveModal('admin')}
        isFilterOpenOnMobile={isMobileFilterOpen}
        onToggleMobileFilters={() => setIsMobileFilterOpen((prev) => !prev)}
      />

      {/* 2. Main Content Area */}
      <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Desktop Left/Side Filter Panel */}
        <FilterPanel
          className="hidden md:flex md:w-80 lg:w-88 shrink-0 overflow-y-auto"
          onFilterChange={handleFilterChange}
        />

        {/* Mobile Collapsible Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="md:hidden z-20 border-b border-slate-200 bg-white shadow-md animate-in slide-in-from-top-2 duration-200">
            <FilterPanel
              className="w-full border-r-0"
              onFilterChange={handleFilterChange}
            />
          </div>
        )}

        {/* Main Map Viewport Area (Container for Phase 2 hand-drawn SVG map) */}
        <MapArea
          onSelectSampleSpot={handleSelectSampleSpot}
          selectedSpotId={isDetailOpen && selectedSpot ? selectedSpot.id : null}
        />

        {/* 3. Spot Details Bottom Sheet / Side Panel (Hidden by default, proves interaction) */}
        <SpotDetailPanel
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          spot={selectedSpot}
        />
      </div>

      {/* 4. Footer */}
      <Footer onReportIssueClick={() => setActiveModal('report')} />

      {/* Placeholder Modal: Admin Login Notice */}
      {activeModal === 'admin' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="admin-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
                <ShieldAlert className="h-5 w-5" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <h3 id="admin-dialog-title" className="mt-4 text-base font-semibold text-slate-900">
              Admin Login Placeholder
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              Authentication will be integrated in Phase 2 using campus SSO and Supabase Auth.
              Admin permissions will allow staff to manage spot listings, operating hours, and verified amenities.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Placeholder Modal: Report an Issue Notice */}
      {activeModal === 'report' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
          role="dialog"
          aria-modal="true"
          aria-labelledby="report-dialog-title"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
            <div className="flex items-start justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                <AlertCircle className="h-5 w-5" aria-hidden="true" />
              </div>
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                aria-label="Close dialog"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <h3 id="report-dialog-title" className="mt-4 text-base font-semibold text-slate-900">
              Report an Issue
            </h3>
            <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
              In Phase 2, students can flag closed study halls, faulty power sockets, or incorrect
              operating hours. Reports will save directly to the Supabase incident queue.
            </p>
            <div className="mt-5">
              <button
                type="button"
                onClick={() => setActiveModal(null)}
                className="w-full min-h-[44px] rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
