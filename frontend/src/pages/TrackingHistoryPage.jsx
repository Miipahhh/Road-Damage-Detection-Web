import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../contexts/AuthContext";
import { trackingService, userService } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import RouteFocusModal from "../components/RouteFocusModal";
import RetryImage from "../components/RetryImage";
import { timeAgo } from "../utils/timeUtils";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Footprints,
  MapPin,
  Clock,
  ShieldX,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Trash2,
  Trash,
  CheckSquare,
  Square,
  X,
  Radio,
  CheckCheck,
  Filter,
  RefreshCw,
  Table as TableIcon,
  LayoutGrid,
  Map as MapIcon,
  Navigation,
  Calendar,
  User,
  Eye,
} from "lucide-react";

// Hitung jarak tempuh dari route_path (km)
const calculateDistanceKm = (routePath) => {
  if (!routePath || !Array.isArray(routePath) || routePath.length < 2) return 0;
  const toRad = (val) => (val * Math.PI) / 180;
  let totalDist = 0;
  for (let i = 0; i < routePath.length - 1; i++) {
    const p1 = routePath[i];
    const p2 = routePath[i + 1];
    if (p1?.lat && p1?.lng && p2?.lat && p2?.lng) {
      const dLat = toRad(p2.lat - p1.lat);
      const dLon = toRad(p2.lng - p1.lng);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(p1.lat)) *
          Math.cos(toRad(p2.lat)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      totalDist += 6371 * c;
    }
  }
  return totalDist.toFixed(2);
};

// Format durasi sesi kerja
const formatDuration = (start, end) => {
  if (!start) return "-";
  if (!end) return "Aktif / Berjalan";
  const diffMs = new Date(end) - new Date(start);
  if (diffMs < 0) return "-";
  const diffMins = Math.round(diffMs / 60000);
  if (diffMins < 60) return `${diffMins} mnt`;
  const hours = Math.floor(diffMins / 60);
  const mins = diffMins % 60;
  return mins > 0 ? `${hours} jam ${mins} mnt` : `${hours} jam`;
};

