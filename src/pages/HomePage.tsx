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
import { supabase, withSignedSpotImages } from '../lib/supabase';
import type { SpotRow } from '../types/database';
import { calculateDistanceKm, getOpeningStatus, getWalkingRoute, type WalkingRoute } from '../utils/location';
import { AdminDashboard } from '../components/AdminDashboard';
import { ContributeSpotModal } from '../components/ContributeSpotModal';
import { ReportModal } from '../components/ReportModal';

export default function HomePage() {
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isDesktopFilterOpen, setIsDesktopFilterOpen] = useState(true);
  const [selectedSpot, setSelectedSpot] = useState<SpotRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [focusRequest, setFocusRequest] = useState(0);
  const [directionsSpotId, setDirectionsSpotId] = useState<string | null>(null);
  const [walkingRoute, setWalkingRoute] = useState<WalkingRoute | null>(null);
  const [directionsLoading, setDirectionsLoading] = useState(false);
  const [directionsError, setDirectionsError] = useState<string | null>(null);
  const [directionsRetry, setDirectionsRetry] = useState(0);
  const [locations, setLocations] = useState<SpotRow[]>([]);
  const [isLoadingLocations, setIsLoadingLocations] = useState(true);
  const [locationLoadError, setLocationLoadError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('__all__');
  const [openNowFilter, setOpenNowFilter] = useState(false);
  const [openingClockTick, setOpeningClockTick] = useState(0);
  const [reloadLocations, setReloadLocations] = useState(0);
  const [isAdminDashboardOpen, setIsAdminDashboardOpen] = useState(false);
  const [isContributeModalOpen, setIsContributeModalOpen] = useState(false);
  const [activeModal, setActiveModal] = useState<'admin' | 'report' | null>(null);
  const [userGps, setUserGps] = useState<{ latitude: number; longitude: number } | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOpeningClockTick((tick) => tick + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Get user's live GPS location for routing & distance
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserGps({ latitude: pos.coords.latitude, longitude: pos.coords.longitude });
        },
        () => {
          setUserGps(BULSU_MENESES_CAMPUS); // Fallback to campus if denied
        },
        { enableHighAccuracy: true }
      );
    } else {
      setUserGps(BULSU_MENESES_CAMPUS);
    }
  }, []);
  
  
  useEffect(() => {
    if (!selectedSpot || directionsSpotId !== selectedSpot.id) {
      setWalkingRoute(null);
      setDirectionsLoading(false);
      setDirectionsError(null);
      return;
    }

    const controller = new AbortController();
    let isCurrentRequest = true;
    setWalkingRoute(null);
    setDirectionsLoading(true);
    setDirectionsError(null);

    getWalkingRoute(selectedSpot, userGps || BULSU_MENESES_CAMPUS, controller.signal)
      .then((route) => {
        if (isCurrentRequest) setWalkingRoute(route);
      })
      .catch((error: unknown) => {
        if (isCurrentRequest && !controller.signal.aborted) {
          setDirectionsError(
            error instanceof Error ? error.message : 'Unable to load walking directions.',
          );
        }
      })
      .finally(() => {
        if (isCurrentRequest) setDirectionsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
      controller.abort();
    };
  }, [directionsRetry, directionsSpotId, selectedSpot]);
  
  // Modals & Auth State
  const [isAdmin, setIsAdmin] = useState(false);

  // Check if admin is already logged in on initial load
  useEffect(() => {
    let isCurrentEffect = true;
    let checkRevision = 0;
    let latestUserId: string | null = null;

    async function updateAdminState(userId: string | null) {
      const revision = ++checkRevision;
      if (!userId) {
        setIsAdmin(false);
        return;
      }

      const { data, error } = await supabase.rpc('is_admin');
      if (isCurrentEffect && revision === checkRevision) {
        const authorized = !error && data === true;
        setIsAdmin(authorized);
        if (!authorized) setIsAdminDashboardOpen(false);
      }
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        latestUserId = null;
        checkRevision += 1;
        setIsAdmin(false);
        setIsAdminDashboardOpen(false);
        return;
      }
      if (latestUserId !== session.user.id) {
        latestUserId = session.user.id;
        checkRevision += 1;
        setIsAdmin(false);
        setIsAdminDashboardOpen(false);
      }
      window.setTimeout(() => {
        if (isCurrentEffect) void updateAdminState(session.user.id);
      }, 0);
    });

    return () => {
      isCurrentEffect = false;
      subscription.unsubscribe();
    };
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

        if (data) {
          const spotsWithImages = await withSignedSpotImages(data as unknown as SpotRow[]);
          if (isCurrentRequest) {
            setLocations(spotsWithImages);
          }
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
          location.longitude <= 180 &&
          (!openNowFilter || getOpeningStatus(location.hours) === 'open'),
      ),
    [categoryLocations, openNowFilter, openingClockTick],
  );

  useEffect(() => {
    if (openNowFilter && selectedSpot && getOpeningStatus(selectedSpot.hours) !== 'open') {
      setSelectedSpot(null);
      setIsDetailOpen(false);
      setDirectionsSpotId(null);
    }
  }, [openingClockTick, openNowFilter, selectedSpot]);

  const handleLocateLocation = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(false);
    setDirectionsSpotId(null);
    setFocusRequest((request) => request + 1);
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

  const handleOpenNowChange = (enabled: boolean) => {
    setOpenNowFilter(enabled);
    if (enabled && selectedSpot && getOpeningStatus(selectedSpot.hours) !== 'open') {
      setSelectedSpot(null);
      setIsDetailOpen(false);
      setDirectionsSpotId(null);
    }
  };

  const handleAdminLogout = async () => {
    setIsAdmin(false);
    setIsAdminDashboardOpen(false);
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Unable to end the administrator session.');
      window.alert('Unable to end the session completely. Please close this browser tab and try again.');
    }
  };
  
  const handleViewDetails = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(true);
    setDirectionsSpotId(null);
    setIsMobileFilterOpen(false);
  };

  const handleGetDirections = (location: SpotRow) => {
    setSelectedSpot(location);
    setIsDetailOpen(true);
    setDirectionsSpotId(location.id);
    setIsMobileFilterOpen(false);
  };

  return (
    <div className="flex min-h-screen flex-col bg-warm-cream text-slate-900 antialiased font-sans">
      {/* 1. Top Navigation Bar */}
      <Navbar
        isAdmin={isAdmin}
        onShareSpotClick={() => setIsContributeModalOpen(true)}
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
            openNowFilter={openNowFilter}
            onOpenNowChange={handleOpenNowChange}
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
              openNowFilter={openNowFilter}
              onOpenNowChange={handleOpenNowChange}
              locations={locations}
              selectedSpotId={selectedSpot?.id ?? null}
              onLocateLocation={handleLocateLocation}
            />
          </div>
        )}

        <MapArea
          onShareSpotClick={() => setIsContributeModalOpen(true)}
          onGetDirections={handleGetDirections} // <-- Add this line!
          locations={filteredLocations}
          totalLocationCount={locations.length}
          isLoading={isLoadingLocations}
          loadError={locationLoadError}
          onRetry={() => setReloadLocations((attempt) => attempt + 1)}
          onLocateLocation={handleLocateLocation}
          onViewDetails={handleViewDetails}
          selectedSpotId={selectedSpot?.id ?? null}
          focusRequest={focusRequest}
          walkingRoute={directionsSpotId === selectedSpot?.id ? walkingRoute : null}
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
              ? calculateDistanceKm(userGps || BULSU_MENESES_CAMPUS, selectedSpot)
              : null
          }
          directionsRequested={directionsSpotId === selectedSpot?.id}
          directionsLoading={directionsLoading}
          directionsError={directionsError}
          walkingRoute={walkingRoute}
          onGetDirections={() => {
            setDirectionsError(null);
            setDirectionsSpotId(selectedSpot?.id ?? null);
          }}
          onRetryDirections={() => setDirectionsRetry((attempt) => attempt + 1)}
          onReportIssue={(spot) => {
            setSelectedSpot(spot);
            setActiveModal('report');
          }}
          onClearDirections={() => {
            setDirectionsSpotId(null);
            setWalkingRoute(null);
            setDirectionsError(null);
          }}
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

      {/* Real Working Student Report Modal */}
      <ReportModal
        isOpen={activeModal === 'report'}
        onClose={() => setActiveModal(null)}
        spots={locations}
        preselectedSpot={selectedSpot}
      />

      {/* Student Spot Contribution Modal */}
      <ContributeSpotModal
        isOpen={isContributeModalOpen}
        onClose={() => setIsContributeModalOpen(false)}
        onSubmitted={() => {
          setIsContributeModalOpen(false);
          setReloadLocations((prev) => prev + 1);
        }}
      />

      <AdminDashboard
        isOpen={isAdminDashboardOpen}
        onClose={() => setIsAdminDashboardOpen(false)}
        onSpotsUpdated={() => setReloadLocations((prev) => prev + 1)}
      />

    </div>
  );
}
