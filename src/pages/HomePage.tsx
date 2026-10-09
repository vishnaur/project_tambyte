import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Navbar } from '../components/Navbar';
import { FilterPanel } from '../components/FilterPanel';
import { MapArea } from '../components/MapArea';
import { SpotDetailPanel } from '../components/SpotDetailPanel';
import { Footer } from '../components/Footer';
import { AdminLoginModal } from '../components/AdminLoginModal';
import { X, AlertCircle } from 'lucide-react';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import { supabase } from '../lib/supabase';
import type { SpotRow } from '../types/database';
import { calculateDistanceKm } from '../utils/location';
import { AdminDashboard } from '../components/AdminDashboard';

export default function HomePage() {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [directionsSpotId, setDirectionsSpotId] = useState<string | null>(null);
  const [locations, setLocations] = useState<SpotRow[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [reloadLocations, setReloadLocations] = useState(0);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  
  // Modals & Auth State
  const [activeModal, setActiveModal] = useState<'admin' | 'report' | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if admin is already logged in on initial load
  useEffect(() => {
    async function checkAdminSession() {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: adminRecord } = await supabase
          .from('admins')
          .select('role')
          .eq('user_id', session.user.id)
          .single();
        if (adminRecord) {
          setIsAdmin(true);
        }
      }
    }
    checkAdminSession();
  }, []);

  // Load spots from Supabase
  useEffect(() => {
    let isCurrentRequest = true;

    async function loadLocations() {
      setIsLoadingLocations(true);
      setLocationLoadError(null);

      try {
        // FR-7: Query approved spots (admins will also see their spots through RLS)
        const { data, error } = await supabase
          .from('spots')
          .select('*')
          .eq('approved', true)
          .order('name', { ascending: true });

        if (error) {
          throw error;
        }

        if (isCurrentRequest && data) {
          setLocations(data as unknown as SpotRow[]);
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
      [...new Set(locations.map((location) => location.category).filter((category) => category?.trim()))]
        .sort((first, second) => first.localeCompare(second)),
    [locations],
  );

  const categoryLocations = useMemo(
    () =>
      locations.filter(
        (location) =>
          selectedCategory === '__all__' ||
          location.category?.trim() === selectedCategory?.trim(),
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

  const handleLocateLocation = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(false);
    setDirectionsSpotId(null);
    setFocusRequest((request) => request + 1);
    setIsMobileFilterOpen(false);
  };

  const handleViewDetails = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(true);
    setDirectionsSpotId(null);
    setIsMobileFilterOpen(false);
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setSelectedSpot(null);
    setDirectionsSpotId(null);
  };

  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    if (
      selectedSpot &&
      category !== '__all__' &&
      selectedSpot.category?.trim() !== category.trim()
    ) {
      setSelectedSpot(null);
      setIsDetailOpen(false);
      setDirectionsSpotId(null);
    }
  };

  const handleAdminLogout = async () => {
    await supabase.auth.signOut();
    setIsAdmin(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm-cream text-slate-900 antialiased font-sans">
      {/* 1. Top Navigation Bar */}
      <Navbar
        isAdmin={isAdmin}
        onAdminLoginClick={() => setActiveModal('admin')}
        onAdminDashboardClick={() => setIsAdminDashboardOpen(true)}
        onAdminLogoutClick={handleAdminLogout}
        isFilterOpenOnMobile={isMobileFilterOpen}
        onToggleMobileFilters={() => setIsMobileFilterOpen((prev) => !prev)}
      />

      {/* 2. Main Content Area */}
      <div className="relative flex flex-1 flex-col md:flex-row overflow-hidden">
        {/* Desktop Left/Side Filter Panel */}
        <div
          id="desktop-filter-panel"
          className={`hidden shrink-0 overflow-hidden border-r border-slate-200 transition-[width] duration-300 ease-in-out md:block ${
            isDesktopFilterOpen ? 'w-80 lg:w-88' : 'w-0 border-r-0'
          }`}
          aria-hidden={!isDesktopFilterOpen}
          inert={!isDesktopFilterOpen}
        >
          <FilterPanel
            className="h-full w-80 overflow-y-auto lg:w-88"
            id="category-select-desktop"
            categories={categories}
            selectedCategory={selectedCategory}
            onCategoryChange={handleCategoryChange}
            locations={locations}
            selectedSpotId={selectedSpot?.id ?? null}
            onLocateLocation={handleLocateLocation}
          />
        </div>

        {/* Mobile Collapsible Filter Drawer */}
        {isMobileFilterOpen && (
          <div className="md:hidden z-20 border-b border-slate-200 bg-warm-cream shadow-md animate-in slide-in-from-top-2 duration-200">
            <FilterPanel
              className="w-full border-r-0"
              id="category-select-mobile"
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              locations={locations}
              selectedSpotId={selectedSpot?.id ?? null}
              onLocateLocation={handleLocateLocation}
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
          onLocateLocation={handleLocateLocation}
          onViewDetails={handleViewDetails}
          selectedSpotId={selectedSpot?.id ?? null}
          focusRequest={focusRequest}
          isFilterOpen={isDesktopFilterOpen}
          onToggleFilter={() => setIsDesktopFilterOpen((isOpen) => !isOpen)}
        />

        {/* 3. Spot Details Bottom Sheet / Side Panel */}
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

      {/* Real Working Admin Login Modal */}
      <AdminLoginModal
        isOpen={activeModal === 'admin'}
        onClose={() => setActiveModal(null)}
        onLoginSuccess={() => {
          setIsAdmin(true);
          setReloadLocations((prev) => prev + 1);
        }}
      />

      {/* Placeholder Modal: Report an Issue Notice */}
      {activeModal === 'report' && (
        createPortal(
          <div
            className="fixed inset-0 z-[3000] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs"
            role="dialog"
            aria-modal="true"
            aria-labelledby="report-issue-title"
          >
            <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl border border-slate-200">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-warm-cream text-dark-burgundy">
                  <AlertCircle className="h-5 w-5" aria-hidden="true" />
                </div>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close report notice"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
              <h3 id="report-issue-title" className="mt-4 text-base font-semibold text-slate-900">
                Report an Issue
              </h3>
              <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                Students can report incorrect hours, closed areas, or missing power outlets.
              </p>
              <div className="mt-5">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full min-h-[44px] rounded-xl bg-deep-maroon px-4 py-2 text-xs font-semibold text-white hover:bg-dark-burgundy transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )
      )}

      {/* Put it right here! */}
      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onSpotsUpdated={() => setReloadLocations((prev) => prev + 1)}
      />

    </div>
  );
}