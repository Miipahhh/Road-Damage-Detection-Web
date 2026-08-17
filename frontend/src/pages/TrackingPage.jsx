import React, { useRef, useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { trackingService } from "../services/api";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import {
  Camera,
  StopCircle,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
  Navigation,
  Map,
  PlayCircle,
  Activity,
  Crosshair,
  CameraOff,
  ChevronRight,
  Clock,
  Ruler,
  AlertTriangle,
  Maximize2,
  Minimize2,
  RotateCw,
  Wifi,
  X,
} from "lucide-react";
import MapPickerModal from "../components/MapPickerModal";

const DETECTION_INTERVAL_MS = 800;
const SEND_WIDTH = 640; // dibalikin ke nilai asli — hasil test menunjukkan ukuran 512-640 tidak berpengaruh signifikan ke speed, jadi pertahankan kualitas terbaik
const JPEG_QUALITY = 0.7;
const GPS_INTERVAL_MS = 3000;
const GPS_MIN_DISTANCE_M = 5;

const getDistanceMeters = (lat1, lng1, lat2, lng2) => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

const CLASS_COLORS = {
  Lubang: "#3b82f6",
  "Retak-Buaya": "#ef4444",
  "Retak-Memanjang": "#eab308",
  "Retak-Melintang": "#22c55e",
};

const getColorForClass = (className) => CLASS_COLORS[className] || "#888";

const petugasIcon = L.divIcon({
  className: "",
  html: `<div style="
    width:22px;height:22px;
    background:#3b82f6;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 0 0 3px rgba(59,130,246,0.4), 0 2px 8px rgba(0,0,0,0.4);
  "></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

const FlyToLocation = ({ location, hasFlewOnce }) => {
  const map = useMap();
  useEffect(() => {
    if (location.lat && location.lng && !hasFlewOnce.current) {
      map.flyTo([location.lat, location.lng], 17, { duration: 1.5 });
      hasFlewOnce.current = true;
    }
  }, [location.lat, location.lng]);
  return null;
};

// Batas wilayah Kubu Raya — garis kuning putus-putus
const KubuRayaBoundaryLayer = () => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    fetch("/kuburaya-boundary.json")
      .then((res) => res.json())
      .then((data) => {
        if (layerRef.current && map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
        const layer = L.geoJSON(data, {
          style: () => ({
            color: "#facc15",
            weight: 2.5,
            opacity: 0.85,
            fillColor: "#facc15",
            fillOpacity: 0.04,
            dashArray: "10, 6",
          }),
        });
        layer.addTo(map);
        layerRef.current = layer;
      })
      .catch(() => {});

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  return null;
};

/* ─────────────── Komponen Kecil ─────────────── */

const SectionCard = ({ children, className = "", isDark = true }) => (
  <div
    className={`rounded-xl overflow-hidden ${className}`}
    style={{
      border: isDark ? '1px solid rgba(55,65,81,0.6)' : '1px solid rgba(209,213,219,0.8)',
      background: isDark ? '#1a2035' : '#ffffff',
    }}
  >
    {children}
  </div>
);

const CardHeader = ({
  icon: Icon,
  iconColor = "text-red-400",
  title,
  right,
  isDark = true,
}) => (
  <div
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '12px 16px',
      borderBottom: isDark ? '1px solid rgba(55,65,81,0.6)' : '1px solid rgba(229,231,235,0.8)',
      background: isDark ? '#1d2540' : '#f8fafc',
    }}
  >
    <div className="flex items-center gap-2 text-sm font-semibold" style={{ color: isDark ? '#e5e7eb' : '#1e293b' }}>
      <Icon className={`w-4 h-4 ${iconColor}`} />
      {title}
    </div>
    {right}
  </div>
);

const GPS_ACCURACY_STYLES = {
  searching: {
    dark: 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400',
    light: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    dot: { dark: 'bg-yellow-400', light: 'bg-yellow-600' },
  },
  good: {
    dark: 'bg-green-900/30 border-green-700/50 text-green-400',
    light: 'bg-green-100 border-green-300 text-green-700',
    dot: { dark: 'bg-green-400', light: 'bg-green-600' },
  },
  medium: {
    dark: 'bg-yellow-900/30 border-yellow-700/50 text-yellow-400',
    light: 'bg-yellow-100 border-yellow-300 text-yellow-700',
    dot: { dark: 'bg-yellow-400', light: 'bg-yellow-600' },
  },
  poor: {
    dark: 'bg-red-900/30 border-red-700/50 text-red-400',
    light: 'bg-red-100 border-red-300 text-red-700',
    dot: { dark: 'bg-red-400', light: 'bg-red-600' },
  },
};

const gpsAccuracyTier = (gpsReady, gpsAccuracy) => {
  if (!gpsReady) return 'searching';
  if (gpsAccuracy <= 10) return 'good';
  if (gpsAccuracy <= 30) return 'medium';
  return 'poor';
};

const GpsBadge = ({ gpsReady, gpsAccuracy, isDark = true }) => {
  const s = GPS_ACCURACY_STYLES[gpsAccuracyTier(gpsReady, gpsAccuracy)];
  return (
    <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border font-medium ${isDark ? s.dark : s.light}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${isDark ? s.dot.dark : s.dot.light} animate-pulse`} />
      {gpsReady
        ? `GPS Aktif${gpsAccuracy ? ` ±${gpsAccuracy}m` : ""}`
        : "Mencari GPS..."}
    </div>
  );
};

const StatBox = ({ label, value, unit, isDark = true }) => (
  <div
    className="rounded-lg p-3"
    style={{ background: isDark ? '#0f1520' : '#f1f5f9' }}
  >
    <p style={{ color: isDark ? '#6b7280' : '#64748b' }} className="text-[10px] uppercase tracking-wider mb-1">
      {label}
    </p>
    <p style={{ color: isDark ? '#f3f4f6' : '#1e293b' }} className="text-lg font-semibold leading-none">
      {value} <span style={{ color: isDark ? '#9ca3af' : '#64748b' }} className="text-xs font-normal">{unit}</span>
    </p>
  </div>
);