const TrackingHistoryPage = ({ showAll = false }) => {
  const { isAdmin } = useAuth();
  const toast = useToast();
  const { isDark } = useTheme();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [expandedSession, setExpandedSession] = useState(null);
  const [sessionDetail, setSessionDetail] = useState(null);

  // State untuk Filter Pencarian
  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState({
    time_range: "all",
    start_date: "",
    end_date: "",
    user_id: "all",
    ruas_jalan: "",
  });
  const [usersList, setUsersList] = useState([]);

  // State untuk Point 3: Modal Peta Fokus
  const [focusModal, setFocusModal] = useState({ open: false, session: null });

  // State pilih & hapus massal
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sessionId: null, bulk: false });
  const [deleting, setDeleting] = useState(false);

  // State fullscreen gambar kerusakan
  const [fullscreenImg, setFullscreenImg] = useState(null);

  useEffect(() => {
    if (showAll && isAdmin()) {
      userService
        .getAll({ role: "petugas" })
        .then((res) => {
          setUsersList(res.data || res || []);
        })
        .catch((err) => console.error("Error loading users:", err));
    }
  }, [showAll]);

  // Penanda request terbaru — cegah response filter lama (mis. "Semua Waktu"
  // dari fetch awal saat mount) menimpa hasil filter baru yang datang lebih dulu
  const requestSeqRef = useRef(0);

  useEffect(() => {
    loadSessions();
  }, [currentPage, filters]);

  const loadSessions = async (isRefresh = false) => {
    const seq = ++requestSeqRef.current;
    if (!isRefresh) setLoading(true);
    try {
      let data;
      const filterParams = { page: currentPage, ...filters };
      if (showAll && isAdmin()) {
        data = await trackingService.getAllHistory(filterParams);
      } else {
        data = await trackingService.getMyHistory(filterParams);
      }
      if (seq !== requestSeqRef.current) return; // response basi, abaikan
      setSessions(data.data || []);
      setTotalPages(data.last_page || 1);
      if (isRefresh) toast.success("Data berhasil diperbarui");
    } catch (error) {
      if (seq !== requestSeqRef.current) return;
      console.error("Error loading sessions:", error);
      toast.error("Gagal memuat riwayat tracking. Periksa koneksi Anda.");
    } finally {
      if (seq === requestSeqRef.current && !isRefresh) setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadSessions(true);
    setRefreshing(false);
  };

  const handleFilterChange = (key, val) => {
    setFilters((prev) => ({ ...prev, [key]: val }));
    setCurrentPage(1);
  };

  const resetFilters = () => {
    setFilters({
      time_range: "all",
      start_date: "",
      end_date: "",
      user_id: "all",
      ruas_jalan: "",
    });
    setCurrentPage(1);
  };

  const toggleExpand = async (sessionId) => {
    if (selectMode) return;
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      setSessionDetail(null);
      return;
    }
    try {
      const data = await trackingService.getSession(sessionId);
      setSessionDetail(data.session);
      setExpandedSession(sessionId);
    } catch (error) {
      console.error("Error loading session detail:", error);
    }
  };

  // Buka Modal Peta Fokus (Point 3)
  const handleOpenFocusMap = async (e, sessionId) => {
    if (e) e.stopPropagation();
    try {
      const data = await trackingService.getSession(sessionId);
      if (data && data.session) {
        setFocusModal({ open: true, session: data.session });
      } else {
        toast.error("Detail rute tidak ditemukan");
      }
    } catch (err) {
      console.error("Error loading focus session:", err);
      toast.error("Gagal memuat detail rute peta");
    }
  };

  const handleDelete = (e, sessionId) => {
    if (e) e.stopPropagation();
    setDeleteConfirm({ open: true, sessionId, bulk: false });
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      if (deleteConfirm.bulk) {
        const count = selectedIds.size;
        setBulkDeleting(true);
        await trackingService.bulkDeleteSessions(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectMode(false);
        setExpandedSession(null);
        setSessionDetail(null);
        toast.delete(`${count} sesi tracking berhasil dihapus dari peta`);
      } else {
        await trackingService.deleteSession(deleteConfirm.sessionId);
        if (expandedSession === deleteConfirm.sessionId) {
          setExpandedSession(null);
          setSessionDetail(null);
        }
        toast.delete("Sesi tracking berhasil dihapus dari peta");
      }
      loadSessions();
    } catch (error) {
      console.error("Gagal menghapus:", error);
      toast.error("Gagal menghapus sesi tracking. Silakan coba lagi.");
    } finally {
      setDeleting(false);
      setBulkDeleting(false);
      setDeleteConfirm({ open: false, sessionId: null, bulk: false });
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === sessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sessions.map((s) => s.id)));
    }
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const handleBulkDelete = () => {
    if (selectedIds.size === 0) return;
    setDeleteConfirm({ open: true, sessionId: null, bulk: true });
  };

  const getColorForClass = (className) => {
    const colors = {
      Lubang: "#3b82f6",
      "Retak-Buaya": "#ef4444",
      "Retak-Memanjang": "#eab308",
      "Retak-Melintang": "#22c55e",
    };
    return colors[className] || "#888";
  };

  const canDelete = showAll && isAdmin();

  return (
    <div>
      <div className="overflow-auto p-4 lg:p-8">
        <div className="space-y-6">
          {/* Header & Toggle Mode Tampilan (Point 1) */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-white flex items-center gap-3">
                <Footprints className="w-8 h-8 text-blue-500" />
                {showAll
                  ? "Riwayat & Laporan Kinerja Petugas"
                  : "Riwayat Tracking Saya"}
              </h1>
              <p className="text-gray-400 mt-1">
                {showAll
                  ? "Pantau rekap jalur patroli, durasi kerja, dan temuan kerusakan dari seluruh petugas"
                  : "Lihat riwayat sesi patroli, jarak tempuh, dan rekap kerja Anda"}
              </p>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Tombol Refresh */}
              <button
                onClick={handleRefresh}
                disabled={refreshing}
                title="Refresh data sekarang"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                  isDark 
                    ? "bg-gray-800 border-gray-700 text-gray-300 hover:text-white" 
                    : "bg-white border-gray-200 text-gray-600 shadow-sm hover:text-gray-900"
                }`}
              >
                <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Refresh"}</span>
              </button>

              {canDelete && sessions.length > 0 && (
                <div className="flex gap-2">
                  {!selectMode ? (
                    <button
                      onClick={() => setSelectMode(true)}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <CheckSquare className="w-4 h-4" /> Pilih / Hapus
                    </button>
                  ) : (
                    <button
                      onClick={exitSelectMode}
                      className="btn-secondary flex items-center gap-2 text-xs"
                    >
                      <X className="w-4 h-4" /> Batal
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Point 2: Filter Pencarian Cerdas (Smart Filtering) */}
          <div className={`card p-4 rounded-2xl border ${
            isDark ? "bg-gray-900/60 border-gray-800" : "bg-white border-gray-200"
          }`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-gray-300 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" /> Filter Pencarian Cerdas
              </h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
              {/* Filter Rentang Waktu */}
              <div>
                <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                  Rentang Waktu
                </label>
                <select
                  value={filters.time_range}
                  onChange={(e) => handleFilterChange("time_range", e.target.value)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                  }`}
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="yesterday">Kemarin</option>
                  <option value="this_week">Minggu Ini</option>
                  <option value="this_month">Bulan Ini</option>
                  <option value="custom">Rentang Custom Tanggal...</option>
                </select>
              </div>

              {/* Tanggal mulai & akhir custom */}
              {filters.time_range === "custom" && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Dari Tanggal
                    </label>
                    <input
                      type="date"
                      value={filters.start_date}
                      onChange={(e) => handleFilterChange("start_date", e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                      Sampai Tanggal
                    </label>
                    <input
                      type="date"
                      value={filters.end_date}
                      onChange={(e) => handleFilterChange("end_date", e.target.value)}
                      className={`w-full px-3 py-1.5 rounded-xl text-xs border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                        isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                      }`}
                    />
                  </div>
                </>
              )}

              {/* Filter Petugas (Hanya Admin) */}
              {showAll && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-400 mb-1">
                    Nama Petugas
                  </label>
                  <select
                    value={filters.user_id}
                    onChange={(e) => handleFilterChange("user_id", e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                      isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-300 text-gray-800"
                    }`}
                  >
                    <option value="all">Semua Petugas</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </select>
                </div>
              )}

            </div>
          </div>

          {/* Toolbar hapus massal */}
          {selectMode && (
            <div className="card bg-blue-900/20 border-blue-600/50 flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <button
                  onClick={selectAll}
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors cursor-pointer"
                >
                  {selectedIds.size === sessions.length && sessions.length > 0 ? (
                    <CheckSquare className="w-5 h-5 text-blue-400" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-500" />
                  )}
                  Pilih Semua di Halaman Ini
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0 ? (
                    <span className="text-blue-300 font-semibold">{selectedIds.size} dipilih</span>
                  ) : (
                    "Belum ada yang dipilih"
                  )}
                </span>
              </div>
              <button
                onClick={handleBulkDelete}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedIds.size > 0 && !bulkDeleting
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Trash className="w-4 h-4" />
                {bulkDeleting
                  ? "Menghapus..."
                  : `Hapus ${selectedIds.size > 0 ? `(${selectedIds.size})` : ""}`}
              </button>
            </div>
          )}

          {/* State loading */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          ) : sessions.length === 0 ? (
            <div className="card text-center py-16">
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-4 ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
              }`}>
                <Footprints className={`w-10 h-10 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
              <p className="text-gray-300 text-lg font-semibold">Belum ada riwayat tracking ditemukan</p>
              <p className="text-gray-500 text-sm mt-1">Coba sesuaikan filter pencarian atau rentang tanggal Anda.</p>
            </div>
          ) : (
            /* TAMPILAN KARTU (Card View) */
            <div className="space-y-4">
              {sessions.map((session) => {
                const isSelected = selectedIds.has(session.id);
                const distanceKm = calculateDistanceKm(session.route_path);
                const durationStr = formatDuration(session.started_at, session.ended_at);
                return (
                  <div
                    key={session.id}
                    className={`card transition-all ${isSelected ? "border-blue-500 bg-blue-900/10" : ""}`}
                  >
                    <div
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer"
                      onClick={() => selectMode ? toggleSelect(session.id) : toggleExpand(session.id)}
                    >
                      <div className="flex items-center gap-4">
                        {selectMode ? (
                          <div className="w-10 h-10 flex items-center justify-center">
                            {isSelected ? (
                              <CheckSquare className="w-6 h-6 text-blue-400" />
                            ) : (
                              <Square className="w-6 h-6 text-gray-500" />
                            )}
                          </div>
                        ) : (
                          <div
                            className={`w-10 h-10 rounded-full flex items-center justify-center ${
                              session.status === "active"
                                ? "bg-green-600/20 border border-green-500/50"
                                : isDark
                                ? "bg-gray-800 border border-gray-700"
                                : "bg-gray-100 border border-gray-200"
                            }`}
                          >
                            {session.status === "active" ? (
                              <Radio className="w-5 h-5 text-green-400 animate-pulse" />
                            ) : (
                              <CheckCheck className={`w-5 h-5 ${isDark ? "text-gray-400" : "text-gray-500"}`} />
                            )}
                          </div>
                        )}

                        <div>
                          {showAll && session.user && (
                            <p className="font-bold text-sm text-blue-400 flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5" /> {session.user.name}
                            </p>
                          )}
                          <p className={`text-base font-bold mt-0.5 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {session.ruas_jalan_name || "Sesi Patroli Lapangan"}
                          </p>
                          <p className={`text-xs mt-1 flex items-center gap-3 flex-wrap ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            <span title={new Date(session.started_at).toLocaleString("id-ID")} className="cursor-help flex items-center gap-1">
                              <Clock className="w-3 h-3 text-yellow-400" />
                              {new Date(session.started_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" })} ({new Date(session.started_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })})
                              {session.ended_at && ` - ${new Date(session.ended_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}`}
                            </span>
                            <span className="text-gray-500">•</span>
                            <span>Durasi: <strong className="text-gray-300">{durationStr}</strong></span>
                            {distanceKm > 0 && (
                              <>
                                <span className="text-gray-500">•</span>
                                <span>Jarak: <strong className="text-blue-400">{distanceKm} km</strong></span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 pt-2 sm:pt-0 border-t sm:border-t-0 border-gray-800">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full bg-red-600/20 text-red-400 text-xs font-bold border border-red-500/30 flex items-center gap-1">
                            <ShieldX className="w-3.5 h-3.5" />
                            {session.road_damages_count || 0} kerusakan
                          </span>

                          {/* Tombol Point 3: Lihat Rute di Peta Fokus */}
                          <button
                            onClick={(e) => handleOpenFocusMap(e, session.id)}
                            className={`px-3 py-1.5 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 shadow transition-all cursor-pointer ${isDark ? 'bg-blue-600 hover:bg-blue-700' : 'bg-blue-500 hover:bg-blue-600'}`}
                            title="Lihat Rute di Peta Fokus"
                          >
                            <MapIcon className="w-3.5 h-3.5" /> Lihat Rute
                          </button>
                        </div>

                        {canDelete && !selectMode && session.status !== "active" && (
                          <button
                            onClick={(e) => handleDelete(e, session.id)}
                            className="p-2 rounded-lg bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white transition-colors cursor-pointer"
                            title="Hapus rute ini (Data kerusakan aman)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}

                        {!selectMode &&
                          (expandedSession === session.id ? (
                            <ChevronUp className="w-5 h-5 text-gray-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-gray-400" />
                          ))}
                      </div>
                    </div>

                    {/* Detail yang diperluas */}
                    {expandedSession === session.id && sessionDetail && !selectMode && (
                      <div className={`mt-4 pt-4 border-t ${isDark ? "border-gray-800" : "border-gray-200"}`}>
                        {sessionDetail.road_damages && sessionDetail.road_damages.length > 0 ? (
                          <div className="space-y-3">
                            <h4 className={`text-xs uppercase tracking-wider font-bold ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Daftar Kerusakan Ditemukan ({sessionDetail.road_damages.length} titik):
                            </h4>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                              {sessionDetail.road_damages.map((damage) => (
                                <div
                                  key={damage.id}
                                  className="rounded-xl p-3 flex flex-col justify-between gap-2"
                                  style={{
                                    background: isDark ? 'rgba(31,41,55,0.8)' : '#f1f5f9',
                                    border: isDark ? '1px solid rgba(55,65,81,0.6)' : '1px solid rgba(203,213,225,0.8)',
                                  }}
                                >
                                  <div>
                                    {damage.image_url ? (
                                      <RetryImage
                                        src={damage.image_url}
                                        alt="Kerusakan"
                                        className="w-full h-32 object-cover rounded-lg mb-2"
                                        style={{ cursor: 'zoom-in' }}
                                        onClick={() => setFullscreenImg(damage.image_url)}
                                        title="Klik untuk perbesar"
                                      />
                                    ) : damage.image_path ? (
                                      <RetryImage
                                        src={`/storage/${damage.image_path}`}
                                        alt="Kerusakan"
                                        className="w-full h-32 object-cover rounded-lg mb-2"
                                        style={{ cursor: 'zoom-in' }}
                                        onClick={() => setFullscreenImg(`/storage/${damage.image_path}`)}
                                        title="Klik untuk perbesar"
                                      />
                                    ) : null}
                                    <div className="flex items-center justify-between">
                                      <span
                                        className="px-2 py-0.5 rounded text-xs font-bold text-white inline-block"
                                        style={{ backgroundColor: getColorForClass(damage.damage_type) }}
                                      >
                                        {damage.damage_type || "Kerusakan"}
                                      </span>
                                      <span className={`text-[10px] font-semibold ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                        {damage.confidence ? `${Math.round(damage.confidence * 100)}% AI` : "-"}
                                      </span>
                                    </div>
                                    <p className={`text-[11px] mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                                      Dideteksi: {new Date(damage.created_at || damage.detected_at).toLocaleTimeString("id-ID")}
                                    </p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-center py-4 text-xs italic">
                            Tidak ada kerusakan terdeteksi pada sesi patroli ini
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50 text-xs"
              >
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-gray-400 text-xs font-semibold">
                Halaman {currentPage} dari {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50 text-xs"
              >
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Point 3: Modal Peta Fokus (RouteFocusModal) */}
      <RouteFocusModal
        isOpen={focusModal.open}
        onClose={() => setFocusModal({ open: false, session: null })}
        session={focusModal.session}
      />

      {/* Modal konfirmasi custom */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        type="danger"
        title={deleteConfirm.bulk ? `Hapus ${selectedIds.size} Rute Tracking?` : "Hapus Rute Tracking ini?"}
        message={
          deleteConfirm.bulk
            ? `${selectedIds.size} jalur rute dan titik koordinat tracking akan dihapus dari peta. TENANG: Data kerusakan jalan dan foto bukti yang dideteksi petugas DIJAMIN 100% AMAN dan tidak terhapus.`
            : "Jalur rute dan titik koordinat tracking ini akan dihapus dari peta. TENANG: Data kerusakan jalan dan foto bukti yang dideteksi petugas DIJAMIN 100% AMAN dan tidak terhapus."
        }
        confirmLabel="Ya, Hapus Rute"
        onCancel={() => setDeleteConfirm({ open: false, sessionId: null, bulk: false })}
        onConfirm={confirmDelete}
        loading={deleting}
      />
      {/* Lightbox gambar fullscreen */}
      {/* Render via Portal langsung ke document.body */}
      {/* → bypass ancestor transform PageTransition (App.jsx) yang membuat */}
      {/*   position:fixed jadi relatif ke container, bukan viewport, di mobile */}
      {fullscreenImg && createPortal(
        <div
          onClick={() => setFullscreenImg(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 2147483647,
            background: 'rgba(0,0,0,0.92)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'zoom-out',
            backdropFilter: 'blur(6px)',
            animation: 'fadeInFast 0.2s ease',
          }}
        >
          <button
            onClick={() => setFullscreenImg(null)}
            style={{
              position: 'absolute', top: '20px', right: '24px',
              background: 'rgba(255,255,255,0.12)', border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff', borderRadius: '50%', width: '40px', height: '40px',
              fontSize: '20px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
              backdropFilter: 'blur(4px)', zIndex: 1,
            }}
          >✕</button>
          <RetryImage
            src={fullscreenImg}
            alt="Fullscreen Kerusakan"
            onClick={e => e.stopPropagation()}
            style={{
              maxWidth: '95vw', maxHeight: '92vh',
              objectFit: 'contain',
              borderRadius: '10px',
              boxShadow: '0 8px 48px rgba(0,0,0,0.7)',
              cursor: 'default',
            }}
          />
          <style>{`@keyframes fadeInFast { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }`}</style>
        </div>,
        document.body
      )}

    </div>
  );
};

export default TrackingHistoryPage;
