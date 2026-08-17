import React, { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { roadDamageService } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
  LayoutGrid,
  Map,
  CheckCircle2,
  Wrench,
  ClipboardList,
  RefreshCw,
  Clock,
  Calendar,
} from "lucide-react";

const ReparasiDashboard = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  const [stats, setStats] = useState({ verified: 0, repaired: 0 });
  const [repairedList, setRepairedList] = useState([]);
  const [rejectedList, setRejectedList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const cardBg = isDark
    ? "from-gray-900 to-gray-800 border-gray-700"
    : "from-white to-gray-50 border-gray-200";
  const labelColor = isDark ? "text-gray-400" : "text-gray-500";
  const textColor = isDark ? "text-white" : "text-gray-900";

  const loadData = useCallback(async (showToast = false) => {
    setRefreshing(true);
    try {
      // ambil marker peta yang perlu diperbaiki (verified) & yang sudah selesai (repaired)
      const [verifiedRes, repairedRes] = await Promise.all([
        roadDamageService.getMapMarkers({ status: "verified" }),
        roadDamageService.getMapMarkers({ status: "repaired" }),
      ]);
      const verifiedMarkers = verifiedRes.markers || [];
      const repairedMarkers = repairedRes.markers || [];

      // laporan perbaikan yang ditolak admin ditandai prefix "Ditolak:" di notes
      const rejected = verifiedMarkers.filter(m => m.notes && m.notes.startsWith("Ditolak:"));
      
      setStats({ verified: verifiedMarkers.length, repaired: repairedMarkers.length });
      setRepairedList(repairedMarkers.slice(0, 8));
      setRejectedList(rejected);
      
      if (showToast) toast.success("Data berhasil diperbarui");
    } catch (err) {
      console.error(err);
      toast.error("Gagal memuat data");
    } finally {
      setRefreshing(false);
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh setiap 15 detik
  useEffect(() => {
    const interval = setInterval(() => loadData(), 15000);
    return () => clearInterval(interval);
  }, [loadData]);

  const StatCard = ({ icon: Icon, label, value, color }) => (
    <div className={`bg-gradient-to-br ${cardBg} rounded-2xl p-6 border transition-all hover:shadow-lg`}>
      <div className="flex items-start justify-between">
        <div>
          <p className={`text-sm font-medium ${labelColor}`}>{label}</p>
          <h3 className={`text-4xl font-bold ${textColor} mt-2`}>{value}</h3>
        </div>
        <div className={`p-4 rounded-lg bg-${color}-500/20`}>
          <Icon size={26} className={`text-${color}-400`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen">
      <div className="space-y-6">
        {/* Header halaman */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className={`text-2xl lg:text-3xl font-bold ${textColor}`}>
              Dashboard Tim Perbaikan
            </h1>
            <p className={`${labelColor} mt-1 text-sm`}>
              Selamat datang, {user?.name} • Pantau kerusakan yang perlu diperbaiki
            </p>
          </div>
          <button onClick={() => loadData(true)} disabled={refreshing} className="btn-secondary flex items-center gap-2">
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Memuat..." : "Refresh"}
          </button>
        </div>

        {/* Banner Peringatan Laporan Ditolak */}
        {rejectedList.length > 0 && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-500/20 rounded-xl">
                <ClipboardList className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-red-400">Laporan Ditolak ({rejectedList.length})</h3>
                <p className={`text-sm ${isDark ? "text-red-300/80" : "text-red-700/80"}`}>
                  Admin telah menolak laporan perbaikan Anda. Silakan perbaiki kembali berdasarkan catatan berikut:
                </p>
              </div>
            </div>
            
            <div className="space-y-3 mt-1">
              {rejectedList.map((reject) => (
                <div key={reject.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-red-900/20 border border-red-500/20">
                  <div className="flex-1">
                    <p className="font-bold text-red-400 text-sm mb-1">{reject.damage_type} • {reject.ruas_jalan || "Ruas Jalan Tidak Diketahui"}</p>
                    <p className={`text-sm italic ${isDark ? "text-red-300/90" : "text-red-700/90"}`}>
                      "{reject.notes ? reject.notes.replace("Ditolak: ", "") : "Tanpa alasan"}"
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/reparasi/peta", { state: { focusId: reject.id } })}
                    className={`w-full sm:w-auto px-4 py-2 text-white text-sm rounded-lg font-semibold transition-colors flex-shrink-0 ${
                      isDark ? 'bg-red-600 hover:bg-red-500' : 'bg-red-500 hover:bg-red-600'
                    }`}
                  >
                    Perbaiki Sekarang
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Kartu Statistik */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatCard icon={ClipboardList} label="Perlu Diperbaiki" value={loading ? "..." : stats.verified} color="orange" />
          <StatCard icon={CheckCircle2} label="Sudah Diperbaiki" value={loading ? "..." : stats.repaired} color="green" />
          <button
            onClick={() => navigate("/reparasi/peta")}
            className={`bg-gradient-to-br ${cardBg} rounded-2xl p-6 border text-left transition-all hover:shadow-lg hover:border-blue-500/50`}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className={`text-sm font-medium ${labelColor}`}>Aksi Cepat</p>
                <h3 className={`text-lg font-bold ${textColor} mt-2`}>Lihat Peta Kerusakan</h3>
                <p className={`${labelColor} text-xs mt-1`}>Buka peta & laporkan perbaikan</p>
              </div>
              <div className="p-4 rounded-lg bg-blue-500/20">
                <Map size={26} className="text-blue-400" />
              </div>
            </div>
          </button>
        </div>

        {/* Riwayat Perbaikan */}
        <div className={`bg-gradient-to-br ${cardBg} rounded-2xl border p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Wrench className="w-5 h-5 text-green-400" />
              <h2 className={`text-lg font-bold ${textColor}`}>Riwayat Perbaikan Terbaru</h2>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
            </div>
          ) : repairedList.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-14 h-14 rounded-full bg-gray-700/40 flex items-center justify-center mx-auto mb-3">
                <Wrench className="w-7 h-7 text-gray-500" />
              </div>
              <p className={`${labelColor} text-sm`}>Belum ada laporan perbaikan</p>
            </div>
          ) : (
            <div className="space-y-2">
              {repairedList.map((m) => (
                <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl bg-black/10 border border-white/5">
                  {m.repair_photo_url ? (
                    <img src={m.repair_photo_url} alt="Perbaikan" className="w-12 h-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
                      <CheckCircle2 className="w-6 h-6 text-green-400" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <p className={`font-semibold ${textColor} truncate`}>{m.type}</p>
                    <p className={`text-xs ${labelColor} truncate`}>
                      {m.ruas_jalan || (m.lat && m.lng ? `${m.lat.toFixed(5)}, ${m.lng.toFixed(5)}` : "—")}
                    </p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <p className={`text-xs ${labelColor} flex items-center gap-1 justify-end`}>
                      <Calendar className="w-3 h-3" />
                      {m.repaired_at ? new Date(m.repaired_at).toLocaleDateString("id-ID", { day: "numeric", month: "short" }) : "—"}
                    </p>
                    <p className="text-xs text-green-400 font-semibold mt-0.5">Selesai</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReparasiDashboard;