const DamageRow = ({ damage, index }) => {
  const pct = (damage.confidence * 100).toFixed(1);
  const color = pct >= 70 ? "#ef4444" : pct >= 40 ? "#f59e0b" : "#22c55e";
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-800/60 last:border-0 hover:bg-white/[0.02] transition-colors">
      <div className="flex items-center gap-2.5">
        <div
          className="w-2 h-2 rounded-sm flex-shrink-0"
          style={{
            background: getColorForClass(
              damage.damage_type || damage.class_name,
            ),
          }}
        />
        <div>
          <p
            className="text-[13px] font-medium"
            style={{
              color: getColorForClass(damage.damage_type || damage.class_name),
            }}
          >
            {damage.damage_type || damage.class_name}
          </p>
          {(damage.latitude || damage.lat) && (
            <p className="text-[10px] text-gray-500 mt-0.5 font-mono">
              {(damage.latitude || damage.lat)?.toFixed(6)},{" "}
              {(damage.longitude || damage.lng)?.toFixed(6)}
            </p>
          )}
        </div>
      </div>
      <span className="text-xs font-semibold" style={{ color }}>
        {pct}%
      </span>
    </div>
  );
};

/* ─────────────── Overlay Kamera Fullscreen ─────────────── */
const CameraLandscapeOverlay = ({
  streamRef,
  isCameraReady,
  detectionResults,
  fps,
  gpsReady,
  gpsAccuracy,
  savedDamages,
  onClose,
}) => {
  const ownVideoRef = useRef(null);
  const overlayCanvasRef = useRef(null);
  const rafRef = useRef(null);

  // Fullscreen + kunci scroll body
  useEffect(() => {
    // Coba minta fullscreen (sembunyikan browser chrome)
    const el = document.documentElement;
    try {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
    } catch (e) {}

    document.body.style.overflow = "hidden";
    document.body.style.position = "fixed";
    document.body.style.width = "100%";

    return () => {
      try {
        if (document.fullscreenElement && document.exitFullscreen)
          document.exitFullscreen();
        else if (
          document.webkitFullscreenElement &&
          document.webkitExitFullscreen
        )
          document.webkitExitFullscreen();
      } catch (e) {}
      document.body.style.overflow = "";
      document.body.style.position = "";
      document.body.style.width = "";
    };
  }, []);

  // Pasang stream ke video element sendiri
  useEffect(() => {
    const video = ownVideoRef.current;
    if (!video || !streamRef.current) return;
    video.srcObject = streamRef.current;
    video.play().catch(() => {});
    return () => {
      if (video) video.srcObject = null;
    };
  }, [streamRef]);

  // Gambar bounding box — hitung letterbox video dulu
  useEffect(() => {
    const draw = () => {
      const video = ownVideoRef.current;
      const canvas = overlayCanvasRef.current;
      if (!canvas || !video || !video.videoWidth) {
        rafRef.current = requestAnimationFrame(draw);
        return;
      }
      const cw = canvas.clientWidth || video.clientWidth || video.videoWidth;
      const ch = canvas.clientHeight || video.clientHeight || video.videoHeight;
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, cw, ch);

      if (detectionResults?.length > 0) {
        // objectFit: cover — video diisi penuh, di-crop bagian tepi
        const videoAR = video.videoWidth / video.videoHeight;
        const containerAR = cw / ch;
        let rendW,
          rendH,
          offX = 0,
          offY = 0;
        if (videoAR > containerAR) {
          // Video lebih lebar → fit height, crop kiri-kanan
          rendH = ch;
          rendW = ch * videoAR;
          offX = (cw - rendW) / 2; // negatif = geser ke kiri (cropped)
        } else {
          // Video lebih tinggi → fit width, crop atas-bawah
          rendW = cw;
          rendH = cw / videoAR;
          offY = (ch - rendH) / 2; // negatif = geser ke atas (cropped)
        }
        const sendH = SEND_WIDTH * (video.videoHeight / video.videoWidth);
        const sx = rendW / SEND_WIDTH;
        const sy = rendH / sendH;

        detectionResults.forEach((det) => {
          const { bbox, class_name, confidence } = det;
          if (!bbox) return;
          const x = offX + bbox.x1 * sx;
          const y = offY + bbox.y1 * sy;
          const w = (bbox.x2 - bbox.x1) * sx;
          const h = (bbox.y2 - bbox.y1) * sy;
          const color = getColorForClass(class_name);

          ctx.shadowColor = color;
          ctx.shadowBlur = 14;
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x, y, w, h);
          ctx.shadowBlur = 0;

          const cs = Math.min(w, h, 22);
          ctx.lineWidth = 5;
          [
            [x, y],
            [x + w, y],
            [x, y + h],
            [x + w, y + h],
          ].forEach(([cx, cy]) => {
            const dx = cx === x ? 1 : -1;
            const dy = cy === y ? 1 : -1;
            ctx.beginPath();
            ctx.moveTo(cx + dx * cs, cy);
            ctx.lineTo(cx, cy);
            ctx.lineTo(cx, cy + dy * cs);
            ctx.stroke();
          });

          const label = `${class_name}  ${(confidence * 100).toFixed(0)}%`;
          ctx.font = "bold 14px Arial";
          const tw = ctx.measureText(label).width;
          const lx = x;
          const ly = y > 30 ? y - 28 : y + h + 4;
          ctx.fillStyle = color + "cc";
          ctx.beginPath();
          ctx.roundRect(lx, ly, tw + 14, 24, 5);
          ctx.fill();
          ctx.fillStyle = "#fff";
          ctx.fillText(label, lx + 7, ly + 17);
        });
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    rafRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafRef.current);
  }, [detectionResults]);

  // Render via Portal langsung ke document.body
  // → bypass ancestor transforms/overflow yang bisa bocorkan halaman lama
  return createPortal(
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 2147483647, // z-index maksimum
        background: "#000",
        display: "flex",
        flexDirection: "column",
        // Extend ke luar safe area agar benar-benar menutup semua
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      {/* Video fullscreen */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        <video
          ref={ownVideoRef}
          autoPlay
          playsInline
          muted
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            background: "#000",
          }}
        />
        <canvas
          ref={overlayCanvasRef}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            pointerEvents: "none",
          }}
        />

        {/* Tombol tutup */}
        <button
          onClick={onClose}
          style={{
            position: "absolute",
            top: "max(12px, env(safe-area-inset-top, 12px))",
            right: 12,
            background: "rgba(0,0,0,0.75)",
            border: "1px solid rgba(255,255,255,0.25)",
            borderRadius: "50%",
            width: 44,
            height: 44,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            zIndex: 10,
          }}
        >
          <X style={{ width: 20, height: 20, color: "#fff" }} />
        </button>

        {/* Badge GPS + FPS */}
        <div
          style={{
            position: "absolute",
            top: "max(12px, env(safe-area-inset-top, 12px))",
            left: 12,
            display: "flex",
            gap: 6,
            zIndex: 10,
          }}
        >
          <div
            style={{
              background: "rgba(0,0,0,0.72)",
              borderRadius: 14,
              padding: "5px 11px",
              border: `1px solid ${
                !gpsReady ? "rgba(234,179,8,0.5)" : gpsAccuracy <= 10 ? "rgba(74,222,128,0.5)" : gpsAccuracy <= 30 ? "rgba(251,191,36,0.5)" : "rgba(248,113,113,0.5)"
              }`,
              display: "flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: !gpsReady ? "#eab308" : gpsAccuracy <= 10 ? "#4ade80" : gpsAccuracy <= 30 ? "#fbbf24" : "#f87171",
                flexShrink: 0,
              }}
            />
            <span
              style={{
                color: !gpsReady ? "#eab308" : gpsAccuracy <= 10 ? "#4ade80" : gpsAccuracy <= 30 ? "#fbbf24" : "#f87171",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {gpsReady ? `GPS ±${gpsAccuracy ?? "?"}m` : "GPS..."}
            </span>
          </div>
          <div
            style={{
              background: "rgba(0,0,0,0.65)",
              borderRadius: 14,
              padding: "5px 11px",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <span
              style={{
                color: fps > 2 ? "#22c55e" : "#eab308",
                fontSize: 12,
                fontWeight: 600,
              }}
            >
              {fps} FPS
            </span>
          </div>
          {savedDamages.length > 0 && (
            <div
              style={{
                background: "rgba(239,68,68,0.18)",
                borderRadius: 14,
                padding: "5px 11px",
                border: "1px solid rgba(239,68,68,0.4)",
              }}
            >
              <span style={{ color: "#ef4444", fontSize: 12, fontWeight: 600 }}>
                💾 {savedDamages.length}
              </span>
            </div>
          )}
        </div>

        {/* Chip deteksi di bawah */}
        {detectionResults.length > 0 && (
          <div
            style={{
              position: "absolute",
              bottom: "max(16px, env(safe-area-inset-bottom, 16px))",
              left: 12,
              right: 12,
              display: "flex",
              flexWrap: "wrap",
              gap: 5,
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            {detectionResults.map((d, i) => {
              const color = getColorForClass(d.class_name);
              return (
                <span
                  key={i}
                  style={{
                    background: color + "22",
                    color,
                    border: `1px solid ${color}66`,
                    borderRadius: 20,
                    padding: "4px 12px",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                >
                  {d.class_name} · {(d.confidence * 100).toFixed(0)}%
                  {d.area_cm2 ? ` · ${d.area_cm2.toFixed(0)}cm²` : ""}
                </span>
              );
            })}
          </div>
        )}
      </div>
    </div>,
    document.body, // ← render langsung ke body, bukan di dalam React tree
  );
};

/* ─────────────── Halaman Utama ─────────────── */

const TrackingPage = () => {
  const { isDark } = useTheme();
  const toast = useToast();
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const sendCanvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const gpsIntervalRef = useRef(null);
  const detectingRef = useRef(false);
  const inFlightRef = useRef(false);
  const lastDetectionsRef = useRef([]);
  const overlayIntervalRef = useRef(null);
  const locationRef = useRef({ lat: null, lng: null });
  const hasFlewOnce = useRef(false);
  const bgGpsWatchRef = useRef(null);
  // Buffer 8 posisi GPS terakhir untuk averaging — makin banyak sampel = makin stabil
  const gpsBufferRef = useRef([]); // [{lat, lng, accuracy, ts}]

  // Hitung posisi rata-rata GPS berbobot (accuracy lebih kecil = bobot lebih besar)
  const getAveragedLocation = () => {
    const buf = gpsBufferRef.current;
    if (buf.length === 0) return locationRef.current;
    if (buf.length === 1) return { lat: buf[0].lat, lng: buf[0].lng };
    // Bobot = 1 / accuracy (lebih akurat = bobot besar)
    const totalW = buf.reduce((s, p) => s + 1 / p.accuracy, 0);
    const avgLat =
      buf.reduce((s, p) => s + p.lat * (1 / p.accuracy), 0) / totalW;
    const avgLng =
      buf.reduce((s, p) => s + p.lng * (1 / p.accuracy), 0) / totalW;
    return { lat: avgLat, lng: avgLng };
  };

  const [session, setSession] = useState(null);
  const [isTracking, setIsTracking] = useState(false);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [location, setLocation] = useState({ lat: null, lng: null });
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsReady, setGpsReady] = useState(false);
  const [detectionResults, setDetectionResults] = useState([]);
  const [totalDetections, setTotalDetections] = useState(0);
  const [fps, setFps] = useState(0);
  const [error, setError] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [savedDamages, setSavedDamages] = useState([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState({
    camera: "unknown",
    gps: "unknown",
  });
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [pendingRoute, setPendingRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [sessionStart, setSessionStart] = useState(null);
  const [isLandscapeOpen, setIsLandscapeOpen] = useState(false);
  const [showRotateHint, setShowRotateHint] = useState(false);

  useEffect(() => {
    checkActiveSession();
    startBackgroundGPS();
    // Warm-up server AI YOLO sedini mungkin (saat halaman baru dibuka,
    // jauh sebelum user selesai pilih rute & klik "Mulai Tracking").
    // Hugging Face Space gratisan "tidur" saat idle dan butuh puluhan
    // detik untuk bangun di request pertama — ping ini menyerap
    // cold-start itu di background, bukan saat deteksi live berjalan.
    fetch("/yolo/").catch(() => {});
    return () => {
      stopEverything();
      stopBackgroundGPS();
    };
  }, []);

  const startBackgroundGPS = () => {
    if (!navigator.geolocation) return;
    bgGpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setLocation(loc);
        setGpsAccuracy(Math.round(pos.coords.accuracy));
        locationRef.current = loc;
        setGpsReady(true);
      },
      (err) => console.warn("Background GPS error:", err.code),
      { enableHighAccuracy: true, timeout: 30000, maximumAge: 5000 },
    );
  };

  const stopBackgroundGPS = () => {
    if (bgGpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(bgGpsWatchRef.current);
      bgGpsWatchRef.current = null;
    }
  };

  const checkActiveSession = async () => {
    try {
      const data = await trackingService.getActiveSession();
      if (data.session) {
        setSession(data.session);
        setIsTracking(true);
        setSavedDamages(data.session.road_damages || []);
        if (data.session.start_point || data.session.ruas_jalan_name) {
          setRouteInfo({
            startPoint: data.session.start_point,
            endPoint: data.session.end_point,
            ruasJalanName: data.session.ruas_jalan_name,
          });
        }
        setSessionStart(new Date(data.session.created_at));
        setStatusMessage(
          "Sesi tracking aktif ditemukan. Kamera siap diaktifkan.",
        );
      }
    } catch (err) {
      console.error("Error checking active session:", err);
      // Biarkan silent — user belum perlu tahu jika tidak ada sesi aktif
    }
  };

  const checkPermissions = () => {
    setError(null);
    setShowMapPicker(true);
  };

  const handleRouteConfirmed = (routeData) => {
    setShowMapPicker(false);
    setPendingRoute(routeData);
    setRouteInfo(routeData);
    setShowPermissionModal(true);
  };

  const requestPermissionsAndStart = async () => {
    setShowPermissionModal(false);
    setError(null);
    setStatusMessage("Meminta izin kamera dan GPS...");

    try {
      const testStream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      testStream.getTracks().forEach((t) => t.stop());
      setPermissionStatus((prev) => ({ ...prev, camera: "granted" }));
    } catch (err) {
      setError(
        "Izin KAMERA ditolak. Buka pengaturan browser dan izinkan akses kamera untuk situs ini, lalu coba lagi.",
      );
      setPermissionStatus((prev) => ({ ...prev, camera: "denied" }));
      return;
    }

    try {
      await new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            setLocation(loc);
            locationRef.current = loc;
            resolve();
          },
          (err) => {
            if (err.code === 1) reject(new Error("PERMISSION_DENIED"));
            else {
              navigator.geolocation.getCurrentPosition(
                (pos) => {
                  const loc = {
                    lat: pos.coords.latitude,
                    lng: pos.coords.longitude,
                  };
                  setLocation(loc);
                  locationRef.current = loc;
                  resolve();
                },
                (lowAccErr) => reject(lowAccErr),
                {
                  enableHighAccuracy: false,
                  timeout: 30000,
                  maximumAge: 30000,
                },
              );
            }
          },
          { enableHighAccuracy: true, timeout: 30000, maximumAge: 0 },
        );
      });
      setPermissionStatus((prev) => ({ ...prev, gps: "granted" }));
    } catch (err) {
      const isDenied = err.message === "PERMISSION_DENIED" || err.code === 1;
      setError(
        isDenied
          ? 'Izin GPS/Lokasi ditolak.\n\nCara mengizinkan di iPhone:\n1. Buka Pengaturan → Privacy & Security → Location Services\n2. Cari Safari → pilih "While Using"\n3. Kembali ke browser dan coba lagi'
          : "GPS tidak bisa didapatkan. Pastikan Location Services aktif dan berada di luar ruangan.",
      );
      setPermissionStatus((prev) => ({
        ...prev,
        gps: isDenied ? "denied" : "unavailable",
      }));
      return;
    }

    await startTracking(pendingRoute);
  };

  const startTracking = async (routeData = null) => {
    setError(null);
    try {
      stopBackgroundGPS();
      const data = await trackingService.start(routeData);
      setSession(data.session);
      setIsTracking(true);
      setSessionStart(new Date());
      setStatusMessage("Sesi tracking dimulai. Mengaktifkan kamera...");

      await startCamera();

      if (locationRef.current.lat && locationRef.current.lng) {
        try {
          await trackingService.updateRoute(
            data.session.id,
            locationRef.current.lat,
            locationRef.current.lng,
          );
        } catch (e) {
          console.error("Failed to send initial location:", e);
        }
      }

      startGPSTracking(data.session.id);
      detectingRef.current = true;
      startDetectionLoop(data.session.id);
      startOverlayLoop();

      const ruasInfo = routeData?.ruasJalanName
        ? ` | Ruas: ${routeData.ruasJalanName}`
        : "";
      setStatusMessage(`Tracking aktif${ruasInfo}. Arahkan kamera ke jalan.`);
    } catch (err) {
      console.error("Error starting tracking:", err);
      const msg = err.response?.data?.message || "Gagal memulai tracking. Pastikan kamera dan GPS diizinkan.";
      setError(msg);
      toast.error(msg);
    }
  };

  const startCamera = async () => {
    const mediaStream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: "environment",
        width:     { ideal: 1920, min: 1280 },
        height:    { ideal: 1080, min: 720  },
        frameRate: { ideal: 30,   min: 24   },
      },
    });
    if (videoRef.current) {
      videoRef.current.srcObject = mediaStream;
      streamRef.current = mediaStream;
      setIsCameraReady(true);
    }
  };

  const startGPSTracking = (sessionId) => {
    if (!navigator.geolocation) return;
    const gpsOptions = {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0,
    };

    const handlePosition = async (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      // Filter posisi yang terlalu tidak akurat (>80m)
      if (accuracy > 80) return;

      // Tambah ke buffer GPS (simpan maks 8 posisi terbaru)
      const buf = gpsBufferRef.current;
      buf.push({ lat: latitude, lng: longitude, accuracy, ts: Date.now() });
      // Hanya simpan 8 posisi terakhir
      if (buf.length > 8) buf.shift();
      // Hapus posisi yang lebih dari 30 detik
      const now = Date.now();
      gpsBufferRef.current = buf.filter((p) => now - p.ts < 30000);

      const prev = locationRef.current;
      if (prev.lat && prev.lng) {
        const distance = getDistanceMeters(
          prev.lat,
          prev.lng,
          latitude,
          longitude,
        );
        if (distance < GPS_MIN_DISTANCE_M) {
          setLocation({ lat: latitude, lng: longitude });
          locationRef.current = { lat: latitude, lng: longitude };
          setGpsAccuracy(Math.round(accuracy));
          setGpsReady(true);
          return;
        }
      }
      const loc = { lat: latitude, lng: longitude };
      setLocation(loc);
      locationRef.current = loc;
      setGpsAccuracy(Math.round(accuracy));
      setGpsReady(accuracy <= 50);
      try {
        await trackingService.updateRoute(sessionId, latitude, longitude);
      } catch (e) {
        console.error("Failed to update route:", e);
      }
    };

    const watchId = navigator.geolocation.watchPosition(
      handlePosition,
      (err) => console.warn("GPS watch error:", err.code),
      gpsOptions,
    );
    gpsIntervalRef.current = watchId;

    const forceInterval = setInterval(() => {
      navigator.geolocation.getCurrentPosition(
        handlePosition,
        (err) => console.warn("GPS force error:", err.code),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 3000 },
      );
    }, GPS_INTERVAL_MS);
    gpsIntervalRef.forceInterval = forceInterval;
  };

  const startOverlayLoop = () => {
    const drawOverlay = () => {
      if (!detectingRef.current || !videoRef.current || !canvasRef.current)
        return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
      }
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      const scale = video.videoWidth / SEND_WIDTH;
      if (lastDetectionsRef.current.length > 0) {
        lastDetectionsRef.current.forEach((detection) => {
          const { bbox, class_name, confidence } = detection;
          if (!bbox) return;
          const x1 = bbox.x1 * scale;
          const y1 = bbox.y1 * scale;
          const x2 = bbox.x2 * scale;
          const y2 = bbox.y2 * scale;
          const color = getColorForClass(class_name);
          ctx.strokeStyle = color;
          ctx.lineWidth = 3;
          ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);
          const label = `${class_name} ${(confidence * 100).toFixed(1)}%`;
          ctx.font = "14px Arial";
          const textWidth = ctx.measureText(label).width;
          ctx.fillStyle = color;
          ctx.fillRect(x1, y1 - 22, textWidth + 8, 22);
          ctx.fillStyle = "#fff";
          ctx.fillText(label, x1 + 4, y1 - 6);
        });
      }
      overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
    };
    overlayIntervalRef.current = requestAnimationFrame(drawOverlay);
  };

  const startDetectionLoop = (sessionId) => {
    if (!sendCanvasRef.current)
      sendCanvasRef.current = document.createElement("canvas");
    const sendFrame = async () => {
      if (!detectingRef.current || !videoRef.current) return;
      // Cegah request numpuk kalau server AI lagi lambat (>DETECTION_INTERVAL_MS) —
      // tanpa ini, balasan bisa datang tidak berurutan dan delay makin parah lama-lama
      if (inFlightRef.current) return;
      const video = videoRef.current;
      if (video.videoWidth === 0) return;
      const sendCanvas = sendCanvasRef.current;
      const aspectRatio = video.videoHeight / video.videoWidth;
      sendCanvas.width = SEND_WIDTH;
      sendCanvas.height = Math.round(SEND_WIDTH * aspectRatio);
      const sendCtx = sendCanvas.getContext("2d");
      sendCtx.drawImage(video, 0, 0, SEND_WIDTH, sendCanvas.height);
      inFlightRef.current = true;
      try {
        const startTime = performance.now();
        const blob = await new Promise((resolve) =>
          sendCanvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY),
        );
        if (!blob) return;
        const formData = new FormData();
        formData.append("image", blob, "frame.jpg");
        formData.append("return_image", "false");
        formData.append("conf", "0.25");
        const response = await fetch("/yolo/detect", {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          console.warn(`Deteksi AI ditolak server (HTTP ${response.status}), frame ini dilewati`);
          return;
        }
        const data = await response.json();
        const detectionFps = Math.round(1000 / (performance.now() - startTime));
        setFps(detectionFps);
        if (data.success && data.total_detections > 0) {
          lastDetectionsRef.current = data.detections;
          setDetectionResults(data.detections);
          setTotalDetections((prev) => prev + data.total_detections);
          const best = data.detections.reduce(
            (b, d) => (d.confidence > b.confidence ? d : b),
            data.detections[0],
          );
          if (
            best.confidence > 0.5 &&
            locationRef.current.lat &&
            locationRef.current.lng
          ) {
            const saveCanvas = document.createElement("canvas");
            saveCanvas.width = video.videoWidth;
            saveCanvas.height = video.videoHeight;
            saveCanvas.getContext("2d").drawImage(video, 0, 0);
            await saveBestDetection(sessionId, saveCanvas, best);
          }
        } else {
          lastDetectionsRef.current = [];
          setDetectionResults([]);
        }
      } catch (err) {
        console.error("Detection error:", err);
      } finally {
        inFlightRef.current = false;
      }
    };
    intervalRef.current = setInterval(sendFrame, DETECTION_INTERVAL_MS);
    sendFrame();
  };

  const saveBestDetection = async (sessionId, canvas, detection) => {
    try {
      const imageBase64 = canvas.toDataURL("image/jpeg", 0.9);
      // Gunakan koordinat rata-rata berbobot dari buffer GPS (lebih akurat dari snapshot tunggal)
      const currentLoc = getAveragedLocation();
      if (!currentLoc.lat || !currentLoc.lng) {
        console.warn("GPS belum siap, skip save");
        return;
      }
      // Presisi 8 desimal (~1mm) — lebih akurat dari 7
      const lat = parseFloat(currentLoc.lat.toFixed(8));
      const lng = parseFloat(currentLoc.lng.toFixed(8));
      await trackingService.saveDamage(sessionId, {
        image: imageBase64,
        damage_type: detection.class_name,
        confidence: detection.confidence,
        latitude: lat,
        longitude: lng,
      });
      setSavedDamages((prev) => [
        ...prev,
        {
          damage_type: detection.class_name,
          confidence: detection.confidence,
          latitude: lat,
          longitude: lng,
          created_at: new Date().toISOString(),
        },
      ]);
      setStatusMessage(`Kerusakan "${detection.class_name}" tersimpan!`);
    } catch (err) {
      console.error("Error saving damage:", err);
      // Silent — jangan ganggu alur deteksi dengan toast, cukup log
    }
  };

  const stopTracking = async () => {
    try {
      detectingRef.current = false;
      stopEverything();
      if (session) {
        const result = await trackingService.stop(session.id);
        setStatusMessage(
          `Tracking selesai. ${result.total_damages} kerusakan terdeteksi.`,
        );
      }
      setSession(null);
      setIsTracking(false);
      setIsCameraReady(false);
      setDetectionResults([]);
      setRouteInfo(null);
      setSessionStart(null);
      hasFlewOnce.current = false;
      startBackgroundGPS();
    } catch (err) {
      console.error("Error stopping tracking:", err);
      const msg = "Gagal menghentikan tracking. Coba lagi.";
      setError(msg);
      toast.error(msg);
    }
  };

  const stopEverything = () => {
    detectingRef.current = false;
    lastDetectionsRef.current = [];
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (gpsIntervalRef.current !== null) {
      navigator.geolocation.clearWatch(gpsIntervalRef.current);
      gpsIntervalRef.current = null;
    }
    if (gpsIntervalRef.forceInterval) {
      clearInterval(gpsIntervalRef.forceInterval);
      gpsIntervalRef.forceInterval = null;
    }
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (overlayIntervalRef.current) {
      cancelAnimationFrame(overlayIntervalRef.current);
      overlayIntervalRef.current = null;
    }
  };

  /* ─── Nilai turunan ─── */
  const allDamages = savedDamages;
  const sessionDuration = sessionStart
    ? Math.floor((Date.now() - sessionStart.getTime()) / 60000)
    : null;

  /* ─── Tampilan ─── */
  return (
    <div className="space-y-4">
      {/* Header halaman */}
      <div>
        <h1 className="text-2xl font-bold" style={{ color: isDark ? '#ffffff' : '#0f172a' }}>
          Tracking Kerusakan Jalan
        </h1>
        <p className="text-sm mt-1" style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
          Tentukan rute inspeksi, lalu pantau kondisi jalan secara real-time
          menggunakan kamera dan GPS
        </p>
      </div>

      {/* Banner status & error */}
      {error && (
        <div className="rounded-xl border border-red-600/50 bg-red-600/10 p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300 text-sm whitespace-pre-line">{error}</p>
        </div>
      )}

      {statusMessage && !error && (
        <div className="rounded-xl border border-blue-600/40 bg-blue-600/10 p-3 flex items-center gap-3">
          <CheckCircle className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <p className="text-blue-300 text-sm">{statusMessage}</p>
        </div>
      )}

      {/* ── Layout dua kolom ── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* ── KOLOM KIRI ── */}
        <div className="flex flex-col gap-4">
          {/* Card pilih rute */}
          <SectionCard isDark={isDark}>
            <CardHeader
              icon={Map}
              iconColor="text-red-400"
              title="Rute Inspeksi"
              isDark={isDark}
              right={
                routeInfo &&
                !isTracking && (
                  <button
                    onClick={() => setShowMapPicker(true)}
                    className="text-xs text-gray-400 hover:text-gray-200 flex items-center gap-1 transition-colors"
                  >
                    Ganti Rute
                  </button>
                )
              }
            />
            <div className="p-4 space-y-3">
              {/* Info rute atau placeholder */}
              {routeInfo ? (
                <div
                  className="rounded-lg p-3 flex items-start justify-between"
                  style={{ background: isDark ? '#0f1520' : '#f1f5f9' }}
                >
                  <div className="w-full">
                    {routeInfo.ruasJalanName && (
                      <p className="text-gray-100 text-sm font-semibold mb-3 border-b border-gray-700/50 pb-2">
                        <MapPin className="w-4 h-4 inline mr-1.5 text-blue-400" />
                        {routeInfo.ruasJalanName}
                      </p>
                    )}
                    <div className="relative pl-5 space-y-4">
                      {/* Garis vertikal timeline */}
                      <div className="absolute left-[7px] top-2 bottom-3 w-px bg-gray-700"></div>

                      {routeInfo.startPoint && (
                        <div className="relative">
                          <div className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-green-500 ring-4 z-10" style={{ '--tw-ring-color': isDark ? '#0f1520' : '#f1f5f9' }}></div>
                          <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
                            Titik Awal
                          </p>
                          <p className="text-xs font-mono" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                            {routeInfo.startPoint.lat.toFixed(5)}, {routeInfo.startPoint.lng.toFixed(5)}
                          </p>
                        </div>
                      )}

                      {routeInfo.endPoint && (
                        <div className="relative">
                          <div className="absolute -left-[21.5px] top-1.5 w-2 h-2 rounded-full bg-red-500 ring-4 z-10" style={{ '--tw-ring-color': isDark ? '#0f1520' : '#f1f5f9' }}></div>
                          <p className="text-[10px] uppercase tracking-widest font-semibold mb-0.5" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>
                            Titik Akhir
                          </p>
                          <p className="text-xs font-mono" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                            {routeInfo.endPoint.lat.toFixed(5)}, {routeInfo.endPoint.lng.toFixed(5)}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-600 mt-0.5" />
                </div>
              ) : (
                <button
                  onClick={checkPermissions}
                  className="w-full border rounded-lg p-3 flex items-center justify-between transition-colors group"
                  style={{
                    background: isDark ? '#0f1520' : '#f1f5f9',
                    borderColor: isDark ? 'rgba(55,65,81,0.6)' : 'rgba(209,213,219,0.8)',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = isDark ? '#141c2e' : '#e2e8f0'}
                  onMouseLeave={e => e.currentTarget.style.background = isDark ? '#0f1520' : '#f1f5f9'}
                >
                  <div className="text-left">
                    <p className="text-xs" style={{ color: isDark ? '#6b7280' : '#94a3b8' }}>Rute dipilih</p>
                    <p className="text-sm mt-0.5" style={{ color: isDark ? '#d1d5db' : '#374151' }}>
                      Pilih rute inspeksi...
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 transition-colors" style={{ color: isDark ? '#4b5563' : '#9ca3af' }} />
                </button>
              )}

              {/* Baris statistik — tampil saat tracking */}
              {isTracking && (
                <div className="grid grid-cols-3 gap-2">
                  <StatBox label="FPS" value={fps} isDark={isDark} />
                  <StatBox label="Total Deteksi" value={totalDetections} isDark={isDark} />
                  <StatBox label="Tersimpan" value={savedDamages.length} isDark={isDark} />
                </div>
              )}

              {/* Tombol mulai/selesai */}
              {!isTracking ? (
                <button
                  onClick={checkPermissions}
                  className={`w-full flex items-center justify-center gap-2 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all text-sm ${
                    isDark ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-500 hover:bg-blue-600'
                  }`}
                >
                  <PlayCircle className="w-5 h-5" />
                  Mulai Tracking
                </button>
              ) : (
                <button
                  onClick={stopTracking}
                  className={`w-full flex items-center justify-center gap-2 active:scale-[0.98] text-white font-semibold py-3 rounded-lg transition-all text-sm ${
                    isDark
                      ? 'bg-red-700/80 hover:bg-red-700 border border-red-600/50'
                      : 'bg-red-500 hover:bg-red-600 border border-red-400/50'
                  }`}
                >
                  <StopCircle className="w-5 h-5" />
                  Selesai Tracking
                </button>
              )}

              {/* Status GPS inline */}
              <div className="flex items-center justify-between">
                <GpsBadge gpsReady={gpsReady} gpsAccuracy={gpsAccuracy} isDark={isDark} />
                {isTracking && location.lat && (
                  <span className="text-gray-500 font-mono text-[10px]">
                    {location.lat.toFixed(5)}, {location.lng.toFixed(5)}
                  </span>
                )}
              </div>
            </div>
          </SectionCard>

          {/* Card kamera */}
          <SectionCard isDark={isDark}>
            <CardHeader
              icon={Camera}
              iconColor="text-blue-400"
              title="Kamera Live"
              isDark={isDark}
              right={
                <div className="flex items-center gap-2">
                  {isCameraReady && (
                    <button
                      onClick={() => setShowRotateHint(true)}
                      title="Buka mode fullscreen"
                      className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg bg-blue-600/20 hover:bg-blue-600/40 border border-blue-500/30 text-blue-400 transition-all"
                    >
                      <Maximize2 className="w-3.5 h-3.5" />
                      <span>Fullscreen</span>
                    </button>
                  )}
                  <GpsBadge gpsReady={gpsReady} gpsAccuracy={gpsAccuracy} isDark={isDark} />
                </div>
              }
            />
            <div className="relative bg-black" style={{ minHeight: "240px" }}>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-auto"
                style={{ display: isCameraReady ? "block" : "none" }}
              />
              <canvas
                ref={canvasRef}
                className="absolute top-0 left-0 w-full h-full pointer-events-none"
                style={{ display: isCameraReady ? "block" : "none" }}
              />

              {!isCameraReady && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                  <CameraOff className="w-12 h-12 text-gray-700" />
                  <p className="text-gray-500 text-sm">Kamera belum aktif</p>
                  <p className="text-gray-600 text-xs">
                    Klik "Mulai Tracking" untuk memulai
                  </p>
                </div>
              )}

              {/* Overlay badge deteksi */}
              {isTracking && isCameraReady && (
                <div className="absolute top-3 left-3 bg-black/70 backdrop-blur-sm rounded-lg px-3 py-2 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-red-400 animate-pulse" />
                    <span className="text-xs font-semibold text-red-400">
                      Mendeteksi...
                    </span>
                  </div>
                </div>
              )}

              {/* Chip deteksi live */}
              {detectionResults.length > 0 && (
                <div className="absolute bottom-3 left-3 right-3 flex flex-wrap gap-1.5">
                  {detectionResults.map((d, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-2 py-0.5 rounded-full"
                      style={{
                        background: getColorForClass(d.class_name) + "33",
                        color: getColorForClass(d.class_name),
                        border: `1px solid ${getColorForClass(d.class_name)}66`,
                      }}
                    >
                      {d.class_name} {(d.confidence * 100).toFixed(0)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        {/* ── KOLOM KANAN ── */}
        <div className="flex flex-col gap-4">
          {/* Peta mini */}
          <SectionCard isDark={isDark}>
            <CardHeader
              icon={Crosshair}
              iconColor="text-blue-400"
              title="Posisi Saya"
              isDark={isDark}
              right={
                gpsReady &&
                location.lat && (
                  <span className="text-[10px] text-gray-500 font-mono">
                    {location.lat.toFixed(6)}, {location.lng.toFixed(6)}
                  </span>
                )
              }
            />
            <div
              style={{
                height: "220px",
                position: "relative",
                overflow: "hidden",
              }}
            >
              <MapContainer
                center={
                  location.lat
                    ? [location.lat, location.lng]
                    : [-0.0917, 109.3717]
                }
                zoom={location.lat ? 17 : 12}
                style={{
                  height: "100%",
                  width: "100%",
                  position: "absolute",
                  inset: 0,
                }}
                zoomControl={true}
                scrollWheelZoom={true}
                className={isDark ? 'map-dark' : 'map-light'}
              >
                <TileLayer
                  url={isDark
                    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                    : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                  }
                  attribution="&copy; OpenStreetMap &copy; CARTO"
                  subdomains="abcd"
                  maxZoom={19}
                />
                <FlyToLocation location={location} hasFlewOnce={hasFlewOnce} />
                {/* Batas wilayah Kubu Raya */}
                <KubuRayaBoundaryLayer />
                {location.lat && (
                  <Marker
                    position={[location.lat, location.lng]}
                    icon={petugasIcon}
                  />
                )}
              </MapContainer>

              {!gpsReady && (
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    zIndex: 1000,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    background: isDark ? "rgba(15,15,35,0.88)" : "rgba(255,255,255,0.88)",
                    gap: "10px",
                    pointerEvents: "none",
                  }}
                >
                  <div
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "3px solid #3b82f6",
                      borderTopColor: "transparent",
                      borderRadius: "50%",
                      animation: "spin 1s linear infinite",
                    }}
                  />
                  <p style={{ color: isDark ? '#9ca3af' : '#64748b', fontSize: "13px", margin: 0 }}>
                    Mencari sinyal GPS...
                  </p>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}

              {gpsReady && gpsAccuracy && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "8px",
                    left: "8px",
                    zIndex: 1000,
                    background: "rgba(0,0,0,0.7)",
                    color:
                      gpsAccuracy <= 10
                        ? "#4ade80"
                        : gpsAccuracy <= 30
                          ? "#fbbf24"
                          : "#f87171",
                    padding: "3px 8px",
                    borderRadius: "12px",
                    fontSize: "11px",
                    fontWeight: "600",
                    pointerEvents: "none",
                  }}
                >
                  GPS ±{gpsAccuracy}m
                </div>
              )}
            </div>
          </SectionCard>

          {/* List kerusakan tersimpan */}
          <SectionCard className="flex-1" isDark={isDark}>
            <CardHeader
              icon={AlertTriangle}
              iconColor="text-red-400"
              isDark={isDark}
              title={
                <span className="flex items-center gap-2">
                  Kerusakan Tersimpan
                  {allDamages.length > 0 && (
                    <span className="bg-red-500/20 text-red-400 border border-red-500/30 text-[10px] font-semibold px-2 py-0.5 rounded-full">
                      {allDamages.length}
                    </span>
                  )}
                </span>
              }
            />
            <div className="max-h-52 overflow-y-auto">
              {allDamages.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <AlertTriangle className="w-8 h-8 text-gray-700" />
                  <p className="text-gray-500 text-sm">
                    Belum ada kerusakan tersimpan
                  </p>
                </div>
              ) : (
                allDamages
                  .slice()
                  .reverse()
                  .map((d, i) => <DamageRow key={i} damage={d} index={i} />)
              )}
            </div>

            {/* Legenda */}
            <div
              className="px-4 py-3 border-t"
              style={{
                borderColor: isDark ? 'rgba(31,41,55,0.6)' : 'rgba(229,231,235,0.8)',
                background: isDark ? '#141c2e' : '#f8fafc',
              }}
            >
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
                {Object.entries(CLASS_COLORS).map(([name, color]) => (
                  <div key={name} className="flex items-center gap-1.5">
                    <div
                      className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                      style={{ background: color }}
                    />
                    <span className="text-[11px]" style={{ color: isDark ? '#9ca3af' : '#64748b' }}>
                      {name === "Lubang"
                        ? "Lubang (Pothole)"
                        : name.replace("-", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </SectionCard>
        </div>
      </div>

      {/* ── Modal izin akses ── */}
      {showPermissionModal && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center p-4"
          style={{ zIndex: 9999 }}
        >
          <div className="rounded-xl border border-gray-700 bg-[#1a2035] max-w-md w-full p-6 space-y-5">
            <div className="flex items-center gap-3">
              <ShieldAlert className="w-7 h-7 text-yellow-400" />
              <h2 className="text-lg font-bold text-gray-100">
                Izin Diperlukan
              </h2>
            </div>

            <p className="text-gray-400 text-sm">
              Aplikasi membutuhkan akses{" "}
              <strong className="text-gray-200">Kamera</strong> dan{" "}
              <strong className="text-gray-200">GPS/Lokasi</strong> untuk
              memulai tracking.
            </p>

            <div className="space-y-2">
              {[
                {
                  icon: Camera,
                  color: "text-blue-400",
                  title: "Kamera",
                  desc: "Mendeteksi kerusakan jalan secara real-time",
                  key: "camera",
                },
                {
                  icon: Navigation,
                  color: "text-green-400",
                  title: "GPS / Lokasi",
                  desc: "Mencatat koordinat posisi kerusakan",
                  key: "gps",
                },
              ].map(({ icon: Icon, color, title, desc, key }) => (
                <div
                  key={key}
                  className="flex items-center gap-3 bg-[#0f1520] rounded-lg p-3"
                >
                  <Icon className={`w-5 h-5 ${color} flex-shrink-0`} />
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-200">
                      {title}
                    </p>
                    <p className="text-xs text-gray-500">{desc}</p>
                  </div>
                  {permissionStatus[key] === "granted" && (
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  )}
                  {permissionStatus[key] === "denied" && (
                    <AlertCircle className="w-4 h-4 text-red-400" />
                  )}
                </div>
              ))}
            </div>

            {(permissionStatus.camera === "denied" ||
              ["denied", "unavailable"].includes(permissionStatus.gps)) && (
              <div className="bg-red-600/10 border border-red-600/30 rounded-lg p-3 text-xs text-red-300 space-y-1">
                <p className="font-semibold mb-1">
                  Cara mengizinkan di iPhone (iOS):
                </p>
                <p>
                  • <strong>Lokasi:</strong> Pengaturan → Privacy & Security →
                  Location Services → Safari → While Using
                </p>
                <p>
                  • <strong>Kamera:</strong> Pengaturan → Privacy & Security →
                  Camera → Safari → aktifkan
                </p>
                <p>
                  • Pastikan buka via <strong>https://</strong>
                </p>
              </div>
            )}

            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowPermissionModal(false)}
                className="flex-1 bg-gray-700/50 hover:bg-gray-700 text-gray-300 font-semibold py-2.5 rounded-lg transition-colors text-sm"
              >
                Batal
              </button>
              <button
                onClick={requestPermissionsAndStart}
                className="flex-1 bg-red-500 hover:bg-red-600 text-white font-semibold py-2.5 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-4 h-4" />
                Izinkan & Mulai
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal pilih rute di peta */}
      <MapPickerModal
        isOpen={showMapPicker}
        onClose={() => setShowMapPicker(false)}
        onConfirm={handleRouteConfirmed}
        currentLocation={location.lat ? location : null}
      />

      {/* ── Modal: Aktifkan Rotasi Otomatis ── */}
      {showRotateHint && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 99998,
            background: "rgba(0,0,0,0.75)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "linear-gradient(135deg, #1e293b 0%, #0f172a 100%)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 20,
              padding: "28px 24px",
              maxWidth: 340,
              width: "100%",
              boxShadow: "0 25px 60px rgba(0,0,0,0.6)",
            }}
          >
            {/* Ikon */}
            <div style={{ textAlign: "center", marginBottom: 18 }}>
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: "50%",
                  background: "rgba(59,130,246,0.15)",
                  border: "2px solid rgba(59,130,246,0.4)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 30,
                }}
              >
                📱
              </div>
            </div>

            {/* Judul */}
            <h3
              style={{
                color: "#f1f5f9",
                fontSize: 17,
                fontWeight: 700,
                textAlign: "center",
                margin: "0 0 10px",
              }}
            >
              Aktifkan Rotasi Otomatis
            </h3>

            {/* Isi */}
            <p
              style={{
                color: "#94a3b8",
                fontSize: 13,
                lineHeight: 1.6,
                textAlign: "center",
                margin: "0 0 8px",
              }}
            >
              Sebelum masuk mode fullscreen, pastikan fitur
            </p>
            <div
              style={{
                background: "rgba(59,130,246,0.1)",
                border: "1px solid rgba(59,130,246,0.25)",
                borderRadius: 10,
                padding: "10px 14px",
                marginBottom: 20,
                textAlign: "center",
              }}
            >
              <span style={{ color: "#60a5fa", fontWeight: 700, fontSize: 13 }}>
                🔄 Rotasi Otomatis (Auto-Rotate)
              </span>
              <p style={{ color: "#94a3b8", fontSize: 12, margin: "4px 0 0" }}>
                sudah diaktifkan di pengaturan HP Anda
              </p>
            </div>

            <p
              style={{
                color: "#64748b",
                fontSize: 12,
                textAlign: "center",
                margin: "0 0 20px",
              }}
            >
              Putar HP ke kiri/kanan untuk melihat kamera secara landscape
              setelah masuk fullscreen.
            </p>

            {/* Tombol-tombol */}
            <div style={{ display: "flex", gap: 10 }}>
              <button
                onClick={() => setShowRotateHint(false)}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  background: "rgba(255,255,255,0.06)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#94a3b8",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Batal
              </button>
              <button
                onClick={() => {
                  setShowRotateHint(false);
                  setIsLandscapeOpen(true);
                }}
                style={{
                  flex: 1,
                  padding: "12px",
                  borderRadius: 12,
                  background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                  border: "none",
                  color: "#fff",
                  fontSize: 14,
                  fontWeight: 700,
                  cursor: "pointer",
                  boxShadow: "0 4px 15px rgba(59,130,246,0.4)",
                }}
              >
                Sudah, Lanjutkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay kamera fullscreen */}
      {isLandscapeOpen && (
        <CameraLandscapeOverlay
          streamRef={streamRef}
          isCameraReady={isCameraReady}
          detectionResults={detectionResults}
          fps={fps}
          gpsReady={gpsReady}
          gpsAccuracy={gpsAccuracy}
          savedDamages={savedDamages}
          onClose={() => setIsLandscapeOpen(false)}
        />
      )}
    </div>
  );
};

export default TrackingPage;
