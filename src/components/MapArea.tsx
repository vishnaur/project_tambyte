import L from 'leaflet';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Droplets,
  RefreshCw,
  Shirt,
  Sun,
  Umbrella,
  Wind,
  X,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Minus,
  Navigation,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

// Google Maps-style Pulsing Blue "You Are Here" Dot
const userLocationIcon = L.divIcon({
  className: 'tambyte-user-location-marker',
  html: `
    <div style="position:relative; width:22px; height:22px; display:flex; align-items:center; justify-content:center;">
      <div style="position:absolute; width:22px; height:22px; border-radius:50%; background:rgba(37,99,235,0.4); animation:ping 1.5s cubic-bezier(0,0,0.2,1) infinite;"></div>
      <div style="position:relative; width:12px; height:12px; border-radius:50%; background:#2563eb; border:2.5px solid #ffffff; box-shadow:0 2px 5px rgba(0,0,0,0.4);"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});
import { useEffect, useRef, useState } from 'react';
import { MapContainer, Marker, Popup, TileLayer, Circle, Polyline, useMap } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import type { SpotRow } from '../types/database';
import { SignedSpotImage } from './SignedSpotImage';
import { getOpeningStatus, type WalkingRoute } from '../utils/location';

interface CampusWeather {
  temperature: number;
  feelsLike: number;
  humidity: number;
  weatherCode: number;
  isDay: boolean;
  windSpeed: number;
  high: number | null;
  low: number | null;
  uvIndex: number | null;
  precipitationChance: number | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function readNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(`Weather data is missing ${field}.`);
  }
  return value;
}

function readDailyValue(value: unknown): number | null {
  if (!Array.isArray(value) || typeof value[0] !== 'number' || !Number.isFinite(value[0])) {
    return null;
  }
  return value[0];
}

function getWeatherDetails(code: number, isDay: boolean): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: isDay ? 'Clear sky' : 'Clear night', Icon: isDay ? Sun : Cloud };
  if (code <= 2) return { label: 'Partly cloudy', Icon: CloudSun };
  if (code === 3) return { label: 'Overcast', Icon: Cloud };
  if (code === 45 || code === 48) return { label: 'Foggy', Icon: CloudFog };
  if (code <= 57) return { label: 'Drizzle', Icon: CloudDrizzle };
  if (code <= 69 || (code >= 80 && code <= 82)) return { label: 'Rain', Icon: CloudRain };
  if (code <= 77 || code === 85 || code === 86) return { label: 'Snow', Icon: CloudSnow };
  if (code >= 95) return { label: 'Thunderstorms', Icon: CloudLightning };
  return { label: 'Cloudy', Icon: Cloud };
}

function getWeatherAdvice(weather: CampusWeather) {
  const advice: { text: string; Icon: LucideIcon }[] = [];

  if (weather.weatherCode >= 95) {
    return [
      {
        text: 'Thunderstorms expected. Stay in a sturdy covered area and avoid exposed places.',
        Icon: CloudLightning,
      },
    ];
  }

  if (
    (weather.precipitationChance !== null && weather.precipitationChance >= 40) ||
    (weather.weatherCode >= 51 && weather.weatherCode <= 82)
  ) {
    advice.push({ text: 'Rain is possible. Bring an umbrella.', Icon: Umbrella });
  }

  if (weather.uvIndex !== null && weather.uvIndex >= 6) {
    advice.push({ text: 'High UV today. Apply sunscreen and stay hydrated.', Icon: Sun });
  } else if (weather.weatherCode <= 2) {
    advice.push({ text: 'Bright conditions. Sunscreen is a good idea.', Icon: Sun });
  }

  if (weather.feelsLike >= 30) {
    advice.push({ text: 'It may feel hot. Wear breathable clothes and take shade breaks.', Icon: Shirt });
  }

  if (advice.length === 0) {
    advice.push({ text: 'Comfortable conditions for getting around campus.', Icon: Shirt });
  }

  return advice;
}

function CampusWeatherBadge() {
  const [weather, setWeather] = useState<CampusWeather | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOpen, setIsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    let isCurrentRequest = true;

    async function loadWeather() {
      setIsLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams({
          latitude: String(BULSU_MENESES_CAMPUS.latitude),
          longitude: String(BULSU_MENESES_CAMPUS.longitude),
          current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m',
          daily: 'uv_index_max,precipitation_probability_max,temperature_2m_max,temperature_2m_min',
          timezone: 'auto',
          forecast_days: '1',
        });
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error(`Weather service returned ${response.status}.`);
        }

        const payload: unknown = await response.json();
        if (!isRecord(payload) || !isRecord(payload.current) || !isRecord(payload.daily)) {
          throw new Error('Weather service returned an unexpected response.');
        }

        const current = payload.current;
        const daily = payload.daily;
        const nextWeather: CampusWeather = {
          temperature: readNumber(current.temperature_2m, 'temperature'),
          feelsLike: readNumber(current.apparent_temperature, 'feels-like temperature'),
          humidity: readNumber(current.relative_humidity_2m, 'humidity'),
          weatherCode: readNumber(current.weather_code, 'conditions'),
          isDay: readNumber(current.is_day, 'daylight') === 1,
          windSpeed: readNumber(current.wind_speed_10m, 'wind speed'),
          high: readDailyValue(daily.temperature_2m_max),
          low: readDailyValue(daily.temperature_2m_min),
          uvIndex: readDailyValue(daily.uv_index_max),
          precipitationChance: readDailyValue(daily.precipitation_probability_max),
        };

        if (isCurrentRequest) setWeather(nextWeather);
      } catch (loadError) {
        if (isCurrentRequest && !controller.signal.aborted) {
          setError(loadError instanceof Error ? loadError.message : 'Unable to load the campus forecast.');
        }
      } finally {
        if (isCurrentRequest) setIsLoading(false);
      }
    }

    void loadWeather();
    const refreshInterval = window.setInterval(
      () => setRefreshKey((key) => key + 1),
      30 * 60 * 1000,
    );

    return () => {
      isCurrentRequest = false;
      controller.abort();
      window.clearInterval(refreshInterval);
    };
  }, [refreshKey]);

  const weatherDetails = weather
    ? getWeatherDetails(weather.weatherCode, weather.isDay)
    : { label: 'Campus weather', Icon: CloudSun };
  const advice = weather ? getWeatherAdvice(weather) : [];

  return (
    <div className="absolute right-2.5 top-2.5 z-[1000]">
      <button
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className="flex h-10 w-10 items-center justify-center rounded-lg border border-gold/70 bg-warm-cream text-deep-crimson shadow-md transition hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy"
        aria-label={weather ? `${weatherDetails.label}, ${Math.round(weather.temperature)} degrees. Show forecast.` : 'Show campus weather forecast'}
        aria-expanded={isOpen}
        aria-controls="campus-weather-panel"
        title="Campus weather forecast"
      >
        <weatherDetails.Icon className="h-5 w-5" aria-hidden="true" />
      </button>

      {isOpen && (
        <section
          id="campus-weather-panel"
          className="absolute right-0 top-[calc(100%+0.5rem)] w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-gold/50 bg-deep-maroon/95 p-4 text-warm-cream shadow-xl backdrop-blur-md"
          aria-label="Campus weather forecast"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">Campus weather</p>
              <p className="mt-1 text-[11px] text-warm-cream/70">BulSU – Meneses Campus</p>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="-mr-1 -mt-1 rounded-full p-1.5 text-warm-cream/70 hover:bg-warm-cream/10 hover:text-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold"
              aria-label="Close weather forecast"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>

          {weather && (
            <>
              <div className="mt-4 flex items-center gap-3">
                <weatherDetails.Icon className="h-10 w-10 shrink-0 text-gold" aria-hidden="true" />
                <div>
                  <p className="text-3xl font-light leading-none">{Math.round(weather.temperature)}°</p>
                  <p className="mt-1 text-sm text-warm-cream/85">{weatherDetails.label}</p>
                </div>
                <div className="ml-auto text-right text-xs text-warm-cream/70">
                  <p>H: {weather.high === null ? '—' : `${Math.round(weather.high)}°`}</p>
                  <p className="mt-1">L: {weather.low === null ? '—' : `${Math.round(weather.low)}°`}</p>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-warm-cream/15 pt-3 text-xs text-warm-cream/90">
                <p className="flex items-center gap-1.5">
                  <Sun className="h-3.5 w-3.5 text-gold" aria-hidden="true" />
                  UV {weather.uvIndex === null ? '—' : Math.round(weather.uvIndex)}
                </p>
                <p className="flex items-center gap-1.5">
                  <Umbrella className="h-3.5 w-3.5 text-warm-cream" aria-hidden="true" />
                  Rain {weather.precipitationChance === null ? '—' : `${Math.round(weather.precipitationChance)}%`}
                </p>
                <p className="flex items-center gap-1.5">
                  <Droplets className="h-3.5 w-3.5 text-warm-cream/80" aria-hidden="true" />
                  Humidity {Math.round(weather.humidity)}%
                </p>
                <p className="flex items-center gap-1.5">
                  <Wind className="h-3.5 w-3.5 text-warm-cream/80" aria-hidden="true" />
                  Wind {Math.round(weather.windSpeed)} km/h
                </p>
              </div>

              <div className="mt-4 border-t border-warm-cream/15 pt-3">
                <p className="text-xs font-semibold text-gold">Plan ahead</p>
                <ul className="mt-2 space-y-2">
                  {advice.map(({ text, Icon }) => (
                    <li key={text} className="flex gap-2 text-xs leading-relaxed text-warm-cream/90">
                      <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold" aria-hidden="true" />
                      <span>{text}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}

          {error && (
            <p className="mt-3 rounded-lg border border-deep-crimson/50 bg-dark-burgundy p-2 text-xs leading-relaxed text-warm-cream" role="alert">
              Forecast unavailable. {error}
            </p>
          )}

          {isLoading && (
            <p className="mt-3 text-xs text-warm-cream/75" role="status">
              Loading the latest forecast…
            </p>
          )}

          <button
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={isLoading}
            className="mt-4 flex min-h-9 w-full items-center justify-center gap-2 rounded-lg border border-gold/50 bg-dark-burgundy px-3 text-xs font-semibold text-warm-cream transition hover:bg-dark-burgundy/80 disabled:cursor-wait disabled:opacity-60"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh forecast
          </button>
          <p className="mt-2 text-center text-[10px] text-warm-cream/60">Weather data by Open-Meteo</p>
        </section>
      )}
    </div>
  );
}

interface MapAreaProps {
  selectedSpotId: string | null;
  focusRequest: number;
  walkingRoute: WalkingRoute | null;
  locations: readonly SpotRow[];
  totalLocationCount: number;
  isLoading: boolean;
  loadError: string | null;
  onLocateLocation: (location: SpotRow) => void;
  onViewDetails: (location: SpotRow) => void;
  onRetry: () => void;
  isFilterOpen: boolean;
  onToggleFilter: () => void;
  onShareSpotClick?: () => void;
  onGetDirections?: (location: SpotRow) => void;
}

interface SpotPopupContentProps {
  location: SpotRow;
  onViewDetails: (location: SpotRow) => void;
  onGetDirections?: (location: SpotRow) => void;
}

function SpotPopupContent({
  location,
  onViewDetails,
  onGetDirections,
}: SpotPopupContentProps) {
  const [isImageAvailable, setIsImageAvailable] = useState(Boolean(location.image_url));

  useEffect(() => {
    setIsImageAvailable(Boolean(location.image_url));
  }, [location.image_path, location.image_url]);

  return (
    <div
      className="overflow-hidden rounded-xl"
      style={{ width: 'clamp(150px, 48vw, 200px)' }}
    >
      {isImageAvailable && location.image_url && (
        <div className="h-20 w-full overflow-hidden bg-slate-100">
          <SignedSpotImage
            imagePath={location.image_path}
            imageUrl={location.image_url}
            alt={location.name}
            className="h-full w-full object-cover"
            onUnavailable={() => setIsImageAvailable(false)}
          />
        </div>
      )}

      <div className="space-y-1.5 px-1 pt-2">
        <strong className="block break-words border-l-2 border-gold pl-2 text-[13px] font-bold leading-snug text-slate-900">
          {location.name}
        </strong>
        <button
          type="button"
          onClick={() => onViewDetails(location)}
          className="min-h-10 w-full rounded-xl bg-dark-burgundy px-3 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-deep-maroon focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy focus-visible:ring-offset-2"
        >
          View Details
        </button>
        <button
          type="button"
          onClick={() => onGetDirections?.(location)}
          className="min-h-10 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy focus-visible:ring-offset-2"
        >
          Get Directions
        </button>
      </div>
    </div>
  );
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

function KeepOpenPopupVisible() {
  const map = useMap();

  useEffect(() => {
    let firstFrame = 0;
    let secondFrame = 0;

    const keepPopupVisible = () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
      firstFrame = window.requestAnimationFrame(() => {
        secondFrame = window.requestAnimationFrame(() => {
          const popup = map.getContainer().querySelector<HTMLElement>('.leaflet-popup');
          if (!popup) return;

          const mapBounds = map.getContainer().getBoundingClientRect();
          const popupBounds = popup.getBoundingClientRect();
          const padding = 16;
          let visualShiftX = 0;
          let visualShiftY = 0;

          if (popupBounds.left < mapBounds.left + padding) {
            visualShiftX = mapBounds.left + padding - popupBounds.left;
          } else if (popupBounds.right > mapBounds.right - padding) {
            visualShiftX = mapBounds.right - padding - popupBounds.right;
          }

          if (popupBounds.top < mapBounds.top + padding) {
            visualShiftY = mapBounds.top + padding - popupBounds.top;
          } else if (popupBounds.bottom > mapBounds.bottom - padding) {
            visualShiftY = mapBounds.bottom - padding - popupBounds.bottom;
          }

          if (visualShiftX || visualShiftY) {
            map.panBy([-visualShiftX, -visualShiftY], { animate: false });
          }
        });
      });
    };

    map.on('popupopen zoomend', keepPopupVisible);
    return () => {
      map.off('popupopen zoomend', keepPopupVisible);
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [map]);

  return null;
}

function FitWalkingRoute({ route }: { route: WalkingRoute | null }) {
  const map = useMap();

  useEffect(() => {
    if (!route) return;

    map.fitBounds(route.coordinates, {
      padding: [48, 48],
      maxZoom: 17,
      animate: true,
    });
  }, [map, route]);

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

    const target = marker.getLatLng();
    const targetZoom = Math.max(map.getZoom(), 17);
    const mapAlreadyFocused =
      map.getCenter().distanceTo(target) < 1 && map.getZoom() === targetZoom;
    const openPopupAfterMove = () => {
      marker.openPopup();
    };

    marker.closePopup();
    if (mapAlreadyFocused) {
      openPopupAfterMove();
      return;
    }

    map.once('moveend', openPopupAfterMove);
    map.flyTo(target, targetZoom, {
      animate: true,
      duration: 0.6,
    });

    return () => {
      map.off('moveend', openPopupAfterMove);
    };
  }, [map, markerRefs, selectedSpotId, focusRequest]);

  return null;
}

const BULSU_MENESES_COORDINATES: [number, number] = [
  BULSU_MENESES_CAMPUS.latitude,
  BULSU_MENESES_CAMPUS.longitude,
];

// Keep the map within a 1.75 km radius so nearby cafes remain reachable.
const CAMPUS_RADIUS_METERS = 1750;
const CAMPUS_LATITUDE_OFFSET = CAMPUS_RADIUS_METERS / 111_320;
const CAMPUS_LONGITUDE_OFFSET =
  CAMPUS_RADIUS_METERS /
  (111_320 * Math.cos((BULSU_MENESES_CAMPUS.latitude * Math.PI) / 180));
const CAMPUS_VICINITY_BOUNDS: L.LatLngBoundsExpression = [
  [
    BULSU_MENESES_CAMPUS.latitude - CAMPUS_LATITUDE_OFFSET,
    BULSU_MENESES_CAMPUS.longitude - CAMPUS_LONGITUDE_OFFSET,
  ],
  [
    BULSU_MENESES_CAMPUS.latitude + CAMPUS_LATITUDE_OFFSET,
    BULSU_MENESES_CAMPUS.longitude + CAMPUS_LONGITUDE_OFFSET,
  ],
];

// Put this right here! (Restoring the missing campusIcon)
const campusIcon = L.divIcon({
  className: 'tambyte-campus-marker',
  html: '<span aria-hidden="true"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

function createSpotIcon(isSelected: boolean, isOpen: boolean) {
  return L.divIcon({
    className: `tambyte-spot-marker${isOpen ? ' tambyte-spot-marker-open' : ''}${isSelected ? ' tambyte-spot-marker-selected' : ''}`,
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
  walkingRoute,
  locations,
  totalLocationCount,
  isLoading,
  loadError,
  onLocateLocation,
  onViewDetails,
  onRetry,
  isFilterOpen,
  onToggleFilter,
  onShareSpotClick,
  onGetDirections,
}: MapAreaProps) {
  const validLocations = locations.filter(hasValidCoordinates);
  const markerRefs = useRef(new Map<string, L.Marker>());
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [, setOpeningClockTick] = useState(0);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setOpeningClockTick((tick) => tick + 1);
    }, 60_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Flies camera to current user location when button is tapped
  const handleLocateMe = () => {
    if (userLocation && mapRef.current) {
      mapRef.current.flyTo(userLocation, 17, { animate: true, duration: 0.8 });
    } else if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((pos) => {
        const coords: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setUserLocation(coords);
        mapRef.current?.flyTo(coords, 17, { animate: true, duration: 0.8 });
      });
    }
  };

  // Real-time GPS position watcher (Client-side only)
  useEffect(() => {
    if (!navigator.geolocation) return;

    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation([pos.coords.latitude, pos.coords.longitude]);
      },
      (err) => console.log('Location watch notice:', err.message),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

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

      {/* Full-Bleed Map Container (Fills the entire screen) */}
      <div className="relative isolate flex min-h-[min(420px,55svh)] flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-inner sm:min-h-[min(500px,60svh)]">
        <MapContainer
          ref={mapRef}
          center={BULSU_MENESES_COORDINATES}
          zoom={16}
          minZoom={15}
          maxZoom={18}
          maxBounds={CAMPUS_VICINITY_BOUNDS}
          maxBoundsViscosity={0.8}
          closePopupOnClick
          scrollWheelZoom
          zoomControl={false}
          className="h-full min-h-[420px] w-full flex-1 sm:min-h-[500px]"
          aria-label={`Map centered on ${BULSU_MENESES_CAMPUS.name}`}
        >
          <MapResizeHandler />
          <KeepOpenPopupVisible />
          <FocusSelectedSpot
            selectedSpotId={selectedSpotId}
            focusRequest={focusRequest}
            markerRefs={markerRefs}
          />
          <FitWalkingRoute route={walkingRoute} />
          <CampusWeatherBadge />
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxNativeZoom={18}
            maxZoom={18}
          />

          {walkingRoute && (
            <Polyline
              positions={walkingRoute.coordinates}
              pathOptions={{ color: '#970023', weight: 6, opacity: 0.85 }}
            />
          )}

          {/* Real-time "You Are Here" Pointer */}
          {userLocation && (
            <Marker position={userLocation} icon={userLocationIcon}>
              <Popup>
                <strong>You are here</strong>
                <br />
                <span className="text-xs text-slate-500">Your live GPS location</span>
              </Popup>
            </Marker>
          )}

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
              icon={createSpotIcon(
                selectedSpotId === location.id,
                getOpeningStatus(location.hours) === 'open',
              )}
              eventHandlers={{
                click: () => onLocateLocation(location),
              }}
            >
              <Popup autoPanPadding={[20, 48]} closeOnClick maxWidth={220} minWidth={0}>
                <SpotPopupContent
                  location={location}
                  onViewDetails={onViewDetails}
                  onGetDirections={onGetDirections}
                />
              </Popup>
            </Marker>
          ))}
        </MapContainer>

       {/* Campus Legend (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 z-[1000] flex max-w-[calc(100%-1.5rem)] items-center gap-x-2 rounded-lg border border-slate-200 bg-white/95 px-3 py-2 text-xs font-medium text-slate-700 shadow-sm backdrop-blur-sm sm:bottom-4 sm:left-4">
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-dark-burgundy" aria-hidden="true" />
            <span className="max-[380px]:hidden">BulSU – Meneses Campus</span>
            <span className="hidden max-[380px]:inline">Campus</span>
          </span>
          <span className="text-slate-300" aria-hidden="true">|</span>
          <span className="inline-flex items-center gap-2 whitespace-nowrap">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-deep-crimson" aria-hidden="true" />
            <span>Food &amp; shops</span>
          </span>
        </div>

        {/* Floating Action Buttons Stack (Bottom-Right) */}
        <div className="absolute bottom-20 right-3.5 z-[1000] flex flex-col items-center gap-2.5 sm:bottom-8">
          {/* Locate Me Button */}
          <button
            type="button"
            onClick={handleLocateMe}
            className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-blue-600 shadow-md hover:scale-110 active:scale-95 transition-all border border-slate-200 focus:outline-none"
            title="Locate Me"
            aria-label="Locate Me"
          >
            <Navigation className="h-4 w-4 fill-blue-600 text-blue-600 -rotate-45" />
          </button>

          <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-700 shadow-md">
            <button
              type="button"
              onClick={() => mapRef.current?.zoomIn()}
              className="flex h-9 w-10 items-center justify-center transition-colors hover:bg-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dark-burgundy"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <Plus className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="mx-2 border-t border-slate-200" />
            <button
              type="button"
              onClick={() => mapRef.current?.zoomOut()}
              className="flex h-9 w-10 items-center justify-center transition-colors hover:bg-warm-cream focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-dark-burgundy"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <Minus className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          {/* Share Spot Button */}
          <button
            type="button"
            onClick={onShareSpotClick}
            className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/70 bg-deep-crimson text-white shadow-lg transition-all hover:scale-110 hover:bg-dark-burgundy active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-offset-2"
            title="Share a Spot"
            aria-label="Share a Spot"
          >
            <Plus className="h-5 w-5 stroke-[2.5]" />
          </button>
        </div>

        {/* Sleek Professional Campus Zone Badge (Top Center) */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] pointer-events-none">
          <div className="flex items-center gap-2 rounded-full border border-slate-200/80 bg-white/90 px-3.5 py-1.5 text-xs font-semibold text-slate-800 shadow-md backdrop-blur-md">
            <span className="h-2 w-2 rounded-full bg-deep-crimson animate-pulse" />
            <span>BulSU Meneses Vicinity</span>
          </div>
        </div>
      </div>

      {(loadError || isLoading || validLocations.length === 0) && (
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
            <p className="text-xs text-slate-600" role="status">Finding places...</p>
          ) : totalLocationCount === 0 ? (
            <p className="text-xs text-slate-600">No places found.</p>
          ) : (
            <p className="text-xs text-slate-600">No places match the current filters.</p>
          )}
        </div>
      )}
    </main>
  );
}
