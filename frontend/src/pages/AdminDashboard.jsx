import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import {
  Chart as ChartJS,
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
} from "chart.js";
import { Bar, Line, Doughnut, Radar } from "react-chartjs-2";
import { roadDamageService, trackingService } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
  ShieldAlert,
  AlertCircle,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Footprints,
  Activity,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  ChevronRight,
  Wrench,
  Hourglass,
  BarChart2,
  RefreshCw,
  PieChart as PieChartIcon,
  ShieldCheck,
} from "lucide-react";

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  RadialLinearScale,
  Title,
  Tooltip,
  Legend,
  Filler,
);

const StatCard = ({ icon: Icon, label, value, trend, trendUp, color, onClick }) => {
  return (
    <div
      onClick={onClick}
      className={`bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 border border-gray-700 hover:border-gray-600 transition-all hover:shadow-lg hover:shadow-${color}/20 group ${onClick ? "cursor-pointer hover:scale-[1.02] active:scale-[0.98]" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <p className="text-gray-400 text-sm font-medium">{label}</p>
          <h3 className="text-4xl font-bold text-white mt-2 group-hover:text-gray-100 transition">
            {value}
          </h3>

          {trend && (
            <div
              className={`flex items-center gap-1 mt-3 px-3 py-1 rounded-full w-fit text-xs font-semibold ${
                trendUp
                  ? "bg-green-500/20 text-green-400"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {trendUp ? (
                <ArrowUpRight size={14} />
              ) : (
                <ArrowDownRight size={14} />
              )}
              {trend}
            </div>
          )}
        </div>

        <div
          className={`p-4 rounded-lg bg-gradient-to-br from-${color}-500/20 to-${color}-600/10`}
        >
          <Icon size={28} className={`text-${color}-400`} />
        </div>
      </div>
    </div>
  );
};

