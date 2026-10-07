import React, { useEffect, useMemo, useState } from 'react';
import { Navbar } from '../components/Navbar';
import { FilterPanel } from '../components/FilterPanel';
import { MapArea } from '../components/MapArea';
import { SpotDetailPanel } from '../components/SpotDetailPanel';
import { Footer } from '../components/Footer';
import { X, ShieldAlert, AlertCircle } from 'lucide-react';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import { getSupabaseClient } from '../services/supabase';
import type { SpotRow } from '../types/database';
import { calculateDistanceKm } from '../utils/location';

export default function HomePage() {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [directionsSpotId, setDirectionsSpotId] = useState<string | null>(null);
  const [locations, setLocations] = useState<SpotRow[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [reloadLocations, setReloadLocations] = useState(0);
  const [activeModal, setActiveModal] = useState<'admin' | 'report' | null>(null);

  useEffect(() => {
    let isCurrentRequest = true;

    async function loadLocations() {
      setIsLoadingLocations(true);
      setLocationLoadError(null);

      try {
        const { data, error } = await getSupabaseClient()
          .from('spots')
          .select('*')
          .eq('is_active', true)
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (isCurrentRequest) {
          setLocations(data);
        }
      } catch (error) {
        if (isCurrentRequest) {
          setLocationLoadError(
            error instanceof Error ? error.message : 'Unable to load locations.',
          );
        }
      } finally {
        if (isCurrentRequest) {
          setIsLoadingLocations(false);
        }
      }
    }

    void loadLocations();
    return () => {
      isCurrentRequest = false;
    };
  }, [reloadLocations]);

  const categories = useMemo(
    () =>
      [...new Set(locations.map((location) => location.category).filter((category) => category.trim()))]
        .sort((first, second) => first.localeCompare(second)),
    [locations],
  );

  const categoryLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          selectedCategory === '__all__' ||
          location.category.trim() === selectedCategory.trim(),
      ),
    [locations, selectedCategory],
  );

  const filteredLocations = useMemo(
    () =>
      categoryLocations.filter(
        (location) =>
          Number.isFinite(location.latitude) &&
          Number.isFinite(location.longitude) &&
          location.latitude >= -90 &&
          location.latitude <= 90 &&
          location.longitude >= -180 &&
          location.longitude <= 180,
      ),
    [categoryLocations],
  );

  const handleSelectLocation = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(true);
    setDirectionsSpotId(null);
    setIsMobileFilterOpen(false);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setDirectionsSpotId(null);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (
      selectedSpot &&
      category !== '__all__' &&
      selectedSpot.category.trim() !== category.trim()
    ) {
      setSelectedSpot(null);
      setIsDetailOpen(false);
      setDirectionsSpotId(null);
    }
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
          id="category-select-desktop"
          categories={categories}
          selectedCategory={selectedCategory}
          onCategoryChange={handleCategoryChange}
        />

        {/* Mobile Collapsible Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="md:hidden z-20 border-b border-slate-200 bg-white shadow-md animate-in slide-in-from-top-2 duration-200">
            <FilterPanel
              className="w-full border-r-0"
              id="category-select-mobile"
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
            />
          </div>
        )}

        <MapArea
          locations={filteredLocations}
          totalLocationCount={locations.length}
          invalidCoordinateCount={categoryLocations.length - filteredLocations.length}
          isLoading={isLoadingLocations}
          loadError={locationLoadError}
          onRetry={() => setReloadLocations((attempt) => attempt + 1)}
          onSelectLocation={handleSelectLocation}
          selectedSpotId={isDetailOpen ? selectedSpot?.id ?? null : null}
        />

        {/* 3. Spot Details Bottom Sheet / Side Panel (Hidden by default, proves interaction) */}
        <SpotDetailPanel
          isOpen={isDetailOpen}
          onClose={handleCloseDetail}
          spot={selectedSpot}
          distanceKm={
            selectedSpot
              ? calculateDistanceKm(BULSU_MENESES_CAMPUS, selectedSpot)
              : null
          }
          directionsRequested={directionsSpotId === selectedSpot?.id}
          onGetDirections={() => setDirectionsSpotId(selectedSpot?.id ?? null)}
          onClearDirections={() => setDirectionsSpotId(null)}
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
