import L from 'leaflet';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import type { SpotRow } from '../types/database';

interface MapAreaProps {
  selectedSpotId: string | null;
  locations: readonly SpotRow[];
  totalLocationCount: number;
  invalidCoordinateCount: number;
  isLoading: boolean;
  loadError: string | null;
  onSelectLocation: (location: SpotRow) => void;
  onRetry: () => void;
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
  locations,
  totalLocationCount,
  invalidCoordinateCount,
  isLoading,
  loadError,
  onSelectLocation,
  onRetry,
}: MapAreaProps) {
  const validLocations = locations.filter(hasValidCoordinates);

  return (
    <main
      className="relative flex min-h-0 flex-1 flex-col gap-3 overflow-hidden bg-slate-100/80 p-3 sm:p-5 lg:p-6"
      aria-label="Interactive place map"
    >
      <div className="relative min-h-[420px] flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:min-h-[500px]">
        <MapContainer
          center={BULSU_MENESES_COORDINATES}
          zoom={15}
          scrollWheelZoom
          zoomControl
          className="h-full min-h-[420px] w-full sm:min-h-[500px]"
          aria-label={`Map centered on ${BULSU_MENESES_CAMPUS.name}`}
        >
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
              position={[location.latitude, location.longitude]}
              icon={createSpotIcon(selectedSpotId === location.id)}
              eventHandlers={{
                click: () => onSelectLocation(location),
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
                  onClick={() => onSelectLocation(location)}
                  className="mt-1 font-semibold text-emerald-700"
                >
                  View details
                </button>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute bottom-3 left-3 z-[1000] rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:bottom-4 sm:left-4">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
          <span className="ml-2">BulSU – Meneses Campus</span>
          <span className="mx-2 text-slate-300" aria-hidden="true">|</span>
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-emerald-600" aria-hidden="true" />
          <span className="ml-2">Food &amp; shops</span>
        </div>
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
