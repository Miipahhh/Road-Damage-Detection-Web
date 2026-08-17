import React, { useEffect, useState, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { MapContainer, TileLayer, Polyline, Marker, Popup, CircleMarker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { X, Clock, MapPin, ShieldX, Calendar, Navigation, Sun, Moon } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";
import RetryImage from "./RetryImage";

// Tile Layers persis seperti Peta Monitoring
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
  },
};

// Helper component untuk auto zoom & fit bounds (dibatasi agar hanya berjalan 1 kali per sesi supaya ringan & tidak menarik paksa saat user pan/zoom)
const FitBounds = ({ points, sessionId }) => {
  const map = useMap();
  const fittedRef = useRef(null);

  useEffect(() => {
    if (points && points.length > 0 && fittedRef.current !== sessionId) {
      try {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        if (bounds.isValid()) {
          map.fitBounds(bounds, { padding: [50, 50], maxZoom: 17, animate: false });
          fittedRef.current = sessionId;
        }
      } catch (err) {
        console.error("Error fitting bounds:", err);
      }
    }
  }, [points, map, sessionId]);
};

// Cache OSRM di-share antar komponen — tidak di-fetch ulang untuk rute yang sama
const _osrmRouteCacheModal = new Map();

// Komponen garis target rute dari Titik Mulai (A) ke Titik Akhir (B)
// Menggunakan OSRM routing agar garis mengikuti jaringan jalan nyata
// Garis berwarna putih putus-putus agar beda jelas dari garis GPS tracking
const RouteTargetLine = ({ startPoint, endPoint, color }) => {
  const [routeCoords, setRouteCoords] = useState(null);

  useEffect(() => {
    if (!startPoint?.lat || !startPoint?.lng || !endPoint?.lat || !endPoint?.lng) return;
    const sLat = Number(startPoint.lat), sLng = Number(startPoint.lng);
    const eLat = Number(endPoint.lat), eLng = Number(endPoint.lng);
    if (isNaN(sLat) || isNaN(sLng) || isNaN(eLat) || isNaN(eLng)) return;

    const cacheKey = `${sLat.toFixed(6)},${sLng.toFixed(6)}-${eLat.toFixed(6)},${eLng.toFixed(6)}`;

    if (_osrmRouteCacheModal.has(cacheKey)) {
      setRouteCoords(_osrmRouteCacheModal.get(cacheKey));
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 6000);

    fetch(
      `https://router.project-osrm.org/route/v1/driving/${sLng},${sLat};${eLng},${eLat}?overview=full&geometries=geojson`,
      { signal: controller.signal }
    )
      .then(r => r.json())
      .then(data => {
        if (data?.routes?.[0]?.geometry?.coordinates) {
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          _osrmRouteCacheModal.set(cacheKey, coords);
          setRouteCoords(coords);
        }
      })
      .catch(() => { /* Fallback ke garis lurus */ })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [
    startPoint?.lat, startPoint?.lng,
    endPoint?.lat, endPoint?.lng,
  ]);

  if (!startPoint?.lat || !startPoint?.lng || !endPoint?.lat || !endPoint?.lng) return null;

  const fallback = [
    [Number(startPoint.lat), Number(startPoint.lng)],
    [Number(endPoint.lat), Number(endPoint.lng)],
  ];
  const positions = routeCoords || fallback;

  return (
    <>
      {/* Glow layer putih */}
      <Polyline positions={positions} color="#ffffff" weight={6} opacity={0.12} dashArray="12, 14" interactive={false} />
      {/* Garis putus-putus putih — penanda Ruas Jalan A→B */}
      <Polyline positions={positions} color="#ffffff" weight={2.5} opacity={0.75} dashArray="10, 12" interactive={false} />
      {/* Aksen warna petugas */}
      <Polyline positions={positions} color={color} weight={1.5} opacity={0.55} dashArray="1, 20" interactive={false} />
    </>
  );
};

const RouteFocusModal = ({ isOpen, onClose, session }) => {
  const { isDark } = useTheme();
  const [mapMode, setMapMode] = useState(isDark ? "dark" : "light");

  useEffect(() => {
    setMapMode(isDark ? "dark" : "light");
  }, [isDark, isOpen]);

  const PETUGAS_COLORS = [
    '#3b82f6', '#ef4444', '#22c55e', '#eab308',
    '#8b5cf6', '#f97316', '#ec4899', '#2dd4bf',
  ];
  const sessionColor = useMemo(() => {
    if (session?.color) return session.color;
    if (session?.user_id || session?.user?.id) {
      const uid = Number(session.user_id || session.user.id);
      if (!isNaN(uid) && uid > 0) {
        return PETUGAS_COLORS[(uid - 1) % PETUGAS_COLORS.length];
      }
    }
    const str = String(session?.user?.name || session?.id || 'petugas');
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    return PETUGAS_COLORS[Math.abs(hash) % PETUGAS_COLORS.length];
  }, [session]);

  // Ikon kustom untuk titik A (Mulai) dan B (Selesai) memoized mengikuti warna petugas
  const startIcon = useMemo(() => L.divIcon({
    className: "custom-start-icon",
    html: `<div style="background:${sessionColor};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:14px;">A</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }), [sessionColor]);

  const endIcon = useMemo(() => L.divIcon({
    className: "custom-end-icon",
    html: `<div style="background:${sessionColor};color:white;border-radius:50%;width:32px;height:32px;display:flex;align-items:center;justify-content:center;font-weight:bold;border:2px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);font-size:14px;">B</div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  }), [sessionColor]);

  const getColorForClass = (className) => {
    const colors = {
      Lubang: "#3b82f6",
      "Retak-Buaya": "#ef4444",
      "Retak-Memanjang": "#eab308",
      "Retak-Melintang": "#22c55e",
    };
    return colors[className] || "#888";
  };

  // Definisikan routePath dan roadDamages di tingkat atas komponen agar selalu tersedia untuk JSX & useMemo
  const routePath = Array.isArray(session?.route_path) ? session.route_path : [];
  const roadDamages = Array.isArray(session?.road_damages) ? session.road_damages : [];

  const routeCoordinates = useMemo(() => {
    if (!Array.isArray(routePath) || routePath.length === 0) return [];
    const pts = [];
    routePath.forEach((p) => {
      if (p && p.lat !== undefined && p.lng !== undefined && p.lat !== null && p.lng !== null) {
        const lat = Number(p.lat);
        const lng = Number(p.lng);
        if (!isNaN(lat) && !isNaN(lng) && (lat !== 0 || lng !== 0)) {
          const last = pts[pts.length - 1];
          if (!last || Math.abs(last[0] - lat) > 0.000001 || Math.abs(last[1] - lng) > 0.000001) {
            pts.push([lat, lng]);
          }
        }
      }
    });
    return pts;
  }, [routePath]);

  // Kumpulkan semua titik koordinat untuk fitBounds (memoized agar ringan)
  const allPoints = useMemo(() => {
    if (!session) return [];
    const pts = [];
    if (session.start_point?.lat && session.start_point?.lng) {
      const lat = Number(session.start_point.lat);
      const lng = Number(session.start_point.lng);
      if (!isNaN(lat) && !isNaN(lng)) pts.push({ lat, lng });
    }
    if (session.end_point?.lat && session.end_point?.lng) {
      const lat = Number(session.end_point.lat);
      const lng = Number(session.end_point.lng);
      if (!isNaN(lat) && !isNaN(lng)) pts.push({ lat, lng });
    }
    routeCoordinates.forEach(([lat, lng]) => {
      pts.push({ lat, lng });
    });
    if (roadDamages.length > 0) {
      roadDamages.forEach((d) => {
        if (d.latitude && d.longitude) {
          const lat = Number(d.latitude);
          const lng = Number(d.longitude);
          if (!isNaN(lat) && !isNaN(lng)) {
            pts.push({ lat, lng });
          }
        }
      });
    }
    return pts;
  }, [session, routeCoordinates, roadDamages]);

  if (!isOpen || !session) return null;

  const defaultCenter = allPoints.length > 0 ? [allPoints[0].lat, allPoints[0].lng] : [-8.1724, 113.7001]; // Default Jember / Indonesia

  return createPortal(
    <div
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/80 p-4 animate-fadeIn"
      style={{ zIndex: 99999 }}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-5xl h-[85vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl border ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Modal */}
        <div
          className={`px-6 py-4 border-b flex items-center justify-between gap-4 ${
            isDark ? "bg-gray-800/80 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}
        >
          <div>
            <div className="flex items-center gap-3">
              <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-600 text-white flex items-center gap-1">
                <Navigation className="w-3 h-3" /> Fokus Rute
              </span>
              <h3 className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-800"}`}>
                {session.user?.name || "Petugas"}
              </h3>
            </div>
            <p className="text-xs text-gray-400 mt-1 flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-blue-400" />
                {new Date(session.started_at).toLocaleDateString("id-ID", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-yellow-400" />
                {new Date(session.started_at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {session.ended_at &&
                  ` s/d ${new Date(session.ended_at).toLocaleTimeString("id-ID", {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}`}
              </span>
              {session.ruas_jalan_name && (
                <span className="flex items-center gap-1 text-green-400 font-medium">
                  <MapPin className="w-3.5 h-3.5" />
                  {session.ruas_jalan_name}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-4">
            <div className={`hidden sm:flex items-center gap-4 px-4 py-2 rounded-xl text-xs font-semibold ${
              isDark ? "bg-gray-800 text-gray-300 border border-gray-700" : "bg-gray-100 text-gray-700"
            }`}>
              <div>
                <span className="text-gray-400 block text-[10px]">Kerusakan</span>
                <span className="text-red-400 font-bold text-sm">{roadDamages.length} titik</span>
              </div>
              <div className="w-[1px] h-6 bg-gray-600/50"></div>
              <div>
                <span className="text-gray-400 block text-[10px]">Koordinat Rute</span>
                <span className="text-blue-400 font-bold text-sm">{routePath.length} titik</span>
              </div>
            </div>

            <button
              onClick={() => setMapMode(mapMode === "dark" ? "light" : "dark")}
              className={`px-3 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border cursor-pointer ${
                mapMode === "dark"
                  ? "bg-gray-800 border-gray-600 text-yellow-300 hover:bg-gray-700"
                  : "bg-yellow-100 border-yellow-300 text-gray-800 hover:bg-yellow-200"
              }`}
              title="Ubah Tema Peta (Dark / Light Mode)"
            >
              {mapMode === "dark" ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            <button
              onClick={onClose}
              className="p-2.5 rounded-full bg-gray-700/50 hover:bg-red-600 text-gray-300 hover:text-white transition-colors cursor-pointer"
              title="Tutup Peta Fokus"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Map Container */}
        <div className="flex-1 relative w-full h-full bg-gray-950">
          <MapContainer
            center={defaultCenter}
            zoom={14}
            style={{ width: "100%", height: "100%" }}
            scrollWheelZoom={true}
            preferCanvas={true}
          >
            <TileLayer
              key={`tile-${mapMode}`}
              attribution={TILE_LAYERS[mapMode].attribution}
              url={TILE_LAYERS[mapMode].url}
            />

            {/* Auto fit bounds dibatasi per sesi agar ringan */}
            <FitBounds points={allPoints} sessionId={session.id} />

            {/* 1. Garis Target A→B (Ruas Jalan yang dipilih petugas) - Langsung tampil tanpa lag */}
            {session.start_point?.lat && session.start_point?.lng && session.end_point?.lat && session.end_point?.lng && (
              <RouteTargetLine
                startPoint={session.start_point}
                endPoint={session.end_point}
                color={sessionColor}
              />
            )}

            {/* 2. Garis Breadcrumb Tracking GPS Nyata Petugas (Hanya jika ada minimal 2 titik GPS) */}
            {routeCoordinates.length > 1 && (
              <>
                {/* Glow luar */}
                <Polyline
                  positions={routeCoordinates}
                  color={sessionColor}
                  weight={8}
                  opacity={0.15}
                  lineCap="round"
                  smoothFactor={3}
                  interactive={false}
                />
                {/* Garis solid tebal — jalur GPS nyata petugas */}
                <Polyline
                  positions={routeCoordinates}
                  color={sessionColor}
                  weight={3.5}
                  opacity={0.95}
                  lineCap="round"
                  smoothFactor={3}
                  interactive={false}
                />
              </>
            )}

            {/* Titik Mulai (A) */}
            {session.start_point?.lat && session.start_point?.lng && (
              <Marker
                position={[Number(session.start_point.lat), Number(session.start_point.lng)]}
                icon={startIcon}
              >
                <Popup>
                  <div className="text-center font-sans p-1">
                    <span className="bg-green-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      TITIK MULAI (A)
                    </span>
                    <p className="font-bold text-gray-800 text-sm mt-1.5">
                      {session.user?.name || "Petugas"}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Waktu Mulai:{" "}
                      {new Date(session.started_at).toLocaleTimeString("id-ID", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Titik Selesai (B) */}
            {session.end_point?.lat && session.end_point?.lng && (
              <Marker
                position={[Number(session.end_point.lat), Number(session.end_point.lng)]}
                icon={endIcon}
              >
                <Popup>
                  <div className="text-center font-sans p-1">
                    <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                      TITIK SELESAI (B)
                    </span>
                    <p className="font-bold text-gray-800 text-sm mt-1.5">
                      {session.user?.name || "Petugas"}
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      Waktu Selesai:{" "}
                      {session.ended_at
                        ? new Date(session.ended_at).toLocaleTimeString("id-ID", {
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })
                        : "Masih Aktif"}
                    </p>
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Titik-Titik Kerusakan Jalan pada sesi ini */}
            {roadDamages.map((damage) => {
              if (!damage.latitude || !damage.longitude) return null;
              const color = getColorForClass(damage.damage_class || damage.class_name);
              return (
                <CircleMarker
                  key={damage.id}
                  center={[Number(damage.latitude), Number(damage.longitude)]}
                  radius={8}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor: color,
                    fillOpacity: 0.9,
                  }}
                >
                  <Popup>
                    <div className="w-56 font-sans">
                      {damage.image_url ? (
                        <RetryImage
                          src={damage.image_url}
                          alt="Kerusakan"
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      ) : damage.image_path ? (
                        <RetryImage
                          src={`/storage/${damage.image_path}`}
                          alt="Kerusakan"
                          className="w-full h-32 object-cover rounded-lg mb-2"
                        />
                      ) : null}
                      <span
                        className="px-2 py-0.5 rounded text-xs font-bold text-white inline-block mb-1"
                        style={{ backgroundColor: color }}
                      >
                        {damage.damage_class || damage.class_name || "Kerusakan"}
                      </span>
                      <p className="text-xs text-gray-600 mt-1">
                        Akurasi AI: {damage.confidence ? `${Math.round(damage.confidence * 100)}%` : "-"}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-0.5">
                        Dideteksi: {new Date(damage.created_at || damage.detected_at).toLocaleString("id-ID")}
                      </p>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Legenda kecil di pojok peta */}
          <div className="absolute bottom-4 left-4 z-[500] bg-gray-900/90 backdrop-blur border border-gray-700 p-3 rounded-xl shadow-lg text-xs text-gray-300 max-w-xs pointer-events-none">
            <p className="font-bold text-white mb-2 flex items-center gap-1.5">
              <ShieldX className="w-3.5 h-3.5 text-red-400" /> Legenda Peta
            </p>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block border border-white" style={{ background: sessionColor }}></span>
                <span>Titik Mulai (A)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full inline-block border border-white" style={{ background: sessionColor }}></span>
                <span>Titik Akhir (B)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-px inline-block border-t-2 border-dashed border-white opacity-70"></span>
                <span>Ruas Jalan (A→B)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-4 h-1 inline-block rounded" style={{ background: sessionColor }}></span>
                <span>Jalur GPS Nyata</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-[#3b82f6] inline-block border border-white"></span>
                <span>Titik Kerusakan</span>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div
          className={`px-6 py-3 border-t flex items-center justify-between text-xs text-gray-400 ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
          }`}
        >
          <span>Tip: Gunakan scroll mouse untuk zoom, atau klik titik kerusakan untuk melihat foto detil.</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold transition-colors cursor-pointer"
          >
            Tutup Peta
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default RouteFocusModal;
