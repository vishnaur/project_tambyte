import React, { useEffect, useState } from 'react';
import { AlertCircle, Clock, Footprints, MapPin, X, Zap } from 'lucide-react';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import type { SpotRow } from '../types/database';
import { SignedSpotImage } from './SignedSpotImage';
import { getOpeningStatus, type OpeningStatus, type WalkingRoute } from '../utils/location';

interface SpotDetailPanelProps {
  isOpen: boolean;
  onClose: () => void;
  spot: SpotRow | null;
  distanceKm: number | null;
  directionsRequested: boolean;
  directionsLoading: boolean;
  directionsError: string | null;
  walkingRoute: WalkingRoute | null;
  onGetDirections: () => void;
  onRetryDirections: () => void;
  onClearDirections: () => void;
  onReportIssue: (spot: SpotRow) => void;
}

const OPENING_STATUS_LABELS: Record<OpeningStatus, string> = {
  open: 'Open',
  closed: 'Closed',
  unavailable: 'Opening/closing information unavailable',
};

export function SpotDetailPanel({
  isOpen,
  onClose,
  spot,
  distanceKm,
  directionsRequested,
  directionsLoading,
  directionsError,
  walkingRoute,
  onGetDirections,
  onRetryDirections,
  onClearDirections,
  onReportIssue,
}: SpotDetailPanelProps) {
  const [, setClockTick] = useState(0);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setClockTick((tick) => tick + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  if (!isOpen || !spot) {
    return null;
  }

  const openingStatus = getOpeningStatus(spot.hours);
  const hasValidCoordinates =
    Number.isFinite(spot.latitude) &&
    Number.isFinite(spot.longitude) &&
    spot.latitude >= -90 &&
    spot.latitude <= 90 &&
    spot.longitude >= -180 &&
    spot.longitude <= 180;
  const taggedAmenities = [
    { label: 'Free Wi-Fi', available: spot.has_wifi },
    { label: 'Air conditioning', available: spot.has_aircon },
    { label: 'Restroom', available: spot.has_restroom },
    { label: 'Shaded', available: spot.is_shaded },
    { label: 'Quiet', available: spot.is_quiet },
  ].filter((amenity) => amenity.available);

  return (
    <>
      <div
        className="fixed inset-0 z-[1090] bg-black/40 backdrop-blur-xs transition-opacity md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className="fixed inset-x-0 bottom-0 z-[1100] isolate max-h-[85vh] overflow-y-auto rounded-t-3xl border-t border-slate-200 bg-white p-6 shadow-2xl transition-all duration-300 md:absolute md:top-6 md:right-6 md:bottom-auto md:left-auto md:w-96 md:max-h-[calc(100%-3rem)] md:rounded-2xl md:border md:shadow-lg"
        aria-labelledby="spot-detail-title"
        role="dialog"
        aria-modal="true"
      >
        {spot.image_url && (
          <div className="pointer-events-none absolute inset-x-0 top-0 z-0 h-45 overflow-hidden" aria-hidden="true">
            <SignedSpotImage
              imagePath={spot.image_path}
              imageUrl={spot.image_url}
              alt=""
              className="h-full w-full object-cover opacity-95"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 via-white/10 to-white" />
          </div>
        )}
        <div className="relative z-10 mx-auto mb-4 h-1.5 w-12 rounded-full bg-slate-300 md:hidden" aria-hidden="true" />

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex rounded-md border border-dark-burgundy/20 bg-warm-cream px-2.5 py-1 text-xs font-semibold text-dark-burgundy">
              {spot.category}
            </span>
            <h2
              id="spot-detail-title"
              className="mt-2 text-lg font-bold tracking-tight text-slate-900 sm:text-xl"
            >
              {spot.name}
            </h2>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={() => onReportIssue(spot)}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-400/30 bg-slate-400/10 text-rose-500 backdrop-blur-[1px] transition-colors hover:bg-rose-100 active:bg-rose-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy"
              aria-label={`Report an issue with ${spot.name}`}
              title="Report an issue"
            >
              <span
                className="h-5 w-5 bg-rose-500"
                style={{
                  maskImage: "url('/report-issue-icon.png')",
                  maskPosition: 'center',
                  maskRepeat: 'no-repeat',
                  maskSize: 'contain',
                  WebkitMaskImage: "url('/report-issue-icon.png')",
                  WebkitMaskPosition: 'center',
                  WebkitMaskRepeat: 'no-repeat',
                  WebkitMaskSize: 'contain',
                }}
                aria-hidden="true"
              />
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-xl border border-slate-400/30 bg-slate-400/10 text-slate-400 backdrop-blur-[1px] transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy"
              aria-label="Close spot details"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="relative z-10 mt-5 space-y-3.5 pt-4 text-xs text-slate-600 sm:text-sm">
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Address: </span>
              <span>{spot.location_description || 'Address not provided'}</span>
            </div>
          </div>
          {spot.description && (
            <p className="border-l-2 border-gold pl-3">{spot.description}</p>
          )}
          <div className="flex items-start gap-2.5">
            <Clock className="mt-0.5 h-4 w-4 shrink-0 text-deep-crimson" aria-hidden="true" />
            <div>
              <p>
                <span className="font-semibold text-slate-800">Hours: </span>
                <span>{spot.hours?.trim() || 'Information unavailable'}</span>
              </p>
              <p className={`mt-1 font-medium ${openingStatus === 'open' ? 'text-dark-burgundy' : openingStatus === 'closed' ? 'text-rose-700' : 'text-slate-500'}`}>
                Status: {OPENING_STATUS_LABELS[openingStatus]}
              </p>
            </div>
          </div>
          <div className="flex items-start gap-2.5">
            <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            <div>
              <span className="font-semibold text-slate-800">Distance from your location: </span>
              <span>{distanceKm === null ? 'Information unavailable' : `${distanceKm.toFixed(1)} km`}</span>
              {distanceKm !== null && (
                <p className="mt-1 text-xs text-slate-500">
                  Estimated straight-line distance from your GPS.
                </p>
              )}
            </div>
          </div>
          {spot.has_outlets && (
            <div className="flex items-start gap-2.5">
              <Zap className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div>
                <span className="font-semibold text-slate-800">Power outlets: </span>
                <span>Available</span>
              </div>
            </div>
          )}
          {taggedAmenities.length > 0 && (
            <div className="flex items-start gap-2.5">
              <div>
                <span className="font-semibold text-slate-800">Amenities: </span>
                <span>{taggedAmenities.map((amenity) => amenity.label).join(', ')}</span>
              </div>
            </div>
          )}
        </div>

        {hasValidCoordinates && (
          <div className="relative z-10 mt-5 border-t border-slate-100 pt-4">
            {!directionsRequested ? (
              <button
                type="button"
                onClick={onGetDirections}
                className="min-h-[44px] w-full rounded-xl bg-dark-burgundy px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-deep-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy focus-visible:ring-offset-2"
              >
                Get directions
              </button>
            ) : (
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <h3 className="text-sm font-semibold text-slate-900">Directions</h3>
                {directionsLoading ? (
                  <p className="text-xs text-slate-600" role="status">
                    Finding walking route from your current location…
                  </p>
                ) : directionsError ? (
                  <div className="space-y-2" role="alert">
                    <p className="flex items-start gap-2 text-xs leading-relaxed text-rose-700">
                      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                      {directionsError}
                    </p>
                    <button
                      type="button"
                      onClick={onRetryDirections}
                      className="min-h-[40px] w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                    >
                      Try again
                    </button>
                  </div>
                ) : walkingRoute ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-dark-burgundy">
                      <Footprints className="h-4 w-4 shrink-0 text-deep-crimson" aria-hidden="true" />
                      <p className="text-sm font-bold">
                        {walkingRoute.durationMinutes} min walk
                      </p>
                    </div>
                    <p className="text-xs text-slate-600">
                      {walkingRoute.distanceKm < 1
                        ? `${Math.round(walkingRoute.distanceKm * 1000)} m`
                        : `${walkingRoute.distanceKm.toFixed(1)} km`} road distance
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Estimated walking time · route by OpenStreetMap
                    </p>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={onClearDirections}
                  className="min-h-[36px] w-full rounded-lg px-3 text-xs font-medium text-slate-600 hover:bg-white"
                >
                  Clear directions
                </button>
              </div>
            )}
          </div>
        )}

      </aside>
    </>
  );
}
