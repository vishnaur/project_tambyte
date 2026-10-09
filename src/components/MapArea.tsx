import L from 'leaflet';
import { PanelLeftClose, PanelLeftOpen, Plus } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { MapContainer, Marker, Popup, TileLayer, ZoomControl, useMap } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import type { SpotRow } from '../types/database';

interface MapAreaProps {
  selectedSpotId: string | null;
  focusRequest: number;
  locations: readonly SpotRow[];
  totalLocationCount: number;
  invalidCoordinateCount: number;
  isLoading: boolean;
  loadError: string | null;
  onLocateLocation: (location: SpotRow) => void;
  onViewDetails: (location: SpotRow) => void;
  onRetry: () => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onShareSpotClick?: () => void;
}
function MapResizeHandler() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ pan: false });
    });

    observer.observe(container);
    return () => observer.disconnect();
  }, [map]);

  return null;
}

function FocusSelectedSpot({
  selectedSpotId,
  focusRequest,
  markerRefs,
}: {
  selectedSpotId: string | null;
  focusRequest: number;
  markerRefs: React.MutableRefObject<Map<string, L.Marker>>;
}) {
  const map = useMap();

  useEffect(() => {
    if (!selectedSpotId) {
      markerRefs.current.forEach((marker) => marker.closePopup());
      return;
    }

    const marker = markerRefs.current.get(selectedSpotId);
    if (!marker) return;

    map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 17), {
      animate: true,
      duration: 0.6,
    });
    marker.openPopup();
  }, [map, markerRefs, selectedSpotId, focusRequest]);

  return null;
}

const BULSU_MENESES_COORDINATES: L.LatLngExpression = [
  BULSU_MENESES_CAMPUS.latitude,
  BULSU_MENESES_CAMPUS.longitude,
];

const campusIcon = L.divIcon({
  className: 'tambyte-campus-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function createSpotIcon(isSelected: boolean) {
  return L.divIcon({
    className: `tambyte-spot-marker${isSelected ? ' tambyte-spot-marker-selected' : ''}`,
    html: '<span aria-hidden="true"></span>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
}

function hasValidCoordinates(location: SpotRow) {
  return (
    Number.isFinite(location.latitude) &&
    Number.isFinite(location.longitude) &&
    location.latitude >= -90 &&
    location.latitude <= 90 &&
    location.longitude >= -180 &&
    location.longitude <= 180
  );
}

export function MapArea({
  selectedSpotId,
  focusRequest,
  locations,
  totalLocationCount,
  invalidCoordinateCount,
  isLoading,
  loadError,
  onLocateLocation,
  onViewDetails,
  onRetry,
  isFilterOpen,
  onToggleFilter,
  onShareSpotClick,
}: MapAreaProps) {
  const validLocations = locations.filter(hasValidCoordinates);
  const markerRefs = useRef(new Map<string, L.Marker>());

  return (
    <main
      className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-100/80 p-3 sm:p-5 lg:p-6"
      aria-label="Interactive place map"
    >
      <button
        type="button"
        onClick={onToggleFilter}
        className="absolute left-3 top-3 z-[1000] hidden h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-dark-burgundy shadow-md transition-colors hover:bg-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy md:inline-flex sm:left-5 sm:top-5 lg:left-6 lg:top-6"
        aria-label={isFilterOpen ? 'Hide place filters' : 'Show place filters'}
        aria-expanded={isFilterOpen}
        aria-controls="desktop-filter-panel"
        title={isFilterOpen ? 'Hide filters' : 'Show filters'}
      >
        {isFilterOpen ? (
          <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
        ) : (
          <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
        )}
      </button>

      <div className="relative isolate min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:min-h-[500px]">
        <MapContainer
          center={BULSU_MENESES_COORDINATES}
          zoom={15}
          scrollWheelZoom
          zoomControl={false}
          className="h-full min-h-[420px] w-full sm:min-h-[500px]"
          aria-label={`Map centered on ${BULSU_MENESES_CAMPUS.name}`}
        >
          <MapResizeHandler />
          <FocusSelectedSpot
            selectedSpotId={selectedSpotId}
            focusRequest={focusRequest}
            markerRefs={markerRefs}
          />
          <ZoomControl position="topright" />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />

          <Marker position={BULSU_MENESES_COORDINATES} icon={campusIcon}>
            <Popup>
              <strong>{BULSU_MENESES_CAMPUS.name}</strong>
              <br />
              Food and shop finder map center
            </Popup>
          </Marker>

          {validLocations.map((location) => (
            <Marker
              key={location.id}
              ref={(marker) => {
                if (marker) {
                  markerRefs.current.set(location.id, marker);
                } else {
                  markerRefs.current.delete(location.id);
                }
              }}
              position={[location.latitude, location.longitude]}
              icon={createSpotIcon(selectedSpotId === location.id)}
              eventHandlers={{
                click: () => onLocateLocation(location),
              }}
            >
              <Popup>
                <strong>{location.name}</strong>
                {location.category && (
                  <>
                    <br />
                    {location.category}
                  </>
                )}
                {location.location_description && (
                  <>
                    <br />
                    {location.location_description}
                  </>
                )}
                <br />
                <button
                  type="button"
                  onClick={() => onViewDetails(location)}
                  className="mt-1 font-semibold text-dark-burgundy"
                >
                  View details
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

       <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:bottom-4 sm:left-4">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-dark-burgundy" aria-hidden="true" />
          <span className="ml-2">BulSU – Meneses Campus</span>
          <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-deep-crimson" aria-hidden="true" />
          <span className="ml-2">Food &amp; shops</span>
        </div>

        {/* Minimalist Floating + Button */}
        <button
          type="button"
          onClick={() => {
            console.log("Floating + button clicked!");
            onShareSpotClick?.();
          }}
          className="absolute bottom-8 right-3.5 z-[1000] flex h-11 w-11 items-center justify-center rounded-full bg-deep-crimson text-white shadow-lg hover:scale-110 active:scale-95 transition-transform duration-200 border border-white/60 focus:outline-none"
          title="Share a Spot"
          aria-label="Share a Spot"
        >
          <Plus className="h-5 w-5 stroke-[2.5]" />
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm sm:px-4">
        {loadError ? (
          <div className="flex flex-wrap items-center justify-between gap-2" role="alert">
            <p className="text-xs text-rose-700">
              Unable to load places. {loadError}
            </p>
            <button
              type="button"
              onClick={onRetry}
              className="min-h-9 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Retry
            </button>
          </div>
        ) : isLoading ? (
          <p className="text-xs text-slate-600" role="status">          Finding places...</p>
        ) : validLocations.length ? (
          <p className="text-xs text-slate-600">
            {validLocations.length} location{validLocations.length === 1 ? '' : 's'} shown on map
            {invalidCoordinateCount > 0 &&
              ` · ${invalidCoordinateCount} location${invalidCoordinateCount === 1 ? '' : 's'} excluded because coordinates are missing or invalid`}
          </p>
        ) : totalLocationCount === 0 ? (
          <p className="text-xs text-slate-600">No places found.</p>
        ) : invalidCoordinateCount > 0 ? (
          <p className="text-xs text-amber-700">
            No mappable locations. {invalidCoordinateCount} location
            {invalidCoordinateCount === 1 ? ' is' : 's are'} missing valid coordinates.
          </p>
        ) : (
          <p className="text-xs text-slate-600">No places found in this category.</p>
        )}
      </div>
    </main>
  );
}
