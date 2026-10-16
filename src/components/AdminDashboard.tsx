import React, { useEffect, useRef, useState } from 'react';
import { supabase, Spot, uploadSpotImage } from '../lib/supabase';
import { CheckCircle2, Trash2, Plus, Clock, MapPin, X, AlertTriangle, ArrowLeft, Pencil, ShieldCheck, History, ImagePlus, Filter } from 'lucide-react';
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet';
import { BULSU_MENESES_CAMPUS } from '../constants/locations';
import { getOpeningStatus } from '../utils/location';

const SPOT_CATEGORIES: Spot['category'][] = [
  'Food',
  'Study',
  'Relaxation',
  'Recreation',
  'Shopping',
  'Essentials',
  'Other',
];

const AMENITY_FILTERS = [
  { field: 'has_outlets', label: 'Outlets' },
  { field: 'has_wifi', label: 'Wi-Fi' },
  { field: 'has_aircon', label: 'Air conditioning' },
  { field: 'has_restroom', label: 'Restroom' },
  { field: 'is_shaded', label: 'Shaded' },
  { field: 'is_quiet', label: 'Quiet' },
] as const satisfies ReadonlyArray<{ field: keyof Spot; label: string }>;

function parseReportCoordinates(text?: string | null): { lat: number; lng: number } | null {
  if (!text) return null;
  const latMatch = text.match(/Lat(?:itude)?[:\s]+([0-9.-]+)/i);
  const lngMatch = text.match(/L(?:ng|ong(?:itude)?)[:\s]+([0-9.-]+)/i);

  if (latMatch && lngMatch) {
    const lat = parseFloat(latMatch[1]);
    const lng = parseFloat(lngMatch[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { lat, lng };
    }
  }
  return null;
}

function createDefaultSpotFormData(): Omit<Spot, 'id' | 'approved' | 'created_at'> {
  return {
    name: '',
    category: 'Food' as Spot['category'],
    description: '',
    location_description: '',
    latitude: BULSU_MENESES_CAMPUS.latitude,
    longitude: BULSU_MENESES_CAMPUS.longitude,
    hours: '8:00 AM - 5:00 PM',
    open_time: '08:00:00',
    close_time: '17:00:00',
    budget_range: 'Php 50 - 100',
    has_outlets: false,
    has_wifi: false,
    has_aircon: false,
    has_restroom: false,
    is_shaded: false,
    is_quiet: false,
    image_url: null,
  };
}

type SpotEditForm = {
  name: string;
  category: Spot['category'];
  description: string;
  location_description: string;
  latitude: string;
  longitude: string;
  hours: string;
  budget_range: string;
  has_outlets: boolean;
  has_wifi: boolean;
  has_aircon: boolean;
  has_restroom: boolean;
  is_shaded: boolean;
  is_quiet: boolean;
};

// Click listener to pick coordinates on the map
function MapPicker({ coords, onPick }: { coords: [number, number]; onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={coords} />;
}

interface AdminDashboardProps {
  isOpen: boolean;
  onClose: () => void;
  onSpotsUpdated: () => void;
}

export function AdminDashboard({ isOpen, onClose, onSpotsUpdated }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'add' | 'logs' | 'reports'>('pending');
  const [pendingSpots, setPendingSpots] = useState<Spot[]>([]);
  const [approvedSpots, setApprovedSpots] = useState<Spot[]>([]);
  const [adminLogs, setAdminLogs] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [activeSearchQuery, setActiveSearchQuery] = useState('');
  const [areSpotFiltersOpen, setAreSpotFiltersOpen] = useState(false);
  const [filterOpenNow, setFilterOpenNow] = useState(false);
  const [, setOpenStatusRevision] = useState(0);
  const [selectedAmenityFilters, setSelectedAmenityFilters] = useState<Array<(typeof AMENITY_FILTERS)[number]['field']>>([]);
  const [budgetFilter, setBudgetFilter] = useState('__all__');
  const [editingSpot, setEditingSpot] = useState<Spot | null>(null);
  const [editFormData, setEditFormData] = useState<SpotEditForm | null>(null);
  const [newSpotImage, setNewSpotImage] = useState<File | null>(null);
  const [editSpotImage, setEditSpotImage] = useState<File | null>(null);
  const editSpotImageInputRef = useRef<HTMLInputElement>(null);
  const [editSpotImagePreview, setEditSpotImagePreview] = useState<string | null>(null);
  const [spotToDelete, setSpotToDelete] = useState<{ id: string; name: string } | null>(null);
  const [resolvingReportId, setResolvingReportId] = useState<string | null>(null);

  // Form state for adding a verified spot directly
  const [formData, setFormData] = useState(createDefaultSpotFormData);

  useEffect(() => {
    if (!editSpotImage) {
      setEditSpotImagePreview(null);
      return;
    }

    const previewUrl = URL.createObjectURL(editSpotImage);
    setEditSpotImagePreview(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [editSpotImage]);

  useEffect(() => {
    if (!filterOpenNow) return;

    const intervalId = window.setInterval(() => {
      setOpenStatusRevision((revision) => revision + 1);
    }, 60_000);
    return () => window.clearInterval(intervalId);
  }, [filterOpenNow]);

  useEffect(() => {
    if (isOpen) {
      loadSpots();
    }
  }, [isOpen]);

  async function loadSpots() {
    setLoading(true);
    try {
      // 1. Fetch pending spots (Student submissions)
      const { data: pending } = await supabase
        .from('spots')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });

      // 2. Fetch approved spots
      const { data: approved } = await supabase
        .from('spots')
        .select('*')
        .eq('approved', true)
        .order('name', { ascending: true });

      setPendingSpots((pending as Spot[]) || []);
      setApprovedSpots((approved as Spot[]) || []);

      // Fetch latest 50 admin audit actions
      const { data: logs } = await supabase
        .from('admin_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);
      setAdminLogs(logs || []);
      const { data: reportList } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false });
      setReports(reportList || []);
    } catch (err) {
      console.error('Error loading spots:', err);
    } finally {
      setLoading(false);
    }
  }

  async function logAction(action: string, spotName: string, details?: string) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('admin_logs').insert([
      {
        admin_id: user.id,
        admin_email: user.email || 'Admin',
        action,
        spot_name: spotName,
        details: details || null,
      },
    ]);
  }

  // Action: Approve student submission
  async function handleApprove(id: string, spotName: string) {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      setActionMessage(`Unable to verify the admin account: ${userError?.message ?? 'No signed-in user.'}`);
      return;
    }

    const { data, error } = await supabase
      .from('spots')
      .update({
        approved: true,
        approved_by: user.id,
        approved_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('approved', false)
      .select('id')
      .maybeSingle();

    if (error) {
      setActionMessage(`Unable to approve spot: ${error.message}`);
      return;
    }
    if (!data) {
      setActionMessage('This submission is no longer pending. Refresh the dashboard and try again.');
      await loadSpots();
      return;
    }

    const spotData = pendingSpots.find((s) => s.id === id);
    const approveDetails = spotData
      ? `Category: ${spotData.category} · Hours: ${spotData.hours}${spotData.has_wifi ? ' · Wi-Fi' : ''}${spotData.has_outlets ? ' · Outlets' : ''}`
      : 'Approved student contribution to live map';

    await logAction('APPROVED_SPOT', spotName, approveDetails);
    setActionMessage('Spot approved and added to the live map!');
    await loadSpots();
    onSpotsUpdated();
  }

  function openEditSpot(spot: Spot) {
    setEditingSpot(spot);
    setEditSpotImage(null);
    setEditFormData({
      name: spot.name,
      category: spot.category,
      description: spot.description ?? '',
      location_description: spot.location_description ?? '',
      latitude: String(spot.latitude),
      longitude: String(spot.longitude),
      hours: spot.hours,
      budget_range: spot.budget_range ?? '',
      has_outlets: Boolean(spot.has_outlets),
      has_wifi: Boolean(spot.has_wifi),
      has_aircon: Boolean(spot.has_aircon),
      has_restroom: Boolean(spot.has_restroom),
      is_shaded: Boolean(spot.is_shaded),
      is_quiet: Boolean(spot.is_quiet),
    });
  }

  async function handleUpdateSpot(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingSpot || !editFormData) return;

    const latitude = Number(editFormData.latitude);
    const longitude = Number(editFormData.longitude);
    if (
      !Number.isFinite(latitude) ||
      latitude < -90 ||
      latitude > 90 ||
      !Number.isFinite(longitude) ||
      longitude < -180 ||
      longitude > 180
    ) {
      setActionMessage('Enter valid latitude and longitude coordinates before saving.');
      return;
    }
    if (!editFormData.name.trim() || !editFormData.hours.trim()) {
      setActionMessage('Place name and operating hours are required.');
      return;
    }

    setIsSavingEdit(true);
    let imageUrl = editingSpot.image_url ?? null;
    try {
      if (editSpotImage) {
        imageUrl = await uploadSpotImage(editSpotImage);
      }
    } catch (error) {
      setIsSavingEdit(false);
      setActionMessage(error instanceof Error ? error.message : 'Unable to upload image.');
      return;
    }

    const { data, error } = await supabase
      .from('spots')
      .update({
        name: editFormData.name.trim(),
        category: editFormData.category,
        description: editFormData.description.trim(),
        location_description: editFormData.location_description.trim(),
        latitude,
        longitude,
        hours: editFormData.hours.trim(),
        budget_range: editFormData.budget_range.trim(),
        has_outlets: editFormData.has_outlets,
        has_wifi: editFormData.has_wifi,
        has_aircon: editFormData.has_aircon,
        has_restroom: editFormData.has_restroom,
        is_shaded: editFormData.is_shaded,
        is_quiet: editFormData.is_quiet,
        image_url: imageUrl,
        approved: editingSpot.approved,
        admin_edited: true,
        ...(!editingSpot.approved && {
          approved_by: null,
          approved_at: null,
        }),
      })
      .eq('id', editingSpot.id)
      .eq('approved', editingSpot.approved)
      .select('id')
      .maybeSingle();
    setIsSavingEdit(false);

    if (error) {
      setActionMessage(`Unable to save changes: ${error.message}`);
      return;
    }
    if (!data) {
      setActionMessage('This submission is no longer pending. Refresh the dashboard and try again.');
      setEditingSpot(null);
      setEditFormData(null);
      setEditSpotImage(null);
      await loadSpots();
      return;
    }

    // 1. Detect exactly which fields changed
    const changes: string[] = [];
    if (editingSpot.name.trim() !== editFormData.name.trim()) {
      changes.push(`Name: "${editingSpot.name.trim()}" → "${editFormData.name.trim()}"`);
    }

    const prevLat = Number(editingSpot.latitude);
    const prevLng = Number(editingSpot.longitude);
    if (Math.abs(prevLat - latitude) > 0.00001 || Math.abs(prevLng - longitude) > 0.00001) {
      changes.push(
        `Location: (${prevLat.toFixed(5)}, ${prevLng.toFixed(5)}) → (${latitude.toFixed(5)}, ${longitude.toFixed(5)})`
      );
    }

    if (editingSpot.category !== editFormData.category) {
      changes.push(`Category: "${editingSpot.category}" → "${editFormData.category}"`);
    }
    if (editingSpot.hours.trim() !== editFormData.hours.trim()) {
      changes.push(`Hours: "${editingSpot.hours.trim()}" → "${editFormData.hours.trim()}"`);
    }
    if ((editingSpot.budget_range || '').trim() !== editFormData.budget_range.trim()) {
      changes.push(`Budget: "${editingSpot.budget_range || 'None'}" → "${editFormData.budget_range.trim() || 'None'}"`);
    }
    if (Boolean(editingSpot.has_wifi) !== editFormData.has_wifi) {
      changes.push(editFormData.has_wifi ? '+Added Wi-Fi' : '-Removed Wi-Fi');
    }
    if (Boolean(editingSpot.has_outlets) !== editFormData.has_outlets) {
      changes.push(editFormData.has_outlets ? '+Added Outlets' : '-Removed Outlets');
    }
    if (Boolean(editingSpot.has_aircon) !== editFormData.has_aircon) {
      changes.push(editFormData.has_aircon ? '+Added Aircon' : '-Removed Aircon');
    }
    if (Boolean(editingSpot.is_shaded) !== editFormData.is_shaded) {
      changes.push(editFormData.is_shaded ? '+Added Shaded' : '-Removed Shaded');
    }
    if (Boolean(editingSpot.is_quiet) !== editFormData.is_quiet) {
      changes.push(editFormData.is_quiet ? '+Marked Quiet' : '-Unmarked Quiet');
    }

    let changeSummary = changes.length > 0 
      ? changes.join(' · ') 
      : 'Saved without field changes';

    // Tag the log if this edit was triggered by a student report fix
    if (resolvingReportId) {
      changeSummary = `[Resolved Student Report] ${changeSummary}`;
    }

    await logAction('EDITED_SPOT', editFormData.name.trim(), changeSummary);
    if (resolvingReportId) {
      await supabase.from('reports').delete().eq('id', resolvingReportId);
      setResolvingReportId(null);
    }

    setEditingSpot(null);
    setEditFormData(null);
    setEditSpotImage(null);
    setActionMessage(
      editingSpot.approved
        ? 'Active place updated successfully.'
        : 'Changes saved. This submission still needs admin approval.',
    );
    await loadSpots();
    onSpotsUpdated();
  }

  async function executeDelete() {
    if (!spotToDelete) return;
    const { id, name } = spotToDelete;

    const { error } = await supabase
      .from('spots')
      .delete()
      .eq('id', id);

    if (error) {
      setActionMessage(`Unable to remove spot: ${error.message}`);
      setSpotToDelete(null);
      return;
    }

    await logAction('DELETED_SPOT', name, 'Deleted spot from database');
    setActionMessage(`Permanently removed "${name}".`);
    setSpotToDelete(null);
    await loadSpots();
    onSpotsUpdated();
  }

  async function handleDismissReport(reportId: string, spotName: string) {
    await supabase.from('reports').delete().eq('id', reportId);
    await logAction('DISMISSED_REPORT', spotName, 'Admin dismissed student report');
    setActionMessage('Report dismissed.');
    await loadSpots();
  }

  // Action: Admin manually adding a verified spot
  async function handleCreateSpot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      const imageUrl = newSpotImage ? await uploadSpotImage(newSpotImage) : null;
      const { error } = await supabase.from('spots').insert([
        {
          ...formData,
          image_url: imageUrl,
          approved: true,
        },
      ]);
      if (error) throw error;

      setActionMessage('New spot added directly to map!');
      setFormData(createDefaultSpotFormData());
      setNewSpotImage(null);
      setActiveTab('approved');
      await loadSpots();
      onSpotsUpdated();
    } catch (error) {
      setActionMessage(error instanceof Error ? `Unable to add spot: ${error.message}` : 'Unable to add spot.');
    } finally {
      setLoading(false);
    }
  }

  const budgetOptions = [...new Set(
    approvedSpots
      .map((spot) => spot.budget_range?.trim())
      .filter((budget): budget is string => Boolean(budget)),
  )].sort((first, second) => first.localeCompare(second));
  const filteredApprovedSpots = approvedSpots.filter((spot) => {
    const query = activeSearchQuery.trim().toLowerCase();
    const matchesSearch =
      !query ||
      spot.name.toLowerCase().includes(query) ||
      spot.category.toLowerCase().includes(query);
    const matchesOpenStatus = !filterOpenNow || getOpeningStatus(spot.hours) === 'open';
    const matchesAmenities = selectedAmenityFilters.every((field) => Boolean(spot[field]));
    const budget = spot.budget_range?.trim() ?? '';
    const matchesBudget =
      budgetFilter === '__all__' ||
      (budgetFilter === '__none__' ? !budget : budget === budgetFilter);

    return matchesSearch && matchesOpenStatus && matchesAmenities && matchesBudget;
  });
  const hasActiveSpotFilters =
    filterOpenNow || selectedAmenityFilters.length > 0 || budgetFilter !== '__all__';

  if (!isOpen) return null;

  return (
<div className="admin-dashboard fixed inset-0 z-[2000] flex flex-col overflow-hidden bg-[#F9F2E3]">
      {/* Top Header */}
      <header className="admin-header flex min-h-16 flex-col items-stretch gap-3 border-b px-3 py-3 shadow-sm sm:px-4 lg:h-16 lg:flex-row lg:items-center lg:justify-between lg:px-6 lg:py-0">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={onClose}
            className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Map
          </button>
          <h1 className="text-base font-bold text-slate-900 sm:text-lg">Tambyte Admin Management</h1>
        </div>

        {/* Tab Navigation */}
        <div className="grid w-full grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 text-xs font-semibold sm:grid-cols-3 lg:flex lg:w-auto">
          {/* 1. Active Places */}
          <button
            onClick={() => setActiveTab('approved')}
            className={`rounded-lg px-2 py-1.5 text-center transition-all sm:px-3 ${
              activeTab === 'approved'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Active Places ({approvedSpots.length})
          </button>

          {/* 2. Contributions */}
          <button
            onClick={() => setActiveTab('pending')}
            className={`rounded-lg px-2 py-1.5 text-center transition-all sm:px-3 ${
              activeTab === 'pending'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Contributions ({pendingSpots.length})
          </button>

          {/* 3. Reports */}
          <button
            onClick={() => setActiveTab('reports')}
            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center transition-all sm:px-3 ${
              activeTab === 'reports'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 text-rose-400" />
            Reports ({reports.length})
          </button>

          {/* 4. Add New Spot */}
          <button
            onClick={() => setActiveTab('add')}
            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center transition-all sm:px-3 ${
              activeTab === 'add'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Plus className="h-3.5 w-3.5" />
            Add New Spot
          </button>

          {/* 5. History */}
          <button
            onClick={() => setActiveTab('logs')}
            className={`flex items-center justify-center gap-1 rounded-lg px-2 py-1.5 text-center transition-all sm:px-3 ${
              activeTab === 'logs'
                ? 'bg-dark-burgundy text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History ({adminLogs.length})
          </button>
        </div>
      </header>

      {/* Action Notification */}
      {actionMessage && (
        <div className="bg-dark-burgundy px-6 py-2 text-center text-xs font-semibold text-white">
          {actionMessage}
        </div>
      )}

      {/* Main Content Body */}
      <main className="mx-auto w-full max-w-5xl flex-1 overflow-y-auto p-3 sm:p-6">
        {loading ? (
          <p className="text-center text-sm text-slate-500 py-10">Loading database records...</p>
        ) : activeTab === 'pending' ? (
          /* TAB 1: PENDING STUDENT CONTRIBUTIONS */
          <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-200 pb-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Student Submissions Awaiting Approval
                </h2>
                <p className="text-xs text-slate-500">
                  Review student-contributed spots before publishing to the live campus map.
                </p>
              </div>
              <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-deep-maroon border border-gold/40">
                {pendingSpots.length} Pending
              </span>
            </div>

            {pendingSpots.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700">All caught up!</p>
                <p className="text-xs text-slate-500">No pending student contributions to review.</p>
              </div>
            ) : (
              /* 3 Columns Responsive Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {pendingSpots.map((spot: any) => {
                  // Checks for matching name or coordinates within ~30 meters
                  const duplicateMatch = approvedSpots.find(
                    (app) =>
                      app.name.trim().toLowerCase() === spot.name.trim().toLowerCase() ||
                      Math.hypot(Number(app.latitude) - Number(spot.latitude), Number(app.longitude) - Number(spot.longitude)) < 0.0003
                  );

                  return (
                    <div
                      key={spot.id}
                      className={`flex flex-col justify-between rounded-2xl border bg-white p-4 shadow-sm hover:shadow-md transition-shadow ${
                        duplicateMatch ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
                      }`}
                    >
                      <div className="space-y-3">
                        {spot.image_url && (
                          <img
                            src={spot.image_url}
                            alt={`Photo submitted for ${spot.name}`}
                            className="h-36 w-full rounded-xl object-cover"
                          />
                        )}
                        {/* Duplicate Alert Banner */}
                        {duplicateMatch && (
                          <div className="flex items-center gap-1.5 rounded-xl bg-amber-50 p-2 text-xs font-semibold text-amber-800 border border-amber-200">
                            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                            <span>Possible duplicate of "{duplicateMatch.name}"</span>
                          </div>
                        )}

                        {/* Card Header: Title & Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-bold text-sm text-slate-900 leading-snug">{spot.name}</h3>
                          {spot.location_description && (
                            <p className="text-[11px] text-slate-500 mt-0.5">{spot.location_description}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-deep-maroon border border-gold/30">
                          {spot.category}
                        </span>
                      </div>

                      {/* Info Badges */}
                     <div className="admin-info space-y-1.5 rounded-xl border p-2.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span>{spot.hours}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span className="font-mono text-[11px]">
                            {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                          </span>
                        </div>
                        {spot.budget_range && (
                          <div className="text-[11px] font-medium">
                            Budget: <span className="font-bold text-deep-maroon">{spot.budget_range}</span>
                          </div>
                        )}
                      </div>

                      {/* Amenities Chips */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Amenities Tagged
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {spot.has_outlets && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Outlets
                            </span>
                          )}
                          {spot.has_wifi && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Free Wi-Fi
                            </span>
                          )}
                          {spot.has_aircon && (
                            <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 border border-cyan-200">
                              Aircon
                            </span>
                          )}
                          {spot.is_shaded && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Shaded
                            </span>
                          )}
                          {spot.is_quiet && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                              Quiet
                            </span>
                          )}
                          {spot.has_restroom && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                              Restroom
                            </span>
                          )}
                          {!spot.has_outlets && !spot.has_wifi && !spot.has_aircon && !spot.is_shaded && !spot.is_quiet && !spot.has_restroom && (
                            <span className="text-[11px] text-slate-400 italic">None tagged</span>
                          )}
                        </div>
                      </div>

                      {/* Student Description / Tips */}
                      {spot.description && (
                        <div className="rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs italic text-dark-burgundy">
                          "{spot.description}"
                        </div>
                      )}
                    </div>

                    {/* Actions: Approve / Reject Buttons */}
                    <div className="flex items-center gap-2 pt-4 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => setSpotToDelete({ id: spot.id, name: spot.name })}
                        className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-rose-200 bg-white py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Reject
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditSpot(spot)}
                        className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl border border-gold/50 bg-gold/10 py-2 text-xs font-semibold text-dark-burgundy transition-colors hover:bg-gold/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleApprove(spot.id, spot.name)}
                        className="flex min-w-0 flex-1 items-center justify-center gap-1 rounded-xl bg-dark-burgundy py-2 text-xs font-semibold text-white hover:bg-deep-maroon shadow-sm transition-colors"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Approve
                      </button>
                    </div>
                  </div>
                  );
                })}
              </div>
            )}
          </div>
          
        ) : activeTab === 'approved' ? (
          /* TAB 2: CURRENT ACTIVE SPOTS */
          <div className="space-y-4">
            {/* Tab Header with Search and Filters */}
            <div className="space-y-3 border-b border-slate-200 pb-3">
              <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Published Campus Places ({filteredApprovedSpots.length} of {approvedSpots.length})
                  </h2>
                  <p className="text-xs text-slate-500">
                    Spots currently visible to all students on the live map.
                  </p>
                </div>
                <div className="flex w-full items-center gap-2 sm:w-auto">
                  <input
                    type="text"
                    placeholder="Search active spots..."
                    value={activeSearchQuery}
                    onChange={(e) => setActiveSearchQuery(e.target.value)}
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-dark-burgundy focus:outline-none focus:ring-1 focus:ring-dark-burgundy/30 sm:w-64 sm:flex-none"
                  />
                  <button
                    type="button"
                    onClick={() => setAreSpotFiltersOpen((open) => !open)}
                    aria-expanded={areSpotFiltersOpen}
                    aria-controls="active-spot-filters"
                    className={`inline-flex shrink-0 items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy ${
                      areSpotFiltersOpen || hasActiveSpotFilters
                        ? 'border-dark-burgundy bg-dark-burgundy text-white'
                        : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <Filter className="h-3.5 w-3.5" aria-hidden="true" />
                    Filters
                    {hasActiveSpotFilters && (
                      <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-white px-1 text-[10px] font-bold text-dark-burgundy">
                        {Number(filterOpenNow) + selectedAmenityFilters.length + Number(budgetFilter !== '__all__')}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              {areSpotFiltersOpen && (
              <div id="active-spot-filters" className="flex flex-wrap items-center gap-x-5 gap-y-3 pt-1">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={filterOpenNow}
                    onChange={(event) => setFilterOpenNow(event.target.checked)}
                    className="accent-dark-burgundy"
                  />
                  Open now
                </label>
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                  Budget
                  <select
                    value={budgetFilter}
                    onChange={(event) => setBudgetFilter(event.target.value)}
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="__all__">Any budget</option>
                    <option value="__none__">No budget listed</option>
                    {budgetOptions.map((budget) => (
                      <option key={budget} value={budget}>{budget}</option>
                    ))}
                  </select>
                </label>
                <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <legend className="sr-only">Filter by amenities</legend>
                  {AMENITY_FILTERS.map(({ field, label }) => (
                    <label key={field} className="flex items-center gap-1.5 text-xs text-slate-700">
                      <input
                        type="checkbox"
                        checked={selectedAmenityFilters.includes(field)}
                        onChange={(event) =>
                          setSelectedAmenityFilters((selected) =>
                            event.target.checked
                              ? [...selected, field]
                              : selected.filter((amenity) => amenity !== field),
                          )
                        }
                        className="accent-dark-burgundy"
                      />
                      {label}
                    </label>
                  ))}
                </fieldset>
                {hasActiveSpotFilters && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilterOpenNow(false);
                      setSelectedAmenityFilters([]);
                      setBudgetFilter('__all__');
                    }}
                    className="text-xs font-semibold text-dark-burgundy underline underline-offset-2"
                  >
                    Clear filters
                  </button>
                )}
              </div>
              )}
            </div>

            {/* 3-Column Responsive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredApprovedSpots.length === 0 ? (
                <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-xs text-slate-500 md:col-span-2 lg:col-span-3">
                  No active spots match these search and filter settings.
                </p>
              ) : filteredApprovedSpots.map((spot: any) => (
                  <div
                    key={spot.id}
                    className="admin-card flex flex-col justify-between rounded-2xl border p-4 shadow-sm transition-all hover:shadow-md"
                  >
                    <div className="space-y-3">
                      {/* Card Title & Category */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" title="Live on Map" />
                            <h3 className="font-bold text-sm text-slate-900 leading-snug">{spot.name}</h3>
                          </div>
                          {spot.location_description && (
                            <p className="text-[11px] text-slate-500 mt-1 pl-3.5">{spot.location_description}</p>
                          )}
                        </div>
                        <span className="shrink-0 rounded-md bg-gold/20 px-2 py-0.5 text-[10px] font-bold text-deep-maroon border border-gold/30">
                          {spot.category}
                        </span>
                      </div>


                      {/* Info Details */}
                      <div className="admin-info space-y-1.5 rounded-xl border p-2.5 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span>{spot.hours}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <MapPin className="h-3.5 w-3.5 text-gold shrink-0" />
                          <span className="font-mono text-[11px]">
                            {Number(spot.latitude).toFixed(5)}, {Number(spot.longitude).toFixed(5)}
                          </span>
                        </div>
                        {spot.budget_range && (
                          <div className="text-[11px] font-medium">
                            Budget: <span className="font-bold text-deep-maroon">{spot.budget_range}</span>
                          </div>
                        )}
                      </div>

                      {/* Amenities Badges */}
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 block mb-1">
                          Amenities
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {spot.has_outlets && (
                            <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Outlets
                            </span>
                          )}
                          {spot.has_wifi && (
                            <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 border border-blue-200">
                              Wi-Fi
                            </span>
                          )}
                          {spot.has_aircon && (
                            <span className="rounded bg-cyan-50 px-1.5 py-0.5 text-[10px] font-medium text-cyan-700 border border-cyan-200">
                              Aircon
                            </span>
                          )}
                          {spot.is_shaded && (
                            <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Shaded
                            </span>
                          )}
                          {spot.is_quiet && (
                            <span className="rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-medium text-indigo-700 border border-indigo-200">
                              Quiet
                            </span>
                          )}
                          {spot.has_restroom && (
                            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700 border border-slate-200">
                              Restroom
                            </span>
                          )}
                          {!spot.has_outlets && !spot.has_wifi && !spot.has_aircon && !spot.is_shaded && !spot.is_quiet && !spot.has_restroom && (
                            <span className="text-[11px] text-slate-400 italic">None tagged</span>
                          )}
                        </div>
                      </div>

                      {/* Description */}
                      {spot.description && (
                        <p className="line-clamp-2 rounded-lg border border-gold/40 bg-gold/10 p-2 text-xs text-dark-burgundy">
                          {spot.description}
                        </p>
                      )}
                    </div>

                    {/* Card Actions */}
                    <div className="mt-3 flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                      <button
                        type="button"
                        onClick={() => openEditSpot(spot)}
                        className="flex items-center gap-1.5 rounded-xl border border-gold/50 bg-gold/10 px-3 py-1.5 text-xs font-semibold text-dark-burgundy transition-colors hover:bg-gold/20"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        Edit Spot
                      </button>
                      <button
                        onClick={() => setSpotToDelete({ id: spot.id, name: spot.name })}
                        className="flex items-center gap-1.5 rounded-xl border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete Spot
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        ) : activeTab === 'add' ? (
          /* TAB 3: ADMIN ADD NEW SPOT FORM */
          <form onSubmit={handleCreateSpot} className="mx-auto max-w-xl space-y-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
            <h2 className="text-base font-bold text-slate-900">Add Verified Campus Spot</h2>
            
            <div>
              <label className="block text-xs font-semibold text-slate-700">Place Name</label>
              <input
                required
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., College of Engineering Gazebo"
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
              />
            </div>

            <div>
              <label htmlFor="admin-new-spot-image" className="block text-xs font-semibold text-slate-700">
                Spot photo (optional)
              </label>
              <input
                id="admin-new-spot-image"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => setNewSpotImage(event.target.files?.[0] ?? null)}
                className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-xs"
              />
              <p className="mt-1 text-[11px] text-slate-500">JPEG, PNG, or WebP, up to 5 MB.</p>
              {newSpotImage && <p className="mt-1 truncate text-[11px] text-slate-600">{newSpotImage.name}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Category</label>
                <select
                  value={formData.category}
                  onChange={(e) => {
                    const category = SPOT_CATEGORIES.find((option) => option === e.target.value);
                    if (category) setFormData({ ...formData, category });
                  }}
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm bg-white"
                >
                  {SPOT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">Operating Hours</label>
                <input
                  required
                  type="text"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  placeholder="7:00 AM - 6:00 PM"
                  className="mt-1 w-full rounded-xl border border-slate-200 p-2.5 text-sm"
                />
              </div>
            </div>

            {/* Interactive Map Coordinate Selector */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Select Location on Map (Click anywhere to set pin)
                </label>
                <span className="text-[11px] font-medium text-dark-burgundy">
                  {formData.latitude.toFixed(5)}, {formData.longitude.toFixed(5)}
                </span>
              </div>
              <div className="h-44 w-full rounded-xl border border-slate-300 overflow-hidden shadow-inner">
                <MapContainer
                  center={[BULSU_MENESES_CAMPUS.latitude, BULSU_MENESES_CAMPUS.longitude]}
                  zoom={16}
                  className="h-full w-full"
                >
                  <TileLayer
                    attribution='&copy; OpenStreetMap'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <MapPicker
                    coords={[formData.latitude, formData.longitude]}
                    onPick={(lat, lng) => setFormData({ ...formData, latitude: lat, longitude: lng })}
                  />
                </MapContainer>
              </div>
            </div>

            {/* Checkbox Amenities */}
            <div className="flex flex-wrap gap-x-4 gap-y-2 pt-2">
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_outlets}
                  onChange={(e) => setFormData({ ...formData, has_outlets: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Outlets
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_wifi}
                  onChange={(e) => setFormData({ ...formData, has_wifi: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Wi-Fi
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_aircon}
                  onChange={(e) => setFormData({ ...formData, has_aircon: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Aircon
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.has_restroom}
                  onChange={(e) => setFormData({ ...formData, has_restroom: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Restroom
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_shaded}
                  onChange={(e) => setFormData({ ...formData, is_shaded: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Shaded
              </label>
              <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.is_quiet}
                  onChange={(e) => setFormData({ ...formData, is_quiet: e.target.checked })}
                  className="rounded text-dark-burgundy accent-dark-burgundy"
                />
                Quiet Area
              </label>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-dark-burgundy py-2.5 text-xs font-semibold text-white hover:bg-deep-maroon shadow-sm"
            >
              Save and Publish to Live Map
            </button>
          </form>
        ) : activeTab === 'logs' ? (
          /* TAB 4: AUDIT HISTORY LOG TABLE */
          <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-200 pb-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Admin Audit Trail</h2>
                <p className="text-xs text-slate-500">
                  Track of all spot approvals, deletions, and additions made by administrators.
                </p>
              </div>
              <span className="rounded-full bg-gold/25 px-3 py-1 text-xs font-bold text-deep-maroon border border-gold/40">
                {adminLogs.length} Actions Logged
              </span>
            </div>

            {adminLogs.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
                <p className="text-sm text-slate-500">No activity recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-[#FAF7F0] font-semibold text-slate-600">
                    <tr>
                      <th className="px-4 py-3">Timestamp</th>
                      <th className="px-4 py-3">Admin</th>
                      <th className="px-4 py-3">Action</th>
                      <th className="px-4 py-3">Spot Name</th>
                      <th className="px-4 py-3">Details</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {adminLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/80">
                        <td className="px-4 py-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {new Date(log.created_at).toLocaleString([], {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="px-4 py-3 font-semibold text-slate-800">{log.admin_email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              log.action === 'APPROVED_SPOT'
                              ? 'border border-emerald-300 bg-emerald-50 text-emerald-800'
                              : log.action === 'DELETED_SPOT'
                              ? 'border border-rose-300 bg-rose-50 text-rose-800'
                              : log.action === 'EDITED_SPOT'
                              ? 'border border-amber-300 bg-amber-50 text-amber-800'
                              : 'border border-blue-300 bg-blue-50 text-blue-800'
                            }`}
                          >
                            {log.action.replace('_SPOT', '')}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-dark-burgundy">{log.spot_name}</td>
                        <td className="px-4 py-3 text-slate-500">{log.details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          /* TAB 5: STUDENT ISSUE REPORTS */
          <div className="space-y-4">
            <div className="flex flex-col items-start justify-between gap-2 border-b border-slate-200 pb-2 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-base font-bold text-slate-900">Student Issue Reports</h2>
                <p className="text-xs text-slate-500">
                  Flags submitted by students regarding closed spots, wrong hours, or broken sockets.
                </p>
              </div>
              <span className="rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200">
                {reports.length} Reports
              </span>
            </div>

            {reports.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 p-12 text-center bg-white">
                <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-600 mb-2" />
                <p className="text-sm font-semibold text-slate-700">No issues reported!</p>
                <p className="text-xs text-slate-500">All campus listings are currently clear.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {reports.map((report) => (
                  <div
                    key={report.id}
                    className="flex flex-col justify-between rounded-2xl border border-rose-200 bg-white p-4 shadow-sm"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-bold text-sm text-slate-900">{report.spot_name}</h3>
                        <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-800 border border-rose-200">
                          {report.reason}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 bg-rose-50/50 p-2.5 rounded-xl border border-rose-100">
                        "{report.description || 'No additional details provided.'}"
                      </p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Reported on {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-3 border-t border-slate-100">
                      <button
                        onClick={() => handleDismissReport(report.id, report.spot_name)}
                        className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
                      >
                        Dismiss
                      </button>
                      <button
                          onClick={() => {
                            // 1. Find target spot with string-safe ID match or name fallback
                            const targetSpot =
                              approvedSpots.find((s) => String(s.id) === String(report.spot_id)) ||
                              pendingSpots.find((s) => String(s.id) === String(report.spot_id)) ||
                              approvedSpots.find((s) => s.name.trim().toLowerCase() === report.spot_name?.trim().toLowerCase());

                            if (!targetSpot) {
                              alert(`Could not find the spot "${report.spot_name}". It may have been deleted.`);
                              return;
                            }

                            setResolvingReportId(report.id);

                            // 2. Parse suggested coordinates
                            const suggested = parseReportCoordinates(report.description);

                            const finalLat = suggested ? suggested.lat : targetSpot.latitude;
                            const finalLng = suggested ? suggested.lng : targetSpot.longitude;

                            // 3. Open modal with the suggested coordinates directly pre-filled
                            setEditingSpot(targetSpot);
                            setEditFormData({
                              name: targetSpot.name,
                              category: targetSpot.category,
                              description: targetSpot.description ?? '',
                              location_description: targetSpot.location_description ?? '',
                              latitude: String(finalLat),
                              longitude: String(finalLng),
                              hours: targetSpot.hours,
                              budget_range: targetSpot.budget_range ?? '',
                              has_outlets: Boolean(targetSpot.has_outlets),
                              has_wifi: Boolean(targetSpot.has_wifi),
                              has_aircon: Boolean(targetSpot.has_aircon),
                              has_restroom: Boolean(targetSpot.has_restroom),
                              is_shaded: Boolean(targetSpot.is_shaded),
                              is_quiet: Boolean(targetSpot.is_quiet),
                            });
                          }}
                          className="rounded-xl bg-dark-burgundy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-deep-maroon transition-colors"
                        >
                          Locate &amp; Fix
                        </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {spotToDelete && (
        <div className="fixed inset-0 z-[2200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <Trash2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-bold text-slate-900">Delete this spot?</h3>
              <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                Are you sure you want to remove <strong className="text-slate-800 font-semibold">"{spotToDelete.name}"</strong>? This will delete it permanently and remove it from the campus map.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSpotToDelete(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={executeDelete}
                className="flex-1 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-rose-700 active:scale-95 transition-all"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}
      

      {/* Spot Edit Dialog */}
      {editingSpot && editFormData && (
        <div className="fixed inset-0 z-[2100] flex items-center justify-center bg-black/50 p-3 sm:p-6">
          <form
            onSubmit={handleUpdateSpot}
            className="max-h-full w-full max-w-2xl space-y-4 overflow-y-auto rounded-2xl border border-gold/40 bg-[#FFFCF6] p-4 shadow-2xl sm:p-6"
            aria-labelledby="edit-pending-spot-title"
            role="dialog"
            aria-modal="true"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 id="edit-pending-spot-title" className="text-base font-bold text-slate-900">
                  {editingSpot.approved ? 'Edit active place' : 'Edit contribution'}
                </h2>
                <p className="mt-1 text-xs text-slate-600">
                  {editingSpot.approved
                    ? 'Changes will be saved directly to this published place.'
                    : 'Saving edits will not publish this spot. It will remain pending until you approve it.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingSpot(null);
                  setEditFormData(null);
                  setResolvingReportId(null);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                aria-label="Close edit form"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* 👇 ADDED HERE: Visual banner when fixing a report */}
            {resolvingReportId && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-2.5 text-xs font-medium text-rose-800 flex items-center justify-between">
                <span>📍 Applied suggested location from report:</span>
                <span className="font-mono font-bold">
                  {editFormData.latitude}, {editFormData.longitude}
                </span>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-semibold text-slate-700">
                Place name
                <input
                  required
                  value={editFormData.name}
                  onChange={(event) => setEditFormData({ ...editFormData, name: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Category
                <select
                  value={editFormData.category}
                  onChange={(event) => {
                    const category = SPOT_CATEGORIES.find((option) => option === event.target.value);
                    if (category) setEditFormData({ ...editFormData, category });
                  }}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-normal"
                >
                  {SPOT_CATEGORIES.map((category) => (
                    <option key={category} value={category}>{category}</option>
                  ))}
                </select>
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Address / location description
                <input
                  value={editFormData.location_description}
                  onChange={(event) => setEditFormData({ ...editFormData, location_description: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Operating hours
                <input
                  required
                  value={editFormData.hours}
                  onChange={(event) => setEditFormData({ ...editFormData, hours: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Budget range
                <input
                  value={editFormData.budget_range}
                  onChange={(event) => setEditFormData({ ...editFormData, budget_range: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Latitude
                <input
                  required
                  type="number"
                  step="any"
                  min="-90"
                  max="90"
                  value={editFormData.latitude}
                  onChange={(event) => setEditFormData({ ...editFormData, latitude: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700">
                Longitude
                <input
                  required
                  type="number"
                  step="any"
                  min="-180"
                  max="180"
                  value={editFormData.longitude}
                  onChange={(event) => setEditFormData({ ...editFormData, longitude: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <label className="text-xs font-semibold text-slate-700 sm:col-span-2">
                Description / tips
                <textarea
                  rows={3}
                  value={editFormData.description}
                  onChange={(event) => setEditFormData({ ...editFormData, description: event.target.value })}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-normal"
                />
              </label>
              <div className="text-xs font-semibold text-slate-700 sm:col-span-2">
                <label htmlFor="admin-edit-spot-image">
                  Spot photo
                </label>
                {(editSpotImagePreview || editingSpot.image_url) && (
                  <img
                    src={editSpotImagePreview ?? editingSpot.image_url ?? ''}
                    alt={`${editSpotImage ? 'Selected' : 'Current'} photo for ${editingSpot.name}`}
                    className="mt-2 h-32 w-full rounded-xl object-cover"
                  />
                )}
                <input
                  ref={editSpotImageInputRef}
                  id="admin-edit-spot-image"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(event) => setEditSpotImage(event.target.files?.[0] ?? null)}
                  className="sr-only"
                />
                <button
                  type="button"
                  onClick={() => editSpotImageInputRef.current?.click()}
                  className="mt-2 inline-flex min-h-10 items-center gap-2 rounded-lg border border-gold/50 bg-gold/10 px-3 py-2 text-xs font-semibold text-dark-burgundy transition-colors hover:bg-gold/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-dark-burgundy"
                >
                  <ImagePlus className="h-4 w-4" aria-hidden="true" />
                  {editingSpot.image_url ? 'Choose placeholder image' : 'Attach placeholder image'}
                </button>
                <p className="mt-1 text-[11px] font-normal text-slate-500">
                  Optional. JPEG, PNG, or WebP, up to 5 MB. Save changes to use it in the spot details.
                </p>
                {editSpotImage && <p className="mt-1 truncate text-[11px] font-normal text-slate-600">{editSpotImage.name}</p>}
              </div>
            </div>

            <fieldset>
              <legend className="mb-2 text-xs font-semibold text-slate-700">Amenities</legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2">
                {([
                  ['has_outlets', 'Outlets'],
                  ['has_wifi', 'Wi-Fi'],
                  ['has_aircon', 'Air-conditioned'],
                  ['has_restroom', 'Restroom'],
                  ['is_shaded', 'Shaded'],
                  ['is_quiet', 'Quiet'],
                ] as const).map(([field, label]) => (
                  <label key={field} className="flex items-center gap-1.5 text-xs text-slate-700">
                    <input
                      type="checkbox"
                      checked={editFormData[field]}
                      onChange={(event) => setEditFormData({ ...editFormData, [field]: event.target.checked })}
                      className="accent-dark-burgundy"
                    />
                    {label}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col-reverse justify-end gap-2 border-t border-slate-200 pt-3 sm:flex-row">
              <button
                type="button"
                onClick={() => {
                  setEditingSpot(null);
                  setEditFormData(null);
                  setEditSpotImage(null);
                  setResolvingReportId(null);
                }}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSavingEdit}
                className="rounded-lg bg-dark-burgundy px-4 py-2 text-xs font-semibold text-white hover:bg-deep-maroon disabled:opacity-60"
              >
                {isSavingEdit
                  ? 'Saving…'
                  : editingSpot.approved
                    ? 'Save changes'
                    : 'Save changes — keep pending'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}