import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  useLayoutEffect,
} from "react";
import { useLocation, useNavigate } from "react-router-dom";
import RoadDamageMap, {
  KECAMATAN_KUBU_RAYA,
} from "../components/RoadDamageMap";
import ConfirmModal from "../components/ConfirmModal";
import RetryImage from "../components/RetryImage";
import { roadDamageService, trackingService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
  Filter,
  X,
  RefreshCw,
  Radio,
  Sun,
  Moon,
  Users,
  ChevronDown,
  Navigation,
  Upload,
  Wrench,
  Trash2,
} from "lucide-react";
import imageCompression from "browser-image-compression";

const POLL_INTERVAL = 8000;

// Warna berbeda tiap rute petugas (sinkron dengan RoadDamageMap.petugasColors)
const ROUTE_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#eab308',
  '#8b5cf6', '#f97316', '#ec4899', '#2dd4bf',
];

const setIfChanged = (setter, newValue) => {
  setter((prev) => {
    const prevJson = JSON.stringify(prev);
    const newJson = JSON.stringify(newValue);
    return prevJson === newJson ? prev : newValue;
  });
};

// Panel filter mengambang (floating)
const FilterPanel = ({ filters, setFilters, markers, onClose, onSwitchToAktivitas }) => {
  const [localFilters, setLocalFilters] = useState({ ...filters });

  const damageBreakdown = {
    Lubang: markers.filter((m) => m.type === "Lubang").length,
    "Retak-Buaya": markers.filter((m) => m.type === "Retak-Buaya").length,
    "Retak-Memanjang": markers.filter((m) => m.type === "Retak-Memanjang").length,
    "Retak-Melintang": markers.filter((m) => m.type === "Retak-Melintang").length,
  };


  const toggleType = (type) => {
    setLocalFilters((prev) => ({
      ...prev,
      type: prev.type === type ? "" : type,
    }));
  };
  const toggleSeverity = (s) => {
    setLocalFilters((prev) => ({
      ...prev,
      severity: prev.severity === s ? "" : s,
    }));
  };
  const toggleStatus = (s) => {
    setLocalFilters((prev) => ({
      ...prev,
      status: prev.status === s ? "" : s,
    }));
  };

  const handleApply = () => {
    setFilters(localFilters);
    onClose();
  };
  const handleReset = () => {
    const cleared = { type: "", severity: "", status: "" };
    setLocalFilters(cleared);
    setFilters(cleared);
  };

  // Warna pill untuk tiap jenis kerusakan
  const typeStyles = {
    Lubang: {
      active: "bg-blue-500 text-white border-blue-500",
      inactive:
        "bg-blue-500/10 text-blue-300 border-blue-500/50 hover:bg-blue-500/20",
      dot: "bg-blue-400",
    },
    "Retak-Buaya": {
      active: "bg-red-500 text-white border-red-500",
      inactive:
        "bg-red-500/10 text-red-300 border-red-500/50 hover:bg-red-500/20",
      dot: "bg-red-400",
    },
    "Retak-Memanjang": {
      active: "bg-yellow-500 text-gray-900 border-yellow-500",
      inactive:
        "bg-yellow-500/10 text-yellow-300 border-yellow-500/50 hover:bg-yellow-500/20",
      dot: "bg-yellow-400",
    },
    "Retak-Melintang": {
      active: "bg-green-500 text-white border-green-500",
      inactive:
        "bg-green-500/10 text-green-300 border-green-500/50 hover:bg-green-500/20",
      dot: "bg-green-400",
    },
  };

  const totalShown = markers.length;

  return (
    <div className="absolute top-2 right-2 z-[1000] w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex gap-0">
          <button className="px-4 py-1 text-sm font-bold text-white border-b-2 border-blue-500">
            FILTER
          </button>
          {onSwitchToAktivitas && (
            <button
              onClick={onSwitchToAktivitas}
              className="px-4 py-1 text-sm font-semibold text-gray-400 hover:text-white transition"
            >
              AKTIVITAS
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-5">
        {/* Jumlah data ditampilkan */}
        <p className="text-xs text-gray-400">
          Menampilkan{" "}
          <span className="text-white font-semibold">{totalShown}</span> Laporan
          Terkini
        </p>

        {/* Jenis Kerusakan */}
        <div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(damageBreakdown).map(([type, count]) => {
              const s = typeStyles[type];
              const isActive = localFilters.type === type;
              return (
                <button
                  key={type}
                  onClick={() => toggleType(type)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                    isActive ? s.active : s.inactive
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${s.dot}`} />
                  {type} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Severity */}
        <div>
          <p className="text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">
            Severity
          </p>
          <div className="flex gap-2">
            {[
              {
                key: "low",
                label: "Rendah",
                color: "bg-green-500/20 text-green-400 border-green-500/50",
                active: "bg-green-500 text-white border-green-500",
              },
              {
                key: "medium",
                label: "Sedang",
                color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
                active: "bg-yellow-500 text-gray-900 border-yellow-500",
              },
              {
                key: "high",
                label: "Tinggi",
                color: "bg-red-500/20 text-red-400 border-red-500/50",
                active: "bg-red-500 text-white border-red-500",
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => toggleSeverity(s.key)}
                className={`flex-1 py-1.5 rounded-full border text-xs font-bold transition-all ${
                  localFilters.severity === s.key
                    ? s.active
                    : s.color + " hover:opacity-80"
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Status */}
        <div>
          <p className="text-xs font-bold text-gray-400 mb-2 tracking-widest uppercase">
            Status
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              {
                key: "pending",
                label: "Belum Diverifikasi",
                color: "bg-purple-500/20 text-purple-300 border-purple-500/50",
                active: "bg-purple-500 text-white border-purple-500",
              },
              {
                key: "verified",
                label: "Terverifikasi",
                color: "bg-blue-500/20 text-blue-300 border-blue-500/50",
                active: "bg-blue-500 text-white border-blue-500",
              },
              {
                key: "waiting_validation",
                label: "Menunggu Validasi",
                color: "bg-orange-500/20 text-orange-300 border-orange-500/50",
                active: "bg-orange-500 text-white border-orange-500",
              },
              {
                key: "repaired",
                label: "Diperbaiki",
                color: "bg-green-500/20 text-green-300 border-green-500/50",
                active: "bg-green-500 text-white border-green-500",
              },
            ].map((s) => (
              <button
                key={s.key}
                onClick={() => toggleStatus(s.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
                  localFilters.status === s.key
                    ? s.active
                    : s.color + " hover:opacity-80"
                }`}
              >
                {s.key === "verified" && <span>✓</span>}
                {s.key === "repaired" && <span>✓</span>}
                {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Terapkan / Reset */}
        <div className="flex gap-3 pt-1">
          <button
            onClick={handleApply}
            className="flex-1 py-2.5 bg-teal-500 hover:bg-teal-400 text-white font-bold rounded-lg text-sm transition-colors"
          >
            Apply
          </button>
          <button
            onClick={handleReset}
            className="flex-1 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-200 font-bold rounded-lg text-sm transition-colors"
          >
            Reset
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Aktivitas Panel — menggunakan data REAL dari liveTracking API & routePaths
// ============================================================
const AktivitasPanel = ({
  liveTracking = [],
  routePaths = [],
  onClose,
  onSwitchToFilter,
  onDeleteSession,
  onBulkDeleteCompleted,
}) => {
  const activePetugasCount = liveTracking.length;

  // Hitung durasi sesi dalam menit/jam dari started_at
  const getDurasi = (startedAt) => {
    if (!startedAt) return null;
    const start = new Date(startedAt);
    const now = new Date();
    const menit = Math.floor((now - start) / 60000);
    if (menit < 1) return "Baru Mulai";
    if (menit < 60) return `${menit} menit`;
    const jam = Math.floor(menit / 60);
    const sisa = menit % 60;
    return sisa > 0 ? `${jam}j ${sisa}m` : `${jam} jam`;
  };

  const petugasColors = [
    "#3b82f6", "#ef4444", "#22c55e",
    "#eab308", "#8b5cf6", "#f97316",
  ];

  return (
    <div className="absolute top-2 right-2 z-[1000] w-80 bg-gray-900/95 backdrop-blur-md border border-gray-700 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
        <div className="flex gap-0">
          <button
            onClick={onSwitchToFilter}
            className="px-4 py-1 text-sm font-semibold text-gray-400 hover:text-white transition"
          >
            FILTER
          </button>
          <button className="px-4 py-1 text-sm font-bold text-white border-b-2 border-blue-500">
            AKTIVITAS
          </button>
        </div>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-gray-300 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="px-4 py-4 space-y-4 max-h-[75vh] overflow-y-auto">
        {/* ── Sesi Tracking Aktif ── */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-green-400 tracking-widest uppercase flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Sesi Tracking Aktif
            </h3>
            <span className="text-[11px] font-bold text-gray-400 bg-gray-800 px-2 py-0.5 rounded-full border border-gray-700">
              {activePetugasCount}
            </span>
          </div>
          {liveTracking.length > 0 ? (
            <div className="space-y-2">
              {liveTracking.map((session, idx) => {
                const color = petugasColors[idx % petugasColors.length];
                const durasi = getDurasi(session.started_at);
                const namaRuas = session.ruas_jalan_name || null;
                const lokasiLabel = namaRuas
                  ? namaRuas.substring(0, 30)
                  : session.last_position
                    ? `${Number(session.last_position.lat).toFixed(4)}, ${Number(session.last_position.lng).toFixed(4)}`
                    : "Menunggu GPS...";
                const jumlahKerusakan = (session.road_damages || session.damages || []).length;
                const namaPetugas = session.user?.name || "Petugas";

                return (
                  <div
                    key={`live-card-${session.id || idx}`}
                    className="rounded-lg p-3 border transition hover:border-gray-500"
                    style={{
                      background: `${color}10`,
                      borderColor: `${color}40`,
                    }}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-gray-400">#{session.id}</span>
                          <p className="font-semibold text-white text-sm truncate">
                            {namaPetugas}
                          </p>
                        </div>
                        <p className="text-gray-300 truncate text-xs mt-1">
                          📍 {lokasiLabel}
                        </p>
                        <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                          <span className="text-xs font-medium" style={{ color }}>
                            🟢 Aktif{durasi ? ` · ${durasi}` : ""}
                          </span>
                          {jumlahKerusakan > 0 && (
                            <span className="text-[10px] bg-red-500/20 text-red-300 border border-red-500/30 px-1.5 py-0.5 rounded-full font-semibold">
                              {jumlahKerusakan} kerusakan
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2 flex-shrink-0">
                        <div
                          className="w-7 h-7 rounded-lg flex items-center justify-center shadow-sm"
                          style={{
                            backgroundColor: `${color}30`,
                            border: `1.5px solid ${color}`,
                          }}
                        >
                          <div
                            className="w-2 h-2 rounded-full animate-pulse"
                            style={{ backgroundColor: color }}
                          />
                        </div>
                        {onDeleteSession && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onDeleteSession(session.id, namaPetugas);
                            }}
                            title="Hapus sesi tracking aktif ini"
                            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition border border-red-500/30 shadow-sm"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800/60 rounded-lg p-4 border border-dashed border-gray-700 text-center">
              <Users className="w-6 h-6 text-gray-600 mx-auto mb-1.5" />
              <p className="text-xs text-gray-400">Tidak ada tracking aktif</p>
            </div>
          )}
        </div>

        {/* ── Riwayat Rute Selesai di Peta ── */}
        <div className="pt-3 border-t border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-gray-400 tracking-widest uppercase flex items-center gap-1.5">
              <span>🗺️ Riwayat Rute Selesai</span>
            </h3>
            {routePaths.length > 0 && onBulkDeleteCompleted && (
              <button
                onClick={onBulkDeleteCompleted}
                className="text-[10px] bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white font-semibold px-2 py-1 rounded transition flex items-center gap-1 border border-red-500/30 shadow-sm"
                title="Bersihkan semua rute yang selesai dari peta"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan ({routePaths.length})
              </button>
            )}
          </div>
          {routePaths.length > 0 ? (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {routePaths.map((route, idx) => {
                const color = route.color || petugasColors[idx % petugasColors.length];
                const namaRuas = route.ruas_jalan_name || "—";
                const namaPetugas = route.userName || "Petugas";
                const jumlahKerusakan = (route.damages || []).length;

                return (
                  <div
                    key={`history-card-${route.id || idx}`}
                    className="rounded-lg p-2.5 border transition hover:border-gray-500 flex items-center justify-between gap-2"
                    style={{
                      background: `${color}0a`,
                      borderColor: `${color}30`,
                    }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
                        <span className="text-[10px] font-bold text-gray-500">#{route.id}</span>
                        <p className="font-semibold text-white text-xs truncate">
                          {namaPetugas}
                        </p>
                      </div>
                      <p className="text-gray-400 truncate text-[11px] mt-0.5 ml-3.5">
                        📍 {namaRuas}
                      </p>
                      <div className="flex items-center gap-2 mt-1 ml-3.5">
                        <span className="text-[10px] text-gray-500">Selesai</span>
                        {jumlahKerusakan > 0 && (
                          <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-1.5 py-0 rounded font-semibold">
                            {jumlahKerusakan} kerusakan
                          </span>
                        )}
                      </div>
                    </div>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(route.id, namaPetugas);
                        }}
                        title="Hapus riwayat rute ini dari peta"
                        className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition border border-red-500/30 shadow-sm flex-shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-gray-800/60 rounded-lg p-3 border border-dashed border-gray-700 text-center">
              <p className="text-xs text-gray-500">Tidak ada riwayat rute di peta</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const LaporPerbaikanModal = ({ marker, onClose, onSubmit, submitting }) => {
  const [photo, setPhoto] = useState(null);
  const [notes, setNotes] = useState("");
  const fileInputRef = React.useRef(null);

  // Reset form setiap kali marker berganti (laporan baru)
  useEffect(() => {
    setPhoto(null);
    setNotes("");
    // Reset file input agar nama file lama tidak menempel
    if (fileInputRef.current) fileInputRef.current.value = "";
  }, [marker?.id]);

  if (!marker) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!photo) return;
    onSubmit({ photo, notes });
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      setPhoto(null);
      return;
    }

    try {
      // Terapkan kompresi image (<300KB)
      const options = {
        maxSizeMB: 0.3, // Maksimal 300KB
        maxWidthOrHeight: 1280,
        useWebWorker: true,
      };
      
      const compressedFile = await imageCompression(file, options);
      setPhoto(compressedFile);
    } catch (error) {
      console.error("Gagal mengompres gambar:", error);
      // Fallback ke file asli jika kompresi gagal
      setPhoto(file);
    }
  };

  const handleClose = () => {
    setPhoto(null);
    setNotes("");
    if (fileInputRef.current) fileInputRef.current.value = "";
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[1200] flex items-center justify-center p-4" onClick={handleClose}>
      <div className="bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="px-5 py-4 border-b border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-600/20 flex items-center justify-center">
              <Wrench className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-white font-bold">Lapor Perbaikan</h3>
              <p className="text-xs text-gray-400">{marker.type} • {marker.ruas_jalan || "Ruas jalan tidak diketahui"}</p>
            </div>
          </div>
          <button onClick={handleClose} className="text-gray-400 hover:text-white"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {marker.status === 'verified' && marker.notes && marker.notes.includes("Ditolak") && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 flex gap-3 items-start">
              <div className="mt-0.5">
                <span className="w-4 h-4 inline-flex items-center justify-center bg-red-500 text-white rounded-full text-[10px] font-bold">!</span>
              </div>
              <div>
                <p className="text-red-400 text-xs font-bold uppercase tracking-wider mb-1">Laporan Sebelumnya Ditolak Admin</p>
                <p className="text-red-300/80 text-sm">{marker.notes.replace("Ditolak: ", "")}</p>
              </div>
            </div>
          )}

          {marker.image_url && (
            <div>
              <p className="text-xs text-gray-400 mb-2">Foto kerusakan sebelumnya</p>
              <RetryImage src={marker.image_url} alt="Kerusakan" className="w-full h-40 object-cover rounded-xl border border-gray-700" />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Foto jalan setelah diperbaiki</label>
            <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-600 rounded-xl p-5 cursor-pointer hover:border-green-500 transition">
              <Upload className="w-6 h-6 text-green-400" />
              <span className="text-sm text-gray-300">{photo ? photo.name : "Pilih foto perbaikan"}</span>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/jpg" className="hidden" onChange={handlePhotoChange} required />
            </label>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-300 mb-2">Catatan (opsional)</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className="input-field resize-none" placeholder="Contoh: Lubang sudah ditambal dan diratakan" />
          </div>

          <div className="flex gap-3 pt-2">
            <button type="button" onClick={handleClose} className="btn-secondary flex-1">Batal</button>
            <button type="submit" disabled={!photo || submitting} className="btn-primary flex-1 disabled:opacity-60">
              {submitting ? "Mengirim..." : "Kirim Laporan"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const MapPage = () => {
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin, isReparasi } = useAuth();
  // Simpan isAdmin di ref agar refreshData selalu pakai versi terbaru
  // tanpa perlu isAdmin masuk ke deps array (isAdmin berubah tiap render)
  const isAdminRef = useRef(isAdmin);
  const isReparasiRef = useRef(isReparasi);
  useEffect(() => { isAdminRef.current = isAdmin; isReparasiRef.current = isReparasi; });

  const [markers, setMarkers] = useState([]);
  const [routePaths, setRoutePaths] = useState([]);
  const [liveTracking, setLiveTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openPanel, setOpenPanel] = useState(null); // null | "filter" | "aktivitas"
  const [filters, setFilters] = useState({
    type: "",
    severity: "",
    status: "",
  });
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [selectedArea, setSelectedArea] = useState("all");
  const { isDark } = useTheme();
  const [mapMode, setMapMode] = useState(isDark ? "dark" : "light");
  const [selectedRuas, setSelectedRuas] = useState("");
  const [ruasList, setRuasList] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [repairMarker, setRepairMarker] = useState(null);
  const [repairSubmitting, setRepairSubmitting] = useState(false);
  const [focusMarkerLoaded, setFocusMarkerLoaded] = useState(false);
  const pollRef = useRef(null);

  // ── Geolocation: lokasi user saat ini ──
  const [userLocation, setUserLocation] = useState(null);
  const [locating, setLocating] = useState(false);
  const [locError, setLocError] = useState(null);
  const watchRef = useRef(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, sessionId: null, userName: null, bulk: false });

  // Mulai/berhenti watch lokasi
  const toggleUserLocation = () => {
    if (userLocation || locating) {
      // Matikan
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
        watchRef.current = null;
      }
      setUserLocation(null);
      setLocating(false);
      setLocError(null);
    } else {
      if (!navigator.geolocation) {
        setLocError("Browser tidak mendukung GPS");
        return;
      }
      setLocating(true);
      setLocError(null);
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setUserLocation({
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
          });
          setLocating(false);
        },
        (err) => {
          setLocError("Izin GPS ditolak atau tidak tersedia");
          setLocating(false);
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    }
  };

  // Bersihkan watch saat unmount
  useEffect(() => {
    return () => {
      if (watchRef.current !== null) {
        navigator.geolocation.clearWatch(watchRef.current);
      }
    };
  }, []);

  useEffect(() => {
    loadData();
  }, [filters]);

  useEffect(() => {
    if (isLiveMode) {
      pollRef.current = setInterval(() => {
        refreshData();
      }, POLL_INTERVAL);
    }
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [isLiveMode, filters]);

  // Auto-open Aktivitas panel HANYA untuk admin saat pertama kali ada petugas aktif
  const autoOpenedRef = useRef(false);
  useEffect(() => {
    if (isAdmin() && liveTracking.length > 0 && !autoOpenedRef.current) {
      autoOpenedRef.current = true;
      setOpenPanel("aktivitas");
    }
    // Reset jika semua petugas selesai agar bisa auto-open lagi nanti
    if (liveTracking.length === 0) {
      autoOpenedRef.current = false;
    }
  }, [liveTracking.length]);

  // Auto-open form perbaikan dan fokus ke marker yang ditolak
  const lastFocusedIdRef = useRef(null);
  useEffect(() => {
    if (location.state?.focusId && markers.length > 0) {
      const targetId = String(location.state.focusId);
      const targetTime = location.state?._t || targetId;
      if (lastFocusedIdRef.current !== targetTime) {
        const targetMarker = markers.find(m => String(m.id) === targetId);
        if (targetMarker) {
          if (isReparasi()) {
            setRepairMarker(targetMarker);
          }
          lastFocusedIdRef.current = targetTime;
          setFocusMarkerLoaded(true);
        }
      }
    }
  }, [location.state, markers, isReparasi]);

  const refreshData = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    try {
      const adminMode = isAdminRef.current();
      const reparasiMode = isReparasiRef.current();
      const markerFilters = reparasiMode ? { ...filters, status: "verified" } : filters;
      const promises = [roadDamageService.getMapMarkers(markerFilters)];
      if (adminMode) {
        promises.push(
          trackingService
            .getAllHistory({ per_page: 50, status: "completed" })
            .catch(() => ({ data: [] })),
          trackingService.getLiveSessions().catch(() => ({ sessions: [] })),
        );
      } else {
        // Petugas: hanya ambil riwayat mereka sendiri (tidak perlu tampilkan di peta)
        promises.push(
          Promise.resolve({ data: [] }),
        );
      }

      const results = await Promise.all(promises);
      setIfChanged(setMarkers, results[0].markers || []);

      // Hanya admin yang bisa melihat route path petugas di peta
      if (adminMode) {
        const completedRoutes = (results[1].data || [])
          .filter(
            (s) =>
              (s.route_path && s.route_path.length > 1) ||
              (s.road_damages && s.road_damages.length > 0) ||
              (s.start_point && s.end_point),
          )
          .map((s, idx) => ({
            id: s.id,
            path: s.route_path || [],
            color: (() => {
              if (s.user_id || s.user?.id) {
                const uid = Number(s.user_id || s.user.id);
                if (!isNaN(uid) && uid > 0) return ROUTE_COLORS[(uid - 1) % ROUTE_COLORS.length];
              }
              const str = String(s.user?.name || s.id || 'petugas');
              let hash = 0;
              for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
              return ROUTE_COLORS[Math.abs(hash) % ROUTE_COLORS.length];
            })(),
            userName: s.user?.name || "Petugas",
            user_id: s.user_id || s.user?.id || null,
            start_point: s.start_point || null,
            end_point: s.end_point || null,
            ruas_jalan_name: s.ruas_jalan_name || null,
            damages: s.road_damages || [],
          }));
        setIfChanged(setRoutePaths, completedRoutes);
      } else {
        setIfChanged(setRoutePaths, []);
      }

      if (adminMode && results[2]) {
        setIfChanged(setLiveTracking, results[2].sessions || []);
      }
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error refreshing map data:", error);
      toast.error('Gagal memperbarui data');
    } finally {
      setRefreshing(false);
    }
  }, [filters, refreshing]); // ← isAdmin tidak perlu masuk deps, pakai ref

  const handleDeleteTrackingSession = async (sessionId, userName) => {
    setDeleteConfirm({ open: true, sessionId, userName, bulk: false });
  };

  const handleBulkDeleteCompletedRoutes = async () => {
    if (!routePaths || routePaths.length === 0) return;
    setDeleteConfirm({ open: true, sessionId: null, userName: null, bulk: true });
  };

  const executeDelete = async () => {
    const { sessionId, bulk } = deleteConfirm;
    setDeleteConfirm(prev => ({ ...prev, open: false }));
    try {
      if (bulk) {
        const ids = routePaths.map(r => r.id);
        await trackingService.bulkDeleteSessions(ids);
        toast.success("Semua riwayat rute selesai berhasil dibersihkan");
      } else {
        await trackingService.bulkDeleteSessions([sessionId]);
        toast.success("Sesi tracking berhasil dihapus dari peta");
      }
      refreshData();
    } catch (err) {
      console.error("Gagal menghapus:", err);
      toast.error("Gagal menghapus sesi tracking");
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await refreshData();
    } finally {
      setLoading(false);
    }
  };

  const hasActiveFilters = filters.type || filters.severity || filters.status;

  const handleRepairSubmit = async ({ photo, notes }) => {
    if (!repairMarker || !photo) return;
    setRepairSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("repair_photo", photo, photo.name || "repair.jpg");
      formData.append("repair_notes", notes || "");
      await roadDamageService.laporPerbaikan(repairMarker.id, formData);
      toast.success("Laporan perbaikan berhasil dikirim.");
      setRepairMarker(null);
      await refreshData();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Gagal mengirim laporan perbaikan.");
    } finally {
      setRepairSubmitting(false);
    }
  };

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        backgroundColor: "var(--color-secondary)",
      }}
    >
      <div
        style={{
          flex: 1,
          display: "flex",
          overflow: "hidden",
          position: "relative",
          minHeight: 0,
        }}
      >
        {/* Kontainer peta */}
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            position: "relative",
            minHeight: 0,
          }}
        >
          {/* Bar kontrol atas - selalu fixed, tidak ikut scroll */}
          <div
            className="map-controls-bar border-b border-gray-700/60 py-1.5 text-xs z-10 flex-shrink-0"
            style={{
              backgroundColor: "var(--color-nav-solid)",
              backdropFilter: "blur(8px)",
              borderBottomColor: "var(--color-border)",
            }}
          >
            <div className="max-w-[1400px] mx-auto px-4 lg:px-8 flex items-center justify-between flex-wrap gap-1.5">
            <div className="flex items-center gap-2">

              <div className="relative">
                <select
                  value={selectedArea}
                  onChange={(e) => setSelectedArea(e.target.value)}
                  className="appearance-none border text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-blue-500 cursor-pointer"
                  style={{
                    backgroundColor: "var(--color-input-bg)",
                    borderColor: "var(--color-input-border)",
                    color: "var(--color-text)",
                  }}
                >
                  {KECAMATAN_KUBU_RAYA.map((kec) => (
                    <option key={kec.id} value={kec.id}>
                      {kec.name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>

              <div className="relative">
                <select
                  value={selectedRuas}
                  onChange={(e) => setSelectedRuas(e.target.value)}
                  className="appearance-none border text-xs rounded-lg pl-2.5 pr-6 py-1 focus:outline-none focus:border-blue-500 cursor-pointer max-w-[160px]"
                  style={{
                    backgroundColor: "var(--color-input-bg)",
                    borderColor: "var(--color-input-border)",
                    color: "var(--color-text)",
                  }}
                >
                  <option value="">Semua Ruas Jalan</option>
                  {ruasList.map((name) => (
                    <option key={name} value={name}>
                      {name}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3 h-3 text-gray-400 absolute right-1.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => refreshData()}
                disabled={refreshing}
                className="map-ctrl-btn border text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 disabled:opacity-50"
                style={{
                  backgroundColor: "var(--color-input-bg)",
                  borderColor: "var(--color-input-border)",
                  color: "var(--color-text)",
                }}
              >
                <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Memuat...' : 'Refresh'}
              </button>

              {/* Tombol Lokasi Saya */}
              <button
                onClick={toggleUserLocation}
                title={userLocation ? "Matikan lokasi saya" : locating ? "Mencari lokasi..." : "Tampilkan lokasi saya"}
                className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                  userLocation
                    ? "bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-900/40"
                    : locating
                    ? "bg-blue-900/50 border-blue-600 text-blue-300 animate-pulse"
                    : "map-ctrl-btn"
                }`}
                style={userLocation || locating ? {} : {
                  backgroundColor: "var(--color-input-bg)",
                  borderColor: "var(--color-input-border)",
                  color: "var(--color-text)",
                }}
              >
                <Navigation className={`w-3 h-3 ${locating ? 'animate-spin' : ''}`} />
                {locating ? 'GPS...' : userLocation ? 'Saya' : 'Lokasi'}
              </button>

              {/* Tombol filter */}
              <button
                onClick={() =>
                  setOpenPanel(openPanel === "filter" ? null : "filter")
                }
                className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                  openPanel === "filter"
                    ? "bg-blue-600 border-blue-500 text-white"
                    : hasActiveFilters
                      ? "bg-blue-900/50 border-blue-600 text-blue-300"
                      : "map-ctrl-btn"
                }`}
                style={(openPanel === "filter" || hasActiveFilters) ? {} : {
                  backgroundColor: "var(--color-input-bg)",
                  borderColor: "var(--color-input-border)",
                  color: "var(--color-text)",
                }}
              >
                <Filter className="w-3 h-3" />
                Filter
                {hasActiveFilters && (
                  <span className="w-1.5 h-1.5 bg-blue-400 rounded-full" />
                )}
              </button>

              {isAdmin() && (
                <button
                  onClick={() =>
                    setOpenPanel(openPanel === "aktivitas" ? null : "aktivitas")
                  }
                  className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                    openPanel === "aktivitas"
                      ? "bg-blue-600 border-blue-500 text-white"
                      : "map-ctrl-btn"
                  }`}
                  style={openPanel === "aktivitas" ? {} : {
                    backgroundColor: "var(--color-input-bg)",
                    borderColor: "var(--color-input-border)",
                    color: "var(--color-text)",
                  }}
                >
                  <Users className="w-3 h-3" />
                  Aktivitas
                  {liveTracking.length > 0 && (
                    <span className="bg-green-500 text-white text-[10px] font-bold px-1 rounded-full">
                      {liveTracking.length}
                    </span>
                  )}
                </button>
              )}

              <button
                onClick={() =>
                  setMapMode(mapMode === "dark" ? "light" : "dark")
                }
                className={`text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1 border ${
                  mapMode === "dark"
                    ? "bg-gray-800 border-gray-600 text-yellow-300 hover:bg-gray-700"
                    : "bg-yellow-100 border-yellow-300 text-gray-800 hover:bg-yellow-200"
                }`}
              >
                {mapMode === "dark" ? (
                  <Sun className="w-3 h-3" />
                ) : (
                  <Moon className="w-3 h-3" />
                )}
              </button>
            </div>
            </div>{/* akhir kontainer max-w tengah */}
          </div>

          {/* Peta */}
          <div
            style={{
              flex: 1,
              position: "relative",
              overflow: "hidden",
              minHeight: 0,
            }}
          >
            {loading ? (
              <div className="flex items-center justify-center h-full bg-gray-900">
                <div className="flex flex-col items-center gap-3">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500" />
                  <p className="text-sm text-gray-400">Memuat peta...</p>
                </div>
              </div>
            ) : (
              <RoadDamageMap
                markers={markers}
                routePaths={routePaths}
                liveTracking={liveTracking}
                selectedArea={selectedArea}
                mapMode={mapMode}
                selectedRuas={selectedRuas || null}
                onRuasListLoaded={setRuasList}
                filters={filters}
                userLocation={userLocation}
                currentUserId={user?.id}
                onRepairClick={isReparasi() ? setRepairMarker : null}
                focusMarkerId={location.state?.focusId || null}
                onDeleteSession={isAdmin() ? handleDeleteTrackingSession : null}
              />
            )}

            {/* Panel mengambang */}
            {openPanel === "filter" && (
              <FilterPanel
                filters={filters}
                setFilters={setFilters}
                markers={markers}
                onClose={() => setOpenPanel(null)}
                onSwitchToAktivitas={isAdmin() ? () => setOpenPanel("aktivitas") : null}
              />
            )}
            {isAdmin() && openPanel === "aktivitas" && (
              <AktivitasPanel
                liveTracking={liveTracking}
                routePaths={routePaths}
                onClose={() => setOpenPanel(null)}
                onSwitchToFilter={() => setOpenPanel("filter")}
                onDeleteSession={handleDeleteTrackingSession}
                onBulkDeleteCompleted={handleBulkDeleteCompletedRoutes}
              />
            )}
          </div>

          {/* Legenda */}
          <div className="bg-gray-900/80 backdrop-blur-sm border-t border-gray-700/60 px-3 py-1 text-xs text-gray-400 flex items-center flex-wrap gap-3 overflow-x-auto whitespace-nowrap flex-shrink-0">
            {[
              { color: "bg-blue-500", label: "Lubang" },
              { color: "bg-red-500", label: "Retak Buaya" },
              { color: "bg-yellow-500", label: "Retak Memanjang" },
              { color: "bg-green-500", label: "Retak Melintang" },
            ].map(({ color, label }) => (
              <div key={label} className="flex items-center gap-1">
                <div className={`w-2 h-2 rounded-full ${color}`} />
                <span>{label}</span>
              </div>
            ))}
            {isAdmin() && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50 animate-pulse" />
                <span>Live</span>
              </div>
            )}
            {userLocation && (
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-400 border border-white/50" style={{ boxShadow: '0 0 0 2px rgba(59,130,246,0.4)' }} />
                <span>Lokasi Saya</span>
              </div>
            )}
            {locError && (
              <span className="text-red-400 text-[10px] ml-1">⚠ {locError}</span>
            )}
            {lastUpdate && (
              <span className="ml-auto text-gray-600 text-[10px]">
                Update: {lastUpdate.toLocaleTimeString("id-ID")}
              </span>
            )}
          </div>
        </div>
      </div>

      <LaporPerbaikanModal
        marker={repairMarker}
        onClose={() => setRepairMarker(null)}
        onSubmit={handleRepairSubmit}
        submitting={repairSubmitting}
      />

      {/* Konfirmasi hapus rute — menggantikan window.confirm bawaan browser */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        type="danger"
        title={deleteConfirm.bulk ? `Hapus ${routePaths.length} Riwayat Rute?` : 'Hapus Sesi Tracking?'}
        message={
          deleteConfirm.bulk
            ? `Semua ${routePaths.length} jalur rute yang sudah selesai akan dihapus dari peta. Data kerusakan jalan dan foto bukti tetap aman.`
            : `Jalur rute milik ${deleteConfirm.userName || 'Petugas'} akan dihapus dari peta. Data kerusakan jalan dan foto bukti tetap aman.`
        }
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        onConfirm={executeDelete}
        onCancel={() => setDeleteConfirm(prev => ({ ...prev, open: false }))}
      />
    </div>
  );
};

export default MapPage;
