import React, { useEffect, useState, useRef, useCallback } from "react";
import { createPortal } from 'react-dom';
import RetryImage from "../components/RetryImage";
import { useSearchParams } from "react-router-dom";
import { roadDamageService } from "../services/api";
import ConfirmModal from "../components/ConfirmModal";
import { useToast } from "../contexts/ToastContext";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { timeAgo } from "../utils/timeUtils";
import { format } from "date-fns";
import { id } from "date-fns/locale";
import {
  Trash2,
  MapPin,
  Calendar,
  Filter,
  Eye,
  X,
  CheckSquare,
  Square,
  Trash,
  ScanSearch,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  ZoomIn,
  User,
  Activity,
  ShieldCheck,
  Wrench,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  Search,
  ThumbsUp,
  ThumbsDown,
  Download,
  RefreshCw,
  Bell,
} from "lucide-react";

/* ─── Modal Detail ───────────────────────────────────────────────────────── */
const DetailModal = ({ damage, editingNotes, setEditingNotes, onSaveNotes, onClose, onDelete, onApprove, onReject, getSeverityBadge, getStatusBadge, getDamageTypeColor }) => {
  const [imgZoomed, setImgZoomed] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const { isDark } = useTheme();

  useEffect(() => {
    const originalBodyStyle = window.getComputedStyle(document.body).overflow;
    const originalHtmlStyle = window.getComputedStyle(document.documentElement).overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalBodyStyle;
      document.documentElement.style.overflow = originalHtmlStyle;
    };
  }, []);

  const handleSave = async () => {
    setSaving(true);
    await onSaveNotes(damage.id);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const panel = isDark ? "bg-gray-800/60 border-gray-700/50" : "bg-gray-50 border-gray-200";
  const panelText = isDark ? "text-white" : "text-gray-800";
  const labelText = isDark ? "text-gray-400" : "text-gray-500";
  const rowText = isDark ? "text-gray-200" : "text-gray-700";
  const modalBg = isDark ? "bg-gray-900 border-gray-700/80" : "bg-white border-gray-200";
  const headerBg = isDark ? "bg-gray-900/95 border-gray-700/60" : "bg-white/95 border-gray-200";
  const closeBtnCls = isDark ? "bg-gray-700/70 hover:bg-gray-600 text-gray-400 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800";
  const progressTrack = isDark ? "bg-gray-700" : "bg-gray-200";
  const infoRow = isDark ? "bg-gray-800/40 border-gray-700/40" : "bg-gray-50 border-gray-200";
  const repairInfoRow = isDark ? "bg-gray-800/50 border-gray-700/40" : "bg-gray-50 border-gray-200";
  const textareaStyle = isDark
    ? "bg-gray-800 border-gray-600 text-gray-200 placeholder-gray-500"
    : "bg-white border-gray-300 text-gray-800 placeholder-gray-400";

  const severityLabel = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
  const statusLabel = { pending: "Belum Diverifikasi", verified: "Terverifikasi", waiting_validation: "Menunggu Validasi", repaired: "Diperbaiki" };

  return createPortal(
    <div
      className="fixed inset-0 overflow-y-auto bg-black/75 backdrop-blur-sm"
      style={{ zIndex: 9999 }}
      onClick={onClose}
    >
      <div className="flex min-h-screen items-start justify-center p-4 py-8">
        {/* Overlay gambar diperbesar */}
        {imgZoomed && (
          <div
            className="fixed inset-0 flex items-center justify-center bg-black/95"
            style={{ zIndex: 10001 }}
            onClick={(e) => { e.stopPropagation(); setImgZoomed(null); }}
          >
            <RetryImage
              src={`/storage/${imgZoomed}`}
              alt="Zoomed"
              className="max-w-full max-h-full object-contain"
              style={{ maxHeight: "90vh" }}
            />
            <button
              onClick={(e) => { e.stopPropagation(); setImgZoomed(null); }}
              className="absolute top-4 right-4 w-10 h-10 bg-gray-800 rounded-full flex items-center justify-center text-gray-300 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Jendela modal */}
        <div
          className={`relative border rounded-2xl shadow-2xl flex flex-col w-[95vw] h-[95vh] max-w-[1400px] text-left overflow-hidden ${modalBg}`}
          style={{ animation: "slideUpFade 0.3s cubic-bezier(0.16,1,0.3,1) both" }}
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className={`flex-shrink-0 backdrop-blur-md border-b px-5 py-4 flex items-center justify-between z-10 ${headerBg}`}>
            <div className="flex items-center gap-3">
              <div className={`px-3 py-1 rounded-full text-xs font-bold ${getDamageTypeColor(damage.damage_type)}`}>
                {damage.damage_type}
              </div>
              <span className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase ${getStatusBadge(damage.status)}`}>
                {statusLabel[damage.status] || damage.status}
              </span>
            </div>
            <button
              onClick={onClose}
              className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${closeBtnCls}`}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Konten - layout flex */}
          <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden min-h-0">
            
            {/* ── KOLOM KIRI: Media & Validasi ── */}
            <div className="lg:flex-[1.5] p-5 md:p-6 lg:overflow-hidden flex flex-col gap-5 border-b lg:border-b-0 lg:border-r border-gray-700/50">
              
              {/* Area media (isi sisa tinggi di desktop, tinggi minimum tetap di mobile) */}
              <div className="flex-1 min-h-[300px] lg:min-h-0 flex flex-col">
                {damage.image_path && damage.repair_photo_path ? (
                  // Sebelum & sesudah, berdampingan
                  <div className="flex-1 min-h-0 flex flex-col sm:flex-row gap-4">
                    <div className="flex-1 min-w-0 min-h-[250px] lg:min-h-0 flex flex-col relative group cursor-pointer" onClick={() => setImgZoomed(damage.image_path)}>
                      <p className="text-[11px] text-red-400 font-bold uppercase tracking-wide mb-1.5 flex-shrink-0 text-center">Sebelumnnya</p>
                      <div className="flex-1 min-h-0 relative">
                        <RetryImage src={`/storage/${damage.image_path}`} alt="Sebelum" className="w-full h-full object-contain bg-black/40 rounded-xl border border-red-500/40" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-xl pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3"><ZoomIn className="w-6 h-6 text-white" /></div>
                        </div>
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 min-h-[250px] lg:min-h-0 flex flex-col relative group cursor-pointer" onClick={() => setImgZoomed(damage.repair_photo_path)}>
                      <p className="text-[11px] text-green-400 font-bold uppercase tracking-wide mb-1.5 flex-shrink-0 text-center">Sesudah Diperbaiki</p>
                      <div className="flex-1 min-h-0 relative">
                        <RetryImage src={`/storage/${damage.repair_photo_path}`} alt="Sesudah" className="w-full h-full object-contain bg-black/40 rounded-xl border border-green-500/40" />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-xl pointer-events-none">
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3"><ZoomIn className="w-6 h-6 text-white" /></div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : damage.image_path ? (
                  // Gambar tunggal
                  <div className="flex-1 min-h-0 relative group cursor-pointer" onClick={() => setImgZoomed(damage.image_path)}>
                    <RetryImage
                      src={`/storage/${damage.image_path}`}
                      alt={damage.damage_type}
                      className="w-full h-full object-contain bg-black/40 rounded-xl border border-gray-700/50"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center rounded-xl pointer-events-none">
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-black/60 rounded-full p-3">
                        <ZoomIn className="w-6 h-6 text-white" />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {/* Area info validasi/perbaikan (menempel di bawah) */}
              <div className="flex-shrink-0 flex flex-col gap-4">
                {/* ── Validasi perbaikan (status waiting_validation) ── */}
                {damage.status === "waiting_validation" && (
                  <div className="rounded-xl border border-orange-500/40 bg-orange-500/5 p-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-1 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-orange-400" />
                        <p className="text-sm font-bold text-orange-400">Menunggu Validasi Admin</p>
                      </div>
                      <p className="text-xs text-orange-300/70">Petugas telah mengirim bukti perbaikan.</p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
                      <div className="flex-1">
                        {damage.repair_notes && (
                          <p className="text-xs text-gray-400"><span className="font-semibold text-gray-300">Catatan:</span> {damage.repair_notes}</p>
                        )}
                        {damage.repairedBy && (
                          <p className="text-xs text-gray-400"><span className="font-semibold text-gray-300">Dikirim oleh:</span> {damage.repairedBy.name}</p>
                        )}
                      </div>
                      
                      {/* Tombol setuju / tolak */}
                      <div className="flex gap-2 min-w-[220px]">
                        <button
                          onClick={() => onApprove(damage.id)}
                          className="flex-1 bg-green-600 hover:bg-green-500 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                          <ThumbsUp className="w-4 h-4" /> Setujui
                        </button>
                        <button
                          onClick={() => onReject(damage.id)}
                          className="flex-1 bg-red-600 hover:bg-red-500 text-white py-2 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all"
                        >
                          <ThumbsDown className="w-4 h-4" /> Tolak
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* ── Laporan Perbaikan (hanya jika status repaired) ── */}
                {damage.status === "repaired" && (
                  <div className="rounded-xl border border-green-600/40 bg-green-600/5 p-4 flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-green-600/20 pb-2 gap-1 sm:gap-0">
                      <div className="flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-green-400" />
                        <p className="text-sm font-bold text-green-400">Laporan Perbaikan Selesai</p>
                      </div>
                      <span className="text-[10px] uppercase tracking-wide text-green-500/70 font-semibold">
                        Tervalidasi
                      </span>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                      {/* Catatan perbaikan */}
                      <div className="flex-1">
                        {damage.repair_notes ? (
                          <p className="text-sm text-gray-200 whitespace-pre-wrap"><span className="text-[11px] text-green-400/80 uppercase tracking-wide font-semibold block mb-0.5">Catatan Tim:</span>{damage.repair_notes}</p>
                        ) : (
                          <p className="text-sm text-gray-500 italic">Tidak ada catatan perbaikan.</p>
                        )}
                      </div>

                      {/* Info: siapa & kapan */}
                      <div className="flex flex-col gap-2 min-w-[200px]">
                        <div className={`rounded-lg border px-3 py-1.5 ${repairInfoRow}`}>
                          <p className={`text-[10px] uppercase tracking-wide ${labelText}`}>Oleh</p>
                          <p className={`text-xs font-semibold truncate ${rowText}`}>
                            {damage.repaired_by?.name || damage.repaired_by_name || "—"}
                          </p>
                        </div>
                        <div className={`rounded-lg border px-3 py-1.5 ${repairInfoRow}`}>
                          <p className={`text-[10px] uppercase tracking-wide ${labelText}`}>Tanggal</p>
                          <p className={`text-xs font-semibold ${rowText}`}>
                            {damage.repaired_at
                              ? format(new Date(damage.repaired_at), "dd MMM yyyy, HH:mm", { locale: id })
                              : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── KOLOM KANAN: Statistik & Info ── */}
            <div className="lg:w-[420px] flex-shrink-0 p-5 md:p-6 lg:overflow-y-auto flex flex-col gap-5">
              {/* Grid statistik */}
              <div className="grid grid-cols-2 gap-3">
                <div className={`border rounded-xl p-3 ${panel}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <Activity className="w-3.5 h-3.5 text-blue-400" />
                    <p className={`text-[11px] font-medium uppercase tracking-wide ${labelText}`}>Confidence</p>
                  </div>
                  <p className={`text-lg font-bold ${panelText}`}>{(damage.confidence * 100).toFixed(1)}%</p>
                  <div className={`mt-1.5 h-1.5 rounded-full overflow-hidden ${progressTrack}`}>
                    <div
                      className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full"
                      style={{ width: `${(damage.confidence * 100).toFixed(0)}%` }}
                    />
                  </div>
                </div>
                <div className={`border rounded-xl p-3 ${panel}`}>
                  <div className="flex items-center gap-2 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                    <p className={`text-[11px] font-medium uppercase tracking-wide ${labelText}`}>Keparahan</p>
                  </div>
                  <p className={`text-sm font-bold px-2 py-0.5 rounded-lg w-fit ${getSeverityBadge(damage.severity)}`}>
                    {severityLabel[damage.severity]?.toUpperCase() || damage.severity?.toUpperCase()}
                  </p>
                </div>
              </div>

              {/* Baris info */}
              <div className="space-y-2.5">
                {damage.latitude && damage.longitude && (
                  <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${infoRow}`}>
                    <MapPin className="w-4 h-4 text-green-400 flex-shrink-0" />
                    <div>
                      <p className={`text-[11px] uppercase tracking-wide ${labelText}`}>Koordinat GPS</p>
                      <p className={`text-sm font-mono ${rowText}`}>
                        {damage.latitude.toFixed(6)}, {damage.longitude.toFixed(6)}
                      </p>
                    </div>
                  </div>
                )}
                {damage.tracking_session?.user && (
                  <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${infoRow}`}>
                    <User className="w-4 h-4 text-purple-400 flex-shrink-0" />
                    <div>
                      <p className={`text-[11px] uppercase tracking-wide ${labelText}`}>Petugas Lapangan</p>
                      <p className={`text-sm font-semibold ${rowText}`}>{damage.tracking_session.user.name}</p>
                    </div>
                  </div>
                )}
                <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${infoRow}`}>
                  <Clock className={`w-4 h-4 flex-shrink-0 ${labelText}`} />
                  <div>
                    <p className={`text-[11px] uppercase tracking-wide ${labelText}`}>Terdeteksi</p>
                    <p className={`text-sm ${rowText}`}>
                      {format(new Date(damage.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                    </p>
                  </div>
                </div>
                {(damage.status === "repaired" || damage.status === "waiting_validation" || damage.repaired_by || damage.repaired_by_name || damage.repair_photo_path) && (
                  <>
                    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${infoRow}`}>
                      <Wrench className="w-4 h-4 text-orange-400 flex-shrink-0" />
                      <div>
                        <p className={`text-[11px] uppercase tracking-wide ${labelText}`}>Petugas Perbaikan</p>
                        <p className={`text-sm font-semibold ${rowText}`}>
                          {damage.repaired_by?.name || damage.repairedBy?.name || damage.repaired_by_name || (typeof damage.repaired_by === "string" && isNaN(damage.repaired_by) ? damage.repaired_by : "Tim Perbaikan")}
                        </p>
                      </div>
                    </div>
                    <div className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${infoRow}`}>
                      <Calendar className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div>
                        <p className={`text-[11px] uppercase tracking-wide ${labelText}`}>Waktu Perbaikan</p>
                        <p className={`text-sm ${rowText}`}>
                          {(damage.repaired_at || damage.repairedAt || damage.updated_at)
                            ? format(new Date(damage.repaired_at || damage.repairedAt || damage.updated_at), "dd MMMM yyyy, HH:mm", { locale: id })
                            : "-"}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Catatan */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className={`w-4 h-4 ${labelText}`} />
                  <label className={`text-sm font-semibold ${rowText}`}>Catatan Admin</label>
                </div>
                <textarea
                  value={editingNotes}
                  onChange={e => setEditingNotes(e.target.value)}
                  className={`w-full border rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-500 resize-none transition-colors ${textareaStyle}`}
                  placeholder="Tambahkan catatan untuk kerusakan ini..."
                  rows={3}
                />
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`mt-2 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl font-semibold text-sm transition-all ${
                    saved
                      ? "bg-green-600 text-white"
                      : "bg-blue-600 hover:bg-blue-500 text-white"
                  } disabled:opacity-60`}
                >
                  {saved ? (
                    <><CheckCircle2 className="w-4 h-4" /> Tersimpan!</>
                  ) : saving ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Menyimpan...</>
                  ) : (
                    <><Save className="w-4 h-4" /> Simpan Catatan</>
                  )}
                </button>
              </div>

              {/* Tombol hapus */}
              <button
                onClick={() => onDelete(damage.id)}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-red-600/10 border border-red-600/30 text-red-400 hover:bg-red-600/20 hover:text-red-300 font-semibold text-sm transition-all mt-auto"
              >
                <Trash2 className="w-4 h-4" /> Hapus Data Ini
              </button>
            </div>
        </div>
      </div>
    </div>
  </div>,
    document.body
  );
};

/* ─── Komponen Utama ─────────────────────────────────────────────────────── */
const HistoryPage = () => {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const { isDark } = useTheme();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab = (tabParam && ["all", "pending", "verified", "waiting_validation", "repaired"].includes(tabParam)) ? tabParam : "all";
  const setActiveTab = (tab) => {
    setSearchParams(tab === "all" ? {} : { tab });
  };
  const [damages, setDamages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [filters, setFilters] = useState({
    type: "",
    severity: "",
    status: "",
    sort_by: "created_at",
    sort_order: "desc",
  });
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDamage, setSelectedDamage] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");

  const [pagination, setPagination] = useState({ from: 0, to: 0, total: 0 });
  const [statsCount, setStatsCount] = useState(null);

  // State modal konfirmasi hapus
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, bulk: false });

  // State modal tolak perbaikan
  const [rejectModal, setRejectModal] = useState({ open: false, id: null, reason: "", submitting: false });

  // Pilih massal
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pollRefresh, setPollRefresh] = useState(0); // Trigger for polling

  // Polling: simpan jumlah waiting_validation sebelumnya untuk deteksi laporan baru
  const prevWaitingCount = useRef(null);

  // Filter tab diterapkan ke request server
  useEffect(() => { setCurrentPage(1); }, [activeTab]);
  useEffect(() => { loadDamages(); }, [currentPage, filters, activeTab, searchQuery, pollRefresh]);

  // Handler refresh manual
  const handleRefresh = async () => {
    setRefreshing(true);
    await loadDamages();
    setTimeout(() => setRefreshing(false), 600);
    toast.success("Data berhasil diperbarui");
  };

  // Polling: cek waiting_validation baru setiap 30 detik (khusus admin)
  useEffect(() => {
    if (!isAdmin) return;

    const checkForNewReports = async () => {
      try {
        const res = await roadDamageService.getAll({ status: "waiting_validation", per_page: 50 });
        const currentCount = (res.data || []).length;

        if (prevWaitingCount.current !== null && currentCount > prevWaitingCount.current) {
          const diff = currentCount - prevWaitingCount.current;
          // Auto-refresh data & tampilkan notifikasi via trigger
          setPollRefresh(p => p + 1);
          toast.warning(
            `🔔 ${diff} laporan perbaikan baru masuk! Periksa tab "Menunggu Validasi"`,
            8000
          );
        }
        prevWaitingCount.current = currentCount;
      } catch (_) {}
    };

    // Jalankan sekali saat mount untuk set baseline
    checkForNewReports();

    const interval = setInterval(checkForNewReports, 15000);
    return () => clearInterval(interval);
  }, [isAdmin]);

  const loadDamages = async () => {
    setLoading(true);
    try {
      const activeStatus = activeTab === "all" ? filters.status : activeTab;
      
      const [response, stats] = await Promise.all([
        roadDamageService.getAll({ ...filters, status: activeStatus, search: searchQuery, page: currentPage, per_page: 50 }),
        roadDamageService.getStatistics(filters)
      ]);
      
      setDamages(response.data || []);
      setTotalPages(response.last_page || 1);
      setPagination({ from: response.from || 0, to: response.to || 0, total: response.total || 0 });
      setStatsCount(stats);
    } catch (error) {
      console.error("Error loading damages:", error);
      toast.error("Gagal memuat data kerusakan. Periksa koneksi Anda.");
    } finally {
      setLoading(false);
    }
  };

  // Pakai modal custom, bukan browser confirm bawaan
  const handleDelete = (id) => {
    setDeleteConfirm({ open: true, id, bulk: false });
  };

  const confirmDelete = async () => {
    if (deleteConfirm.bulk) {
      const count = selectedIds.size;
      setBulkDeleting(true);
      try {
        await roadDamageService.bulkDelete(Array.from(selectedIds));
        setSelectedIds(new Set());
        setSelectMode(false);
        loadDamages();
        toast.delete(`${count} data kerusakan berhasil dihapus`);
      } catch (e) {
        toast.error("Gagal menghapus data");
      } finally { setBulkDeleting(false); }
    } else {
      try {
        await roadDamageService.delete(deleteConfirm.id);
        setSelectedDamage(null);
        loadDamages();
        toast.delete("Data kerusakan berhasil dihapus");
      } catch (e) {
        toast.error("Gagal menghapus data");
      }
    }
    setDeleteConfirm({ open: false, id: null, bulk: false });
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === damages.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(damages.map(d => d.id)));
    }
  };

  const exitSelectMode = () => { setSelectMode(false); setSelectedIds(new Set()); };

  const handleApproveRepair = async (id) => {
    try {
      await roadDamageService.approveRepair(id);
      setSelectedDamage(null);
      loadDamages();
      toast.success("Perbaikan disetujui! Status berubah menjadi Selesai Diperbaiki.");
    } catch { toast.error("Gagal menyetujui perbaikan"); }
  };

  const handleRejectRepair = (id) => {
    setRejectModal({ open: true, id, reason: "", submitting: false });
  };

  const submitRejectRepair = async () => {
    const { id, reason } = rejectModal;
    if (!reason.trim()) {
      toast.error("Alasan penolakan tidak boleh kosong.");
      return;
    }

    setRejectModal(prev => ({ ...prev, submitting: true }));
    try {
      // Jika admin mengisi alasan, simpan ke catatan (notes) terlebih dahulu
      await roadDamageService.update(id, { notes: `Ditolak: ${reason}` });
      await roadDamageService.rejectRepair(id);
      
      setRejectModal({ open: false, id: null, reason: "", submitting: false });
      setSelectedDamage(null);
      loadDamages();
      toast.success("Laporan perbaikan ditolak. Petugas harus mengulangi perbaikan.");
    } catch { 
      toast.error("Gagal menolak laporan perbaikan"); 
      setRejectModal(prev => ({ ...prev, submitting: false }));
    }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    try {
      await roadDamageService.update(id, { status: newStatus });
      loadDamages();
      toast.success("Status berhasil diperbarui");
    } catch (error) { toast.error("Gagal memperbarui status"); }
  };

  const handleSaveNotes = async (id) => {
    try {
      await roadDamageService.update(id, { notes: editingNotes });
      toast.success("Catatan berhasil disimpan");
      loadDamages();
    } catch {
      toast.error("Gagal menyimpan catatan");
    }
  };

  const getDamageTypeColor = (type) => {
    const colors = {
      "Retak-Buaya": "text-red-400 bg-red-900/40 border border-red-700/40",
      "Retak-Memanjang": "text-yellow-400 bg-yellow-900/40 border border-yellow-700/40",
      "Retak-Melintang": "text-green-400 bg-green-900/40 border border-green-700/40",
      Lubang: "text-blue-400 bg-blue-900/40 border border-blue-700/40",
    };
    return colors[type] || "text-gray-400 bg-gray-900/40 border border-gray-700/40";
  };

  const getSeverityBadge = (severity) => {
    const badges = { high: "bg-red-600 text-white", medium: "bg-yellow-500 text-white", low: "bg-green-600 text-white" };
    return badges[severity] || "bg-gray-600 text-white";
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-600 text-white",
      verified: "bg-blue-600 text-white",
      waiting_validation: "bg-orange-500 text-white",
      repaired: "bg-green-600 text-white",
    };
    return badges[status] || "bg-gray-600 text-white";
  };

  const getStatusIcon = (status) => {
    if (status === "repaired") return <Wrench className="w-3 h-3" />;
    if (status === "verified") return <ShieldCheck className="w-3 h-3" />;
    if (status === "waiting_validation") return <Clock className="w-3 h-3" />;
    return <Clock className="w-3 h-3" />;
  };

  return (
    <div>
      <div className="overflow-auto p-4 lg:p-8">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h1 className="text-3xl font-bold text-white">Kelola Data Kerusakan</h1>
              <p className="text-gray-400 mt-1 text-sm">Lihat, periksa, ubah, atau hapus data kerusakan jalan</p>
            </div>
            <div className="flex gap-2">
              {!selectMode ? (
                <>
                  <button
                    onClick={handleRefresh}
                    disabled={refreshing || loading}
                    title="Refresh data"
                    className="btn-secondary flex items-center gap-2 disabled:opacity-60"
                  >
                    <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
                    {refreshing ? "Memuat..." : "Refresh"}
                  </button>
                  <button onClick={() => setSelectMode(true)} className="btn-secondary flex items-center gap-2">
                    <CheckSquare className="w-4 h-4" /> Pilih
                  </button>
                  <button onClick={() => setShowFilters(!showFilters)} className={`btn-secondary flex items-center gap-2 ${showFilters ? "border-blue-500 text-blue-400" : ""}`}>
                    <Filter className="w-4 h-4" /> Filter
                  </button>
                </>
              ) : (
                <button onClick={exitSelectMode} className="btn-secondary flex items-center gap-2">
                  <X className="w-4 h-4" /> Batal
                </button>
              )}
            </div>
          </div>

          {/* Navigasi tab */}
          <div className="flex gap-2 overflow-x-auto pb-1 -mb-1 scrollbar-hide">
            {[
              { id: "all", label: "Semua", icon: FileText },
              { id: "pending", label: "Perlu Verifikasi", icon: AlertTriangle },
              { id: "verified", label: "Siap Diperbaiki", icon: ShieldCheck },
              { id: "waiting_validation", label: "Menunggu Validasi", icon: Clock },
              { id: "repaired", label: "Selesai", icon: CheckCircle2 },
            ].map(({ id, label, icon: Icon }) => {
              const isActive = activeTab === id;
              
              let countValue = 0;
              if (statsCount) {
                if (id === "all") countValue = statsCount.total || 0;
                else {
                  const s = statsCount.by_status?.find(x => x.status === id);
                  countValue = s ? s.count : 0;
                }
              }

              const displayBadge = countValue;

              return (
                <button
                  key={id}
                  onClick={() => setActiveTab(id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                    isActive
                      ? id === "waiting_validation"
                        ? "bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-900/30"
                        : "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-900/30"
                      : isDark
                        ? "bg-gray-800/60 border-gray-700/50 text-gray-400 hover:bg-gray-700 hover:text-gray-200"
                        : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 shadow-sm"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {label}
                  {displayBadge !== 0 && (
                    <span
                      className={`px-2 py-0.5 rounded-md text-xs font-bold ${
                        isActive
                          ? "bg-black/20 text-white"
                          : isDark
                            ? "bg-gray-700 text-gray-300"
                            : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {displayBadge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Toolbar aksi massal */}
          {selectMode && (
            <div className="card bg-blue-900/20 border-blue-600/50 flex items-center justify-between gap-4 py-3">
              <div className="flex items-center gap-3">
                <button onClick={selectAll} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                  {selectedIds.size === damages.length && damages.length > 0
                    ? <CheckSquare className="w-5 h-5 text-blue-400" />
                    : <Square className="w-5 h-5 text-gray-500" />}
                  Pilih Semua
                </button>
                <span className="text-sm text-gray-400">
                  {selectedIds.size > 0
                    ? <span className="text-blue-300 font-semibold">{selectedIds.size} dipilih</span>
                    : "Belum ada yang dipilih"}
                </span>
              </div>
              <button
                onClick={() => setDeleteConfirm({ open: true, id: null, bulk: true })}
                disabled={selectedIds.size === 0 || bulkDeleting}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
                  selectedIds.size > 0 && !bulkDeleting
                    ? "bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    : "bg-gray-700 text-gray-500 cursor-not-allowed"
                }`}
              >
                <Trash className="w-4 h-4" />
                {bulkDeleting ? "Menghapus..." : `Hapus${selectedIds.size > 0 ? ` (${selectedIds.size})` : ""}`}
              </button>
            </div>
          )}

          {/* Bar pencarian */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari berdasarkan jenis kerusakan atau nama petugas..."
              className="input-field pl-10 w-full"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Panel filter */}
          {showFilters && (
            <div className="card">
              <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Filter className="w-4 h-4 text-blue-400" /> Filter &amp; Pengurutan
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Jenis Kerusakan", key: "type", options: [["", "Semua"], ["Retak-Buaya","Retak Buaya"], ["Retak-Memanjang","Retak Memanjang"], ["Retak-Melintang","Retak Melintang"], ["Lubang","Lubang"]] },
                  { label: "Keparahan", key: "severity", options: [["","Semua"],["low","Low"],["medium","Medium"],["high","High"]] },
                ].map(({ label, key, options }) => (
                  <div key={key}>
                    <label className="block text-sm font-medium mb-2">{label}</label>
                    <select value={filters[key]} onChange={e => setFilters({ ...filters, [key]: e.target.value })} className="input-field">
                      {options.map(([val, lbl]) => <option key={val} value={val}>{lbl}</option>)}
                    </select>
                  </div>
                ))}
                <div>
                  <label className="block text-sm font-medium mb-2">Urutkan</label>
                  <select
                    value={`${filters.sort_by}_${filters.sort_order}`}
                    onChange={e => {
                      const [sort_by, sort_order] = e.target.value.split("_");
                      setFilters({ ...filters, sort_by, sort_order });
                    }}
                    className="input-field"
                  >
                    <option value="created_at_desc">Terbaru</option>
                    <option value="created_at_asc">Terlama</option>
                    <option value="confidence_desc">Confidence Tertinggi</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Ringkasan pagination */}
          {!loading && damages.length > 0 && pagination.total > 0 && (
            <div className="flex justify-end text-sm text-gray-400 mb-2 px-1">
              <span>Menampilkan {pagination.from}-{pagination.to} dari total {pagination.total} data</span>
            </div>
          )}

          {/* Konten */}
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
            </div>
          ) : damages.length === 0 ? (
            <div className="card text-center py-16">
              <div className={`w-20 h-20 rounded-full border flex items-center justify-center mx-auto mb-4 ${
                isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"
              }`}>
                <ScanSearch className={`w-10 h-10 ${isDark ? "text-gray-500" : "text-gray-400"}`} />
              </div>
              <p className="text-gray-300 text-lg font-semibold">
                {searchQuery ? "Tidak ada hasil pencarian" : "Belum ada data kerusakan"}
              </p>
              <p className="text-gray-500 text-sm mt-1 mb-4">
                {searchQuery
                  ? `Tidak ada kerusakan yang cocok dengan "${searchQuery}"`
                  : "Data kerusakan jalan yang terdeteksi akan muncul di sini setelah petugas melakukan tracking"}
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="px-4 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors"
                >
                  Hapus Pencarian
                </button>
              )}
              {!searchQuery && Object.values(filters).some(v => v && v !== "created_at" && v !== "desc") && (
                <button
                  onClick={() => setFilters({ type: "", severity: "", status: "", sort_by: "created_at", sort_order: "desc" })}
                  className="px-4 py-2 bg-gray-700 border border-gray-600 text-gray-300 rounded-lg text-sm hover:bg-gray-600 transition-colors"
                >
                  Reset Filter
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {damages.map((damage) => {
                const isSelected = selectedIds.has(damage.id);
                return (
                  <div
                    key={damage.id}
                    className={`card hover:border-primary transition-all relative overflow-hidden group ${
                      isSelected ? "border-blue-500 bg-blue-900/10" : ""
                    }`}
                  >
                    {selectMode && (
                      <button onClick={() => toggleSelect(damage.id)} className="absolute top-3 left-3 z-10">
                        {isSelected
                          ? <CheckSquare className="w-6 h-6 text-blue-400 drop-shadow" />
                          : <Square className="w-6 h-6 text-gray-400 drop-shadow" />}
                      </button>
                    )}

                    {damage.image_path && (
                      <div className={selectMode ? "cursor-pointer" : ""} onClick={selectMode ? () => toggleSelect(damage.id) : undefined}>
                        <RetryImage
                          src={`/storage/${damage.image_path}`}
                          alt={damage.damage_type}
                          className={`w-full h-44 object-cover rounded-lg mb-4 transition-opacity ${isSelected ? "opacity-60" : ""}`}
                        />
                      </div>
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${getDamageTypeColor(damage.damage_type)}`}>
                          {damage.damage_type}
                        </span>
                        <span className={`flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold ${getSeverityBadge(damage.severity)}`}>
                          {damage.severity?.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs text-gray-400">Status</span>
                        <div className="relative">
                          <select
                            value={damage.status}
                            onChange={e => handleStatusUpdate(damage.id, e.target.value)}
                            className="appearance-none text-xs font-bold cursor-pointer pl-2 pr-6 py-1 rounded border-0 outline-none focus:ring-1 focus:ring-offset-0"
                            style={{
                              backgroundColor:
                                damage.status === 'pending' ? '#ca8a04' :
                                damage.status === 'verified' ? '#2563eb' :
                                damage.status === 'waiting_validation' ? '#f97316' :
                                damage.status === 'repaired' ? '#16a34a' : '#4b5563',
                              color: '#ffffff',
                            }}
                          >
                            <option value="pending">Belum Diverifikasi</option>
                            <option value="verified">Terverifikasi</option>
                            <option value="waiting_validation">Menunggu Validasi</option>
                            <option value="repaired">Diperbaiki</option>
                          </select>
                          <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 pointer-events-none" style={{color:'#ffffff'}} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Confidence</span>
                        <span className={`font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}>{(damage.confidence * 100).toFixed(1)}%</span>
                      </div>

                      {damage.tracking_session?.user && (
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <User className="w-3 h-3" />
                          <span>{damage.tracking_session.user.name}</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 text-xs text-gray-400">
                        <Calendar className="w-3 h-3" />
                        <span
                          title={format(new Date(damage.created_at), "dd MMMM yyyy, HH:mm", { locale: id })}
                          className="cursor-help"
                        >
                          {timeAgo(damage.created_at)}
                        </span>
                      </div>
                    </div>

                    {!selectMode && (
                      <div className={`flex gap-2 pt-3 mt-3 border-t ${
                        isDark ? "border-gray-700/50" : "border-gray-200"
                      }`}>
                        <button
                          onClick={() => { setSelectedDamage(damage); setEditingNotes(damage.notes || ""); }}
                          title="Lihat detail kerusakan"
                          className="flex-1 bg-blue-600/20 hover:bg-blue-600 border border-blue-600/40 hover:border-blue-500 text-blue-400 hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>
                        <button
                          onClick={() => handleDelete(damage.id)}
                          title="Hapus data kerusakan ini"
                          className="flex-1 bg-red-600/10 hover:bg-red-600 border border-red-600/30 hover:border-red-500 text-red-400 hover:text-white py-2 px-3 rounded-lg flex items-center justify-center gap-1.5 text-xs font-semibold transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Hapus
                        </button>
                      </div>
                    )}

                    {selectMode && (
                      <button
                        onClick={() => toggleSelect(damage.id)}
                        className={`w-full mt-2 py-2 rounded-lg text-sm font-semibold transition-colors ${
                          isSelected
                            ? "bg-blue-600 text-white"
                            : isDark
                              ? "bg-gray-700 hover:bg-gray-600 text-gray-300"
                              : "bg-gray-100 hover:bg-gray-200 text-gray-600 border border-gray-200"
                        }`}
                      >
                        {isSelected ? "✓ Dipilih" : "Pilih"}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50">
                <ChevronLeft className="w-4 h-4" /> Sebelumnya
              </button>
              <span className="text-gray-400 text-sm">Halaman {currentPage} dari {totalPages}</span>
              <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                className="btn-secondary flex items-center gap-1 disabled:opacity-50">
                Selanjutnya <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal detail */}
      {selectedDamage && (
        <DetailModal
          damage={selectedDamage}
          editingNotes={editingNotes}
          setEditingNotes={setEditingNotes}
          onSaveNotes={handleSaveNotes}
          onClose={() => setSelectedDamage(null)}
          onDelete={(id) => { setSelectedDamage(null); handleDelete(id); }}
          onApprove={handleApproveRepair}
          onReject={handleRejectRepair}
          getSeverityBadge={getSeverityBadge}
          getStatusBadge={getStatusBadge}
          getDamageTypeColor={getDamageTypeColor}
        />
      )}

      {/* Modal konfirmasi custom */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        title={deleteConfirm.bulk ? `Hapus ${selectedIds.size} Data?` : "Hapus Data Kerusakan?"}
        message={
          deleteConfirm.bulk
            ? `${selectedIds.size} data kerusakan yang dipilih akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan.`
            : "Data kerusakan ini akan dihapus secara permanen. Tindakan ini tidak dapat dibatalkan."
        }
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, bulk: false })}
        confirmLabel="Ya, Hapus"
      />

      {/* Modal tolak perbaikan */}
      {rejectModal.open && createPortal(
        <div className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div
            className={`w-full max-w-md rounded-2xl border shadow-2xl p-6 ${
              isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
            }`}
            style={{ animation: "slideUpFade 0.3s ease-out forwards" }}
          >
            <h3 className={`text-xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-800"}`}>
              Tolak Laporan Perbaikan
            </h3>
            <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Mohon masukkan alasan mengapa Anda menolak hasil perbaikan ini (misal: Foto kurang jelas, perbaikan belum selesai).
            </p>
            
            <textarea
              value={rejectModal.reason}
              onChange={(e) => setRejectModal(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Ketikkan alasan penolakan di sini..."
              className={`w-full p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-red-500 mb-5 resize-none h-28 ${
                isDark
                  ? "bg-gray-800 border-gray-700 text-gray-200 placeholder-gray-500"
                  : "bg-gray-50 border-gray-300 text-gray-800 placeholder-gray-400"
              }`}
            />

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRejectModal({ open: false, id: null, reason: "", submitting: false })}
                disabled={rejectModal.submitting}
                className={`px-5 py-2.5 rounded-xl font-semibold transition-colors disabled:opacity-50 ${
                  isDark ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"
                }`}
              >
                Batal
              </button>
              <button
                onClick={submitRejectRepair}
                disabled={rejectModal.submitting || !rejectModal.reason.trim()}
                className="px-5 py-2.5 rounded-xl font-semibold bg-red-600 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {rejectModal.submitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  "Tolak Perbaikan"
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default HistoryPage;
