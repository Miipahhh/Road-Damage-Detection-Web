import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { trackingService } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  Truck,
  Map,
  ClipboardList,
  ShieldAlert,
  AlertTriangle,
  Calendar,
  CheckCheck,
  Activity,
  Footprints,
  RefreshCw,
} from "lucide-react";

const StatCard = ({ icon: Icon, label, value, color, isDark }) => {
  const cardCls = isDark
    ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600"
    : "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300";
  const labelCls = isDark ? "text-gray-400" : "text-gray-500";
  const valueCls = isDark ? "text-white" : "text-gray-900";
  return (
    <div className={`rounded-2xl p-6 border transition-all group ${cardCls}`}>
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className={`text-sm font-medium ${labelCls}`}>{label}</p>
          <h3 className={`text-3xl font-bold mt-2 ${valueCls}`}>{value}</h3>
        </div>
        <div className={`p-4 rounded-lg bg-gradient-to-br from-${color}-500/20 to-${color}-600/10`}>
          <Icon size={28} className={`text-${color}-400`} />
        </div>
      </div>
    </div>
  );
};

const ActionCard = ({ icon: Icon, label, description, onClick, color, isDark }) => {
  const cardCls = isDark
    ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600"
    : "bg-gradient-to-br from-white to-gray-50 border-gray-200 hover:border-gray-300";
  const labelCls = isDark ? "text-white" : "text-gray-800";
  const descCls = isDark ? "text-gray-400" : "text-gray-500";
  return (
    <button
      onClick={onClick}
      className={`rounded-2xl p-6 border transition text-left group hover:shadow-lg hover:shadow-${color}/20 ${cardCls}`}
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-lg bg-gradient-to-br from-${color}-500/20 to-${color}-600/10`}>
          <Icon className={`w-6 h-6 text-${color}-400`} />
        </div>
        <div>
          <p className={`font-semibold transition ${labelCls}`}>{label}</p>
          <p className={`text-sm mt-1 ${descCls}`}>{description}</p>
        </div>
      </div>
    </button>
  );
};

const PetugasDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const { isDark } = useTheme();
  const [activeSession, setActiveSession] = useState(null);
  const [recentSessions, setRecentSessions] = useState([]);
  const [myStats, setMyStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const prevDamageCount = useRef(null);

  useEffect(() => {
    loadData();
    // Auto-refresh setiap 60 detik
    const interval = setInterval(loadData, 60000);
    return () => clearInterval(interval);
  }, []);

  // Polling notif: jika ada kerusakan baru terdeteksi di sesi aktif
  useEffect(() => {
    const checkNewDamage = async () => {
      try {
        const data = await trackingService.getActiveSession();
        const session = data.session;
        if (!session) { prevDamageCount.current = null; return; }
        const count = session.road_damages_count || 0;
        if (prevDamageCount.current !== null && count > prevDamageCount.current) {
          const diff = count - prevDamageCount.current;
          toast.info(`📍 ${diff} kerusakan baru terdeteksi di sesi tracking Anda!`, 6000);
        }
        prevDamageCount.current = count;
      } catch (_) {}
    };
    checkNewDamage();
    const interval = setInterval(checkNewDamage, 60000);
    return () => clearInterval(interval);
  }, [toast]);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      // ambil sesi aktif & riwayat tracking milik petugas ini
      const [activeData, historyData] = await Promise.all([
        trackingService.getActiveSession(),
        trackingService.getMyHistory(1),
      ]);
      setActiveSession(activeData.session);
      setRecentSessions(historyData.data || []);

      if (historyData.data && historyData.data.length > 0) {
        const totalDamages = historyData.data.reduce(
          (sum, session) => sum + (session.road_damages_count || 0),
          0,
        );
        setMyStats({
          totalSessions: historyData.data.length,
          totalDamages: totalDamages,
          completedSessions: historyData.data.filter(
            (s) => s.status === "completed",
          ).length,
        });
      } else {
        setMyStats({ totalSessions: 0, totalDamages: 0, completedSessions: 0 });
      }
      if (isRefresh) toast.success("Data berhasil diperbarui");
    } catch (error) {
      console.error("Error loading dashboard:", error);
      toast.error("Gagal memuat data dashboard. Periksa koneksi Anda.");
      setMyStats({ totalSessions: 0, totalDamages: 0, completedSessions: 0 });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-900">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
          <p className="text-gray-400 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  // Format tanggal & jam saat ini
  const now = new Date();
  const dateStr = now.toLocaleDateString("id-ID", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  const timeStr = now.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return (
    <div className="space-y-8 pb-8">
          {/* Bagian Header */}
          <div className="space-y-2">
            <div>
              <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Dashboard Petugas
              </h1>
              <p className={`text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <Calendar size={16} />
                {dateStr} • {timeStr}
              </p>
              <p className={`text-sm mt-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Selamat datang,{" "}
                <span className="font-semibold text-blue-500">
                  {user?.name}
                </span>
              </p>
            </div>
            {/* Tombol refresh manual */}
            <button
              onClick={() => loadData(true)}
              disabled={refreshing}
              title="Refresh data"
              className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-all text-sm disabled:opacity-50 ${
                isDark
                  ? 'bg-gray-800 border-gray-700 text-gray-400 hover:text-white hover:border-gray-600'
                  : 'bg-white border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400'
              }`}
            >
              <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} />
              <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Refresh"}</span>
            </button>
          </div>

          {/* Notifikasi Sesi Aktif */}
          {activeSession && (
            <div className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl p-6 border border-green-700/30 hover:border-green-600/50 transition">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-semibold text-green-400">
                      Sesi Tracking Aktif
                    </p>
                    <p className="text-sm text-green-400/80 mt-1">
                      Dimulai:{" "}
                      {new Date(activeSession.started_at).toLocaleString(
                        "id-ID",
                      )}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => navigate("/petugas/tracking")}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition text-sm"
                >
                  Lanjutkan Tracking
                </button>
              </div>
            </div>
          )}

          {/* Aksi Cepat */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <ActionCard
              icon={Truck}
              label="Mulai Tracking"
              description="Mulai sesi tracking baru untuk memantau kondisi jalan"
              onClick={() => navigate("/petugas/tracking")}
              color="blue"
              isDark={isDark}
            />
            <ActionCard
              icon={Map}
              label="Lihat Peta"
              description="Peta visualisasi kerusakan jalan di area Anda"
              onClick={() => navigate("/petugas/peta")}
              color="green"
              isDark={isDark}
            />
            <ActionCard
              icon={ClipboardList}
              label="Riwayat Tracking"
              description="Lihat semua riwayat tracking Anda sebelumnya"
              onClick={() => navigate("/petugas/riwayat")}
              color="yellow"
              isDark={isDark}
            />
          </div>

          {/* Statistik Pribadi */}
          {myStats && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <StatCard
                icon={Activity}
                label="Total Sesi Tracking"
                value={myStats.totalSessions}
                color="blue"
                isDark={isDark}
              />
              <StatCard
                icon={ShieldAlert}
                label="Total Kerusakan Dilaporkan"
                value={myStats.totalDamages}
                color="red"
                isDark={isDark}
              />
              <StatCard
                icon={CheckCheck}
                label="Sesi Selesai"
                value={myStats.completedSessions}
                color="green"
                isDark={isDark}
              />
            </div>
          )}

          {/* Riwayat Tracking Terbaru */}
          <div className={`rounded-2xl p-8 border transition ${
            isDark
              ? "bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600"
              : "bg-white border-gray-200 hover:border-gray-300"
          }`}>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className={`text-xl font-bold ${isDark ? "text-white" : "text-gray-900"}`}>
                  Riwayat Tracking Terbaru
                </h3>
                <p className={`text-sm mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  {recentSessions.length} tracking terakhir
                </p>
              </div>
              <div className="p-3 bg-purple-500/20 rounded-lg">
                <Footprints size={20} className="text-purple-400" />
              </div>
            </div>

            {recentSessions.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-3">
                  <Footprints className="w-8 h-8 text-gray-500" />
                </div>
                <p className="text-gray-400 font-medium">
                  Belum ada riwayat tracking
                </p>
                <p className="text-sm text-gray-500 mt-2">
                  Mulai tracking untuk memantau kondisi jalan
                </p>
                <button
                  onClick={() => navigate("/petugas/tracking")}
                  className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition"
                >
                  Mulai Tracking Sekarang
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {recentSessions.slice(0, 5).map((session) => (
                  <div
                    key={session.id}
                    className={`rounded-xl p-4 border transition ${
                      isDark
                        ? 'bg-gray-700/20 border-gray-700/50 hover:border-gray-600'
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-lg flex items-center justify-center">
                          <Footprints className="w-6 h-6 text-blue-400" />
                        </div>
                        <div>
                          <p className={`font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                            {new Date(session.started_at).toLocaleDateString(
                              "id-ID",
                              {
                                weekday: "long",
                                year: "numeric",
                                month: "long",
                                day: "numeric",
                              },
                            )}
                          </p>
                          <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                            Dimulai:{" "}
                            {new Date(session.started_at).toLocaleTimeString(
                              "id-ID",
                            )}
                            {session.ended_at &&
                              ` • Selesai: ${new Date(session.ended_at).toLocaleTimeString("id-ID")}`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span
                          className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                            session.status === "active"
                              ? "bg-green-500/20 text-green-400"
                              : "bg-gray-600/50 text-gray-300"
                          }`}
                        >
                          {session.status === "active" ? "Aktif" : "Selesai"}
                        </span>
                        <p className="text-sm text-gray-400 mt-2 flex items-center justify-end gap-1">
                          <AlertTriangle className="w-3 h-3" />
                          {session.road_damages_count || 0} kerusakan
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {recentSessions.length > 5 && (
              <div className="mt-6 pt-6 border-t border-gray-700">
                <button
                  onClick={() => navigate("/petugas/riwayat")}
                  className="w-full py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg transition border border-blue-600/30 hover:border-blue-600/50 font-medium text-sm"
                >
                  Lihat Semua Riwayat
                </button>
              </div>
            )}
          </div>
    </div>
  );
};

export default PetugasDashboard;