const ChartSwitcher = ({ options, active, onChange }) => {
  return (
    <div className="flex gap-1 bg-gray-700/50 rounded-lg p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            active === opt.value
              ? "bg-blue-600 text-white shadow-sm"
              : "text-gray-400 hover:text-gray-200 hover:bg-gray-600/50"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
};

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { isDark } = useTheme();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const [recentTracking, setRecentTracking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [chartTypeDamage, setChartTypeDamage] = useState("doughnut");
  const [chartTypeSeverity, setChartTypeSeverity] = useState("bar");

  // Track waiting_validation count untuk deteksi laporan baru
  const prevWaitingCount = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Auto-refresh statistik setiap 30 detik
  useEffect(() => {
    const interval = setInterval(() => {
      loadData();
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  // Polling notifikasi: cek laporan perbaikan baru setiap 30 detik
  useEffect(() => {
    const checkNewRepairReports = async () => {
      try {
        const res = await roadDamageService.getAll({ status: "waiting_validation", per_page: 100 });
        const currentCount = (res.data || []).length;
        if (prevWaitingCount.current !== null && currentCount > prevWaitingCount.current) {
          const diff = currentCount - prevWaitingCount.current;
          toast.warning(
            `🔔 ${diff} laporan perbaikan baru masuk! Buka Data Kerusakan → "Menunggu Validasi"`,
            8000
          );
          loadData(); // refresh stats card juga
        }
        prevWaitingCount.current = currentCount;
      } catch (_) {}
    };

    // Set baseline saat pertama kali mount
    checkNewRepairReports();
    const interval = setInterval(checkNewRepairReports, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      // ambil statistik kerusakan & riwayat tracking sekaligus
      const [statsData, trackingData] = await Promise.all([
        roadDamageService.getStatistics(),
        trackingService
          .getAllHistory({ per_page: 15 })
          .catch(() => ({ data: [] })),
      ]);
      setStats(statsData);
      setRecentTracking(trackingData.data || []);
      if (isRefresh) toast.success("Data berhasil diperbarui");
    } catch (error) {
      console.error("Error loading dashboard:", error);
      if (isRefresh) toast.error("Gagal memperbarui data");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Buat data aktivitas tracking untuk grafik garis
  const generateTrackingActivityData = () => {
    if (!recentTracking || recentTracking.length === 0) {
      return { labels: [], datasets: [] };
    }

    // Kelompokkan tracking per tanggal
    const activityByDate = {};
    recentTracking.forEach((item) => {
      const date = new Date(item.created_at).toLocaleDateString("id-ID", {
        month: "short",
        day: "numeric",
      });
      activityByDate[date] = (activityByDate[date] || 0) + 1;
    });

    const dates = Object.keys(activityByDate).reverse();
    const counts = dates.map((date) => activityByDate[date]);

    return {
      labels: dates,
      datasets: [
        {
          label: "Aktivitas Tracking",
          data: counts,
          borderColor: "rgba(59, 130, 246, 1)",
          backgroundColor: "rgba(59, 130, 246, 0.1)",
          borderWidth: 2,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: "rgba(59, 130, 246, 1)",
          pointBorderColor: "#fff",
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        },
      ],
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-700 border-t-blue-500"></div>
          <p className="text-gray-400 font-medium">Memuat dashboard...</p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
        <p className="text-gray-400 text-lg">Gagal memuat statistik</p>
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

  const damageTypeColors = {
    Lubang: {
      bg: "rgba(59, 130, 246, 0.8)",
      border: "rgba(59, 130, 246, 1)",
      light: "blue",
    },
    "Retak-Buaya": {
      bg: "rgba(239, 68, 68, 0.8)",
      border: "rgba(239, 68, 68, 1)",
      light: "red",
    },
    "Retak-Memanjang": {
      bg: "rgba(234, 179, 8, 0.8)",
      border: "rgba(234, 179, 8, 1)",
      light: "yellow",
    },
    "Retak-Melintang": {
      bg: "rgba(34, 197, 94, 0.8)",
      border: "rgba(34, 197, 94, 1)",
      light: "green",
    },
  };

  const safeByType = stats.by_type || [];
  const safeBySeverity = stats.by_severity || [];
  const safeByStatus = stats.by_status || [];

  const damageTypeData = {
    labels: safeByType.map((item) => item.damage_type),
    datasets: [
      {
        label: "Jumlah Kerusakan",
        data: safeByType.map((item) => item.count),
        backgroundColor: safeByType.map(
          (item) =>
            damageTypeColors[item.damage_type]?.bg ||
            "rgba(156, 163, 175, 0.8)",
        ),
        borderColor: safeByType.map(
          (item) =>
            damageTypeColors[item.damage_type]?.border ||
            "rgba(156, 163, 175, 1)",
        ),
        borderWidth: 2,
      },
    ],
  };

  const severityData = {
    labels: safeBySeverity.map((item) => item.severity.toUpperCase()),
    datasets: [
      {
        label: "Jumlah",
        data: safeBySeverity.map((item) => item.count),
        backgroundColor: [
          "rgba(39, 174, 96, 0.8)",
          "rgba(243, 156, 18, 0.8)",
          "rgba(231, 76, 60, 0.8)",
        ],
        borderColor: [
          "rgba(39, 174, 96, 1)",
          "rgba(243, 156, 18, 1)",
          "rgba(231, 76, 60, 1)",
        ],
        borderWidth: 2,
      },
    ],
  };

  const severityLineData = {
    labels: safeBySeverity.map((item) => item.severity.toUpperCase()),
    datasets: [
      {
        label: "Jumlah",
        data: safeBySeverity.map((item) => item.count),
        borderColor: "rgba(243, 156, 18, 1)",
        backgroundColor: "rgba(243, 156, 18, 0.1)",
        borderWidth: 3,
        fill: true,
        tension: 0.4,
        pointBackgroundColor: [
          "rgba(39, 174, 96, 1)",
          "rgba(243, 156, 18, 1)",
          "rgba(231, 76, 60, 1)",
        ],
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 7,
        pointHoverRadius: 10,
      },
    ],
  };

  const severityRadarData = {
    labels: safeBySeverity.map((item) => item.severity.toUpperCase()),
    datasets: [
      {
        label: "Jumlah",
        data: safeBySeverity.map((item) => item.count),
        backgroundColor: "rgba(243, 156, 18, 0.2)",
        borderColor: "rgba(243, 156, 18, 1)",
        borderWidth: 2,
        pointBackgroundColor: [
          "rgba(39, 174, 96, 1)",
          "rgba(243, 156, 18, 1)",
          "rgba(231, 76, 60, 1)",
        ],
        pointBorderColor: "#fff",
        pointBorderWidth: 2,
        pointRadius: 6,
      },
    ],
  };

  const pendingCount =
    safeByStatus.find((s) => s.status === "pending")?.count || 0;
  const verifiedCount =
    safeByStatus.find((s) => s.status === "verified")?.count || 0;
  const waitingValidationCount =
    safeByStatus.find((s) => s.status === "waiting_validation")?.count || 0;
  const repairedCount =
    safeByStatus.find((s) => s.status === "repaired")?.count || 0;

  const statusData = {
    labels: [
      pendingCount > 0 ? "Belum Diverifikasi" : null,
      verifiedCount > 0 ? "Terverifikasi" : null,
      waitingValidationCount > 0 ? "Menunggu Validasi" : null,
      repairedCount > 0 ? "Diperbaiki" : null,
    ].filter(Boolean),
    datasets: [
      {
        label: "Jumlah",
        data: [pendingCount, verifiedCount, waitingValidationCount, repairedCount].filter(
          (v) => v > 0,
        ),
        backgroundColor: [
          "rgba(231, 76, 60, 0.8)",
          "rgba(243, 156, 18, 0.8)",
          "rgba(249, 115, 22, 0.8)",
          "rgba(39, 174, 96, 0.8)",
        ],
        borderColor: [
          "rgba(231, 76, 60, 1)",
          "rgba(243, 156, 18, 1)",
          "rgba(249, 115, 22, 1)",
          "rgba(39, 174, 96, 1)",
        ],
        borderWidth: 2,
        borderRadius: 6,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
    scales: {
      y: {
        ticks: { color: isDark ? "#999" : "#6b7280" },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
        beginAtZero: true,
      },
      x: {
        ticks: { color: isDark ? "#999" : "#6b7280" },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
      },
    },
  };

  const pieOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
  };

  const lineOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
    scales: {
      y: {
        ticks: {
          color: isDark ? "#999" : "#6b7280",
          stepSize: 1,
        },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
        beginAtZero: true,
      },
      x: {
        ticks: { color: isDark ? "#999" : "#6b7280" },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
      },
    },
  };

  const radarOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          color: isDark ? "#eee" : "#374151",
          font: { size: 13, weight: "500" },
          padding: 15,
          usePointStyle: true,
        },
      },
    },
    scales: {
      r: {
        ticks: {
          color: isDark ? "#999" : "#6b7280",
          backdropColor: "transparent",
          stepSize: 1,
        },
        grid: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        angleLines: { color: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)" },
        pointLabels: {
          color: isDark ? "#ccc" : "#374151",
          font: { size: 13, weight: "600" },
        },
        beginAtZero: true,
      },
    },
  };

  const hBarOptions = {
    indexAxis: "y",
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        callbacks: {
          label: (ctx) => ` ${ctx.parsed.x} kerusakan`,
        },
      },
    },
    scales: {
      x: {
        ticks: {
          color: isDark ? "#999" : "#6b7280",
          stepSize: 1,
        },
        grid: { color: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", drawBorder: false },
        beginAtZero: true,
      },
      y: {
        ticks: { color: isDark ? "#ddd" : "#374151", font: { size: 14, weight: "600" } },
        grid: { display: false },
      },
    },
  };

  // Get most common damage type - safe guard untuk array kosong
  const mostCommonDamage =
    safeByType.length > 0
      ? safeByType.reduce((a, b) => (a.count > b.count ? a : b))
      : null;

  return (
    <div className="space-y-8 pb-8">
          {/* Bagian Header */}
          <div className="space-y-2">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className={`text-4xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                  Ringkasan Monitoring
                </h1>
                <p className={`text-sm mt-1 flex items-center gap-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <Calendar size={16} />
                  {dateStr} • {timeStr} - Data real-time
                </p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  title="Refresh data sekarang"
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition disabled:opacity-50 ${
                    isDark
                      ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                      : 'bg-white border border-gray-200 text-gray-500 hover:text-gray-800 hover:border-gray-400'
                  }`}
                >
                  <RefreshCw size={14} className={refreshing ? "animate-spin" : ""} />
                  <span className="hidden sm:inline">{refreshing ? "Memuat..." : "Refresh"}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Kartu Statistik */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              icon={ShieldAlert}
              label="Total Kerusakan"
              value={stats.total}
              color="red"
              onClick={() => navigate("/admin/kerusakan?tab=all")}
            />
            <StatCard
              icon={Activity}
              label="Sesi Tracking"
              value={recentTracking.length}
              color="green"
              onClick={() => navigate("/admin/tracking")}
            />
            <StatCard
              icon={Hourglass}
              label="Belum Diverifikasi"
              value={pendingCount}
              color="yellow"
              onClick={() => navigate("/admin/kerusakan?tab=pending")}
            />
            <StatCard
              icon={Wrench}
              label="Sudah Diperbaiki"
              value={repairedCount}
              color="blue"
              onClick={() => navigate("/admin/kerusakan?tab=repaired")}
            />
          </div>

          {/* Bagian Grafik */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Grafik Jenis Kerusakan */}
            <div className={`rounded-2xl p-8 border transition ${
              isDark
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Grafik Jenis Kerusakan
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {stats.by_type.length} jenis kerusakan
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-lg">
                  <BarChart2 size={20} className="text-blue-400" />
                </div>
              </div>
              <div className="flex justify-center mb-4">
                <ChartSwitcher
                  active={chartTypeDamage}
                  onChange={setChartTypeDamage}
                  options={[
                    { value: "doughnut", label: "Donat" },
                    { value: "bar", label: "Batang" },
                  ]}
                />
              </div>
              <div className="h-72">
                {chartTypeDamage === "doughnut" && (
                  <Doughnut data={damageTypeData} options={pieOptions} />
                )}
                {chartTypeDamage === "bar" && (
                  <Bar data={damageTypeData} options={chartOptions} />
                )}
              </div>
            </div>

            {/* Riwayat Tracking Terbaru */}
            <div className={`rounded-2xl p-8 border transition lg:col-span-2 ${
              isDark
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Riwayat Tracking Terbaru
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {recentTracking.length} tracking terakhir
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-lg">
                  <Footprints size={20} className="text-purple-400" />
                </div>
              </div>

              {recentTracking.length === 0 ? (
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
                </div>
              ) : (
                <div className="space-y-3">
                  {recentTracking.slice(0, 5).map((session) => (
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
                              {session.officer_name &&
                                `Petugas: ${session.officer_name}`}
                              {session.started_at &&
                                ` • Dimulai: ${new Date(session.started_at).toLocaleTimeString("id-ID")}`}
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

              {recentTracking.length > 5 && (
                <div className="mt-6 pt-6 border-t border-gray-700">
                  <button
                    onClick={() => navigate("/admin/tracking")}
                    className="w-full py-3 px-4 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 hover:text-blue-300 rounded-lg transition border border-blue-600/30 hover:border-blue-600/50 font-medium text-sm"
                  >
                    Lihat Semua Riwayat
                  </button>
                </div>
              )}
            </div>

            {/* Grafik Keparahan */}
            <div className={`rounded-2xl p-8 border transition lg:col-span-3 ${
              isDark
                ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600'
                : 'bg-white border-gray-200 hover:border-gray-300'
            }`}>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Tingkat Keparahan
                  </h3>
                  <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Distribusi severity kerusakan jalan
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <ChartSwitcher
                    active={chartTypeSeverity}
                    onChange={setChartTypeSeverity}
                    options={[
                      { value: "bar", label: "Batang" },
                      { value: "line", label: "Garis" },
                      { value: "radar", label: "Radar" },
                    ]}
                  />
                  <div className="p-3 bg-orange-500/20 rounded-lg">
                    <AlertCircle size={20} className="text-orange-400" />
                  </div>
                </div>
              </div>
              <div className="h-72">
                {chartTypeSeverity === "bar" && (
                  <Bar data={severityData} options={chartOptions} />
                )}
                {chartTypeSeverity === "line" && (
                  <Line data={severityLineData} options={lineOptions} />
                )}
                {chartTypeSeverity === "radar" && (
                  <Radar data={severityRadarData} options={radarOptions} />
                )}
              </div>
            </div>
            </div>

            {/* Baris 3: Aktivitas Tracking + Grafik Status */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Grafik Garis Aktivitas Tracking */}
              <div className={`rounded-2xl p-8 border transition lg:col-span-2 ${
                isDark
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Aktivitas Tracking
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Tren aktivitas patroli dan pemantauan terbaru
                    </p>
                  </div>
                  <div className="p-3 bg-purple-500/20 rounded-lg">
                    <Activity size={20} className="text-purple-400" />
                  </div>
                </div>
                <div className="h-72">
                  {recentTracking.length > 0 ? (
                    <Line
                      data={generateTrackingActivityData()}
                      options={lineOptions}
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-gray-500">Belum ada data tracking</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Grafik Batang Horizontal Status */}
              <div className={`rounded-2xl p-8 border transition ${
                isDark
                  ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-gray-700 hover:border-gray-600'
                  : 'bg-white border-gray-200 hover:border-gray-300'
              }`}>
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                      Status Kerusakan
                    </h3>
                    <p className={`text-sm mt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                      Distribusi status
                    </p>
                  </div>
                  <div className="p-3 bg-cyan-500/20 rounded-lg">
                    <PieChartIcon size={20} className="text-cyan-400" />
                  </div>
                </div>
                <div className="h-72">
                  <Bar data={statusData} options={hBarOptions} />
                </div>
              </div>
            </div>

          {/* Kartu Status */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div
              onClick={() => navigate("/admin/kerusakan?tab=pending")}
              className="bg-gradient-to-br from-red-900/30 to-red-800/20 rounded-2xl p-6 border border-red-700/30 hover:border-red-600/50 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-red-400 text-sm font-medium">
                    Belum Diverifikasi
                  </p>
                  <p className="text-3xl font-bold text-red-300 mt-2">
                    {pendingCount}
                  </p>
                </div>
                <div className="p-3 bg-red-500/20 rounded-lg">
                  <Clock size={24} className="text-red-400" />
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/kerusakan?tab=verified")}
              className="bg-gradient-to-br from-yellow-900/30 to-yellow-800/20 rounded-2xl p-6 border border-yellow-700/30 hover:border-yellow-600/50 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-400 text-sm font-medium">
                    Terverifikasi
                  </p>
                  <p className="text-3xl font-bold text-yellow-300 mt-2">
                    {verifiedCount}
                  </p>
                </div>
                <div className="p-3 bg-yellow-500/20 rounded-lg">
                  <AlertCircle size={24} className="text-yellow-400" />
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/kerusakan?tab=waiting_validation")}
              className={`bg-gradient-to-br from-orange-900/30 to-orange-800/20 rounded-2xl p-6 border transition cursor-pointer hover:scale-[1.02] active:scale-[0.98] ${
                waitingValidationCount > 0
                  ? "border-orange-500/60 shadow-lg shadow-orange-900/20 animate-pulse"
                  : "border-orange-700/30 hover:border-orange-600/50"
              }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-orange-400 text-sm font-medium">
                    Menunggu Validasi
                  </p>
                  <p className="text-3xl font-bold text-orange-300 mt-2">
                    {waitingValidationCount}
                  </p>
                  {waitingValidationCount > 0 && (
                    <p className="text-orange-500 text-xs mt-1 font-semibold">⚠ Perlu persetujuan</p>
                  )}
                </div>
                <div className="p-3 bg-orange-500/20 rounded-lg">
                  <ShieldCheck size={24} className="text-orange-400" />
                </div>
              </div>
            </div>

            <div
              onClick={() => navigate("/admin/kerusakan?tab=repaired")}
              className="bg-gradient-to-br from-green-900/30 to-green-800/20 rounded-2xl p-6 border border-green-700/30 hover:border-green-600/50 transition cursor-pointer hover:scale-[1.02] active:scale-[0.98]"
            >
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-400 text-sm font-medium">
                    Sudah Diperbaiki
                  </p>
                  <p className="text-3xl font-bold text-green-300 mt-2">
                    {repairedCount}
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-lg">
                  <CheckCircle size={24} className="text-green-400" />
                </div>
              </div>
            </div>
          </div>
    </div>
  );
};

export default AdminDashboard;
