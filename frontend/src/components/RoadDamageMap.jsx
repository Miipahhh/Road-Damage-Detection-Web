import React, { useEffect, useState, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Polyline, Marker, Tooltip, GeoJSON, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import 'leaflet.markercluster';
import RetryImage from './RetryImage';

/* ── Custom tooltip untuk nama petugas di garis rute ── */
const ROUTE_TOOLTIP_STYLE = `
  .route-name-tooltip {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
  }
  .route-name-tooltip::before { display: none !important; }
`;
if (typeof document !== 'undefined' && !document.getElementById('route-tooltip-style')) {
  const s = document.createElement('style');
  s.id = 'route-tooltip-style';
  s.textContent = ROUTE_TOOLTIP_STYLE;
  document.head.appendChild(s);
}

/* ── Global fullscreen image lightbox for Leaflet bindPopup HTML images ── */
if (typeof window !== 'undefined' && !window.__rddFullscreenInit) {
  window.__rddFullscreenInit = true;

  // Inject overlay CSS
  const fs = document.createElement('style');
  fs.id = 'rdd-fullscreen-style';
  fs.textContent = `
    #rdd-img-fullscreen {
      display:none; position:fixed; inset:0; z-index:99999;
      background:rgba(0,0,0,0.92); backdrop-filter:blur(6px);
      align-items:center; justify-content:center; cursor:zoom-out;
      animation:rddFadeIn 0.2s ease;
    }
    #rdd-img-fullscreen.open { display:flex; }
    #rdd-img-fullscreen img { max-width:95vw; max-height:92vh; object-fit:contain; border-radius:10px; box-shadow:0 8px 48px rgba(0,0,0,0.7); cursor:default; }
    #rdd-img-fullscreen .rdd-fs-close { position:absolute; top:20px; right:24px; background:rgba(255,255,255,0.12); border:1px solid rgba(255,255,255,0.2); color:#fff; border-radius:50%; width:40px; height:40px; font-size:20px; cursor:pointer; display:flex; align-items:center; justify-content:center; backdrop-filter:blur(4px); }
    .rdd-popup-img { cursor:zoom-in !important; transition:opacity 0.15s; }
    .rdd-popup-img:hover { opacity:0.88; }
    @keyframes rddFadeIn { from { opacity:0; transform:scale(0.97); } to { opacity:1; transform:scale(1); } }
  `;
  document.head.appendChild(fs);

  // Create overlay DOM
  const overlay = document.createElement('div');
  overlay.id = 'rdd-img-fullscreen';
  overlay.innerHTML = `<button class="rdd-fs-close" id="rdd-fs-close-btn">&#x2715;</button><img id="rdd-fs-img" src="" alt="Fullscreen" />`;
  document.body.appendChild(overlay);

  const closeOverlay = () => overlay.classList.remove('open');
  overlay.addEventListener('click', closeOverlay);
  document.getElementById('rdd-fs-close-btn').addEventListener('click', e => { e.stopPropagation(); closeOverlay(); });
  document.getElementById('rdd-fs-img').addEventListener('click', e => e.stopPropagation());
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeOverlay(); });

  window.__rddOpenFullscreen = (src) => {
    document.getElementById('rdd-fs-img').src = src;
    overlay.classList.add('open');
  };

  // Retry gambar popup yang gagal dimuat (server shared hosting kadang lambat)
  window.__rddImgRetry = (img) => {
    const attempt = (parseInt(img.dataset.rddRetry || '0', 10)) + 1;
    if (attempt > 6) return;
    img.dataset.rddRetry = attempt;
    const baseSrc = img.dataset.rddSrc || img.src.split('?_retry=')[0];
    img.dataset.rddSrc = baseSrc;
    const delay = Math.min(1000 * 2 ** (attempt - 1), 8000);
    setTimeout(() => {
      img.src = `${baseSrc}${baseSrc.includes('?') ? '&' : '?'}_retry=${attempt}`;
    }, delay);
  };
}

// ============ DATA KECAMATAN KABUPATEN KUBU RAYA ============
export const KECAMATAN_KUBU_RAYA = [
  { id: 'all', name: 'Semua Kecamatan', center: [-0.0917, 109.3717], zoom: 11 },
  { id: 'sungai_raya', name: 'Sungai Raya', center: [-0.2236, 109.6424], zoom: 11, bounds: [[-0.3989, 109.3296], [-0.0483, 109.9553]] },
  { id: 'sungai_kakap', name: 'Sungai Kakap', center: [-0.1526, 109.2070], zoom: 12, bounds: [[-0.3398, 109.0545], [0.0347, 109.3596]] },
  { id: 'rasau_jaya', name: 'Rasau Jaya', center: [-0.2394, 109.3553], zoom: 13, bounds: [[-0.3266, 109.2372], [-0.1522, 109.4735]] },
  { id: 'sungai_ambawang', name: 'Sungai Ambawang', center: [-0.0679, 109.6251], zoom: 11, bounds: [[-0.2293, 109.3642], [0.0935, 109.8860]] },
  { id: 'kuala_mandor_b', name: 'Kuala Mandor B', center: [0.1154, 109.5391], zoom: 12, bounds: [[-0.0428, 109.3657], [0.2737, 109.7126]] },
  { id: 'terentang', name: 'Terentang', center: [-0.3726, 109.7103], zoom: 11, bounds: [[-0.5031, 109.4475], [-0.2421, 109.9732]] },
  { id: 'batu_ampar', name: 'Batu Ampar', center: [-0.7553, 109.5924], zoom: 11, bounds: [[-1.0143, 109.2371], [-0.4964, 109.9478]] },
  { id: 'kubu', name: 'Kubu', center: [-0.4642, 109.4804], zoom: 11, bounds: [[-0.6585, 109.1510], [-0.2699, 109.8097]] },
  { id: 'teluk_pakedai', name: 'Teluk Pakedai', center: [-0.3948, 109.2110], zoom: 12, bounds: [[-0.5719, 109.0848], [-0.2178, 109.3372]] },
];

// ============ TILE LAYERS ============
const TILE_LAYERS = {
  dark: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
  light: {
    url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/">CARTO</a>',
    subdomains: 'abcd',
  },
};

// ============ THEME CONFIGS ============
const THEMES = {
  dark: {
    boundary: { color: '#e94560', weight: 2.5, opacity: 0.9, fillColor: '#e94560', fillOpacity: 0.03, dashArray: '10, 5' },
    markerBorder: '#ffffff',
    markerOpacity: 0.9,
    markerFillOpacity: 0.9,
    popupText: '#f1f1f1',
    popupSubText: '#d1d5db',
    popupMuted: '#9ca3af',
    liveLabel: '#4ade80',
    roadStyles: {
      trunk:          { color: '#ff8c42', weight: 4, opacity: 0.85 },
      trunk_link:     { color: '#ff8c42', weight: 3, opacity: 0.75 },
      primary:        { color: '#ffd166', weight: 3.5, opacity: 0.80 },
      primary_link:   { color: '#ffd166', weight: 2.5, opacity: 0.70 },
      secondary:      { color: '#a8dadc', weight: 3, opacity: 0.70 },
      secondary_link: { color: '#a8dadc', weight: 2, opacity: 0.60 },
      tertiary:       { color: '#90e0ef', weight: 2.5, opacity: 0.55 },
      tertiary_link:  { color: '#90e0ef', weight: 2, opacity: 0.45 },
      residential:    { color: '#6c757d', weight: 1.5, opacity: 0.50 },
      living_street:  { color: '#6c757d', weight: 1.2, opacity: 0.40 },
      unclassified:   { color: '#6c757d', weight: 1.2, opacity: 0.40 },
      service:        { color: '#495057', weight: 1, opacity: 0.35 },
      track:          { color: '#bc6c25', weight: 1, opacity: 0.35, dashArray: '4, 4' },
      default:        { color: '#495057', weight: 1, opacity: 0.30 },
    },
    kecamatanColors: {
      sungai_raya:      { color: '#60a5fa', fillColor: '#3b82f6' },
      sungai_kakap:     { color: '#f87171', fillColor: '#ef4444' },
      rasau_jaya:       { color: '#4ade80', fillColor: '#22c55e' },
      sungai_ambawang:  { color: '#facc15', fillColor: '#eab308' },
      kuala_mandor_b:   { color: '#a78bfa', fillColor: '#8b5cf6' },
      terentang:        { color: '#fb923c', fillColor: '#f97316' },
      batu_ampar:       { color: '#f472b6', fillColor: '#ec4899' },
      kubu:             { color: '#2dd4bf', fillColor: '#14b8a6' },
      teluk_pakedai:    { color: '#22d3ee', fillColor: '#06b6d4' },
    },
    highlightFillOpacity: 0.15,
  },
  light: {
    boundary: { color: '#dc2626', weight: 2.5, opacity: 0.8, fillColor: '#dc2626', fillOpacity: 0.04, dashArray: '10, 5' },
    markerBorder: '#1f2937',
    markerOpacity: 1,
    markerFillOpacity: 0.85,
    popupText: '#1f2937',
    popupSubText: '#374151',
    popupMuted: '#6b7280',
    liveLabel: '#16a34a',
    roadStyles: {
      trunk:          { color: '#c2410c', weight: 4, opacity: 0.80 },
      trunk_link:     { color: '#c2410c', weight: 3, opacity: 0.70 },
      primary:        { color: '#b45309', weight: 3.5, opacity: 0.75 },
      primary_link:   { color: '#b45309', weight: 2.5, opacity: 0.65 },
      secondary:      { color: '#1d4ed8', weight: 3, opacity: 0.65 },
      secondary_link: { color: '#1d4ed8', weight: 2, opacity: 0.55 },
      tertiary:       { color: '#4338ca', weight: 2.5, opacity: 0.50 },
      tertiary_link:  { color: '#4338ca', weight: 2, opacity: 0.40 },
      residential:    { color: '#6b7280', weight: 1.5, opacity: 0.45 },
      living_street:  { color: '#6b7280', weight: 1.2, opacity: 0.35 },
      unclassified:   { color: '#6b7280', weight: 1.2, opacity: 0.35 },
      service:        { color: '#9ca3af', weight: 1, opacity: 0.30 },
      track:          { color: '#92400e', weight: 1, opacity: 0.30, dashArray: '4, 4' },
      default:        { color: '#9ca3af', weight: 1, opacity: 0.25 },
    },
    kecamatanColors: {
      sungai_raya:      { color: '#2563eb', fillColor: '#3b82f6' },
      sungai_kakap:     { color: '#dc2626', fillColor: '#ef4444' },
      rasau_jaya:       { color: '#16a34a', fillColor: '#22c55e' },
      sungai_ambawang:  { color: '#ca8a04', fillColor: '#eab308' },
      kuala_mandor_b:   { color: '#7c3aed', fillColor: '#8b5cf6' },
      terentang:        { color: '#ea580c', fillColor: '#f97316' },
      batu_ampar:       { color: '#db2777', fillColor: '#ec4899' },
      kubu:             { color: '#0d9488', fillColor: '#14b8a6' },
      teluk_pakedai:    { color: '#0891b2', fillColor: '#06b6d4' },
    },
    highlightFillOpacity: 0.18,
  },
};

// ============ WARNA MARKER SESUAI PROPOSAL ============
const getDamageColor = (type) => {
  const colors = {
    'Lubang': '#3b82f6',
    'Retak-Buaya': '#ef4444',
    'Retak-Memanjang': '#eab308',
    'Retak-Melintang': '#22c55e',
  };
  return colors[type] || '#6b7280';
};

const getSeveritySize = (severity) => {
  const sizes = { high: 12, medium: 9, low: 6 };
  return sizes[severity] || 8;
};

// ============ BATAS WILAYAH KABUPATEN KUBU RAYA ============
const KUBU_RAYA_CENTER = [-0.0917, 109.3717];
const DEFAULT_ZOOM = 12;
const MAX_ZOOM = 19;
const KUBU_RAYA_BOUNDS = [
  [-1.05, 109.00],
  [0.30, 110.00],
];

// ============ CUSTOM ICON UNTUK POSISI PETUGAS ============
const createPetugasIcon = (color = '#3b82f6') => {
  return L.divIcon({
    className: 'petugas-marker',
    html: `
      <div style="
        position: relative;
        width: 28px; height: 28px;
        background: #0f172a;
        border: 2.5px solid ${color};
        border-radius: 50%;
        box-shadow: 0 0 12px ${color}, 0 2px 8px rgba(0,0,0,0.6);
        display: flex; align-items: center; justify-content: center;
        color: white; font-size: 13px;
        z-index: 10;
      ">
        👤
        <div style="
          position: absolute;
          top: -4px; left: -4px; right: -4px; bottom: -4px;
          border: 2px solid ${color};
          border-radius: 50%;
          animation: radar-ripple 2s cubic-bezier(0, 0, 0.2, 1) infinite;
          pointer-events: none;
        "></div>
      </div>
      <style>
        @keyframes radar-ripple {
          0% { transform: scale(0.9); opacity: 1; }
          100% { transform: scale(1.6); opacity: 0; }
        }
      </style>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Cache rute OSRM global — bertahan selama sesi browser, tidak di-fetch ulang
const _osrmRouteCache = new Map();

// Komponen garis target rute dari Titik Mulai (A) ke Titik Akhir (B)
// Menggunakan OSRM routing agar garis mengikuti jaringan jalan nyata
const RouteTargetLine = ({ startPoint, endPoint, color, isSelected = true }) => {
  const [routeCoords, setRouteCoords] = useState(null); // null = belum ada / fallback garis lurus

  useEffect(() => {
    if (!startPoint?.lat || !startPoint?.lng || !endPoint?.lat || !endPoint?.lng) return;
    const sLat = Number(startPoint.lat), sLng = Number(startPoint.lng);
    const eLat = Number(endPoint.lat), eLng = Number(endPoint.lng);
    if (isNaN(sLat) || isNaN(sLng) || isNaN(eLat) || isNaN(eLng)) return;

    const cacheKey = `${sLat.toFixed(6)},${sLng.toFixed(6)}-${eLat.toFixed(6)},${eLng.toFixed(6)}`;

    // Gunakan cache jika sudah ada
    if (_osrmRouteCache.has(cacheKey)) {
      setRouteCoords(_osrmRouteCache.get(cacheKey));
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
          // OSRM pakai [lng, lat] — Leaflet pakai [lat, lng]
          const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => [lat, lng]);
          _osrmRouteCache.set(cacheKey, coords);
          setRouteCoords(coords);
        }
      })
      .catch(() => { /* Fallback ke garis lurus jika OSRM gagal */ })
      .finally(() => clearTimeout(timeout));

    return () => { controller.abort(); clearTimeout(timeout); };
  }, [
    startPoint?.lat, startPoint?.lng,
    endPoint?.lat, endPoint?.lng,
  ]);

  if (!startPoint?.lat || !startPoint?.lng || !endPoint?.lat || !endPoint?.lng) return null;

  // Saat routing belum selesai atau gagal → tampilkan garis lurus sebagai fallback
  const fallback = [
    [Number(startPoint.lat), Number(startPoint.lng)],
    [Number(endPoint.lat), Number(endPoint.lng)],
  ];
  const positions = routeCoords || fallback;
  const weight   = isSelected ? 2.5 : 1.8;
  const opacity  = isSelected ? 0.9 : 0.5;

  return (
    <>
      {/* Glow layer */}
      <Polyline positions={positions} color={color} weight={weight + 3} opacity={opacity * 0.25} dashArray="10, 12" interactive={false} />
      {/* Garis utama putus-putus mengikuti jalan */}
      <Polyline positions={positions} color={color} weight={weight} opacity={opacity} dashArray="10, 12" interactive={false} />
    </>
  );
};

const FlyToArea = ({ selectedArea }) => {
  const map = useMap();

  useEffect(() => {
    if (!selectedArea) return;

    const kecamatan = KECAMATAN_KUBU_RAYA.find(k => k.id === selectedArea);
    if (!kecamatan) return;

    if (kecamatan.id === 'all') {
      map.flyTo(KUBU_RAYA_CENTER, DEFAULT_ZOOM, { duration: 1.5 });
    } else if (kecamatan.bounds) {
      map.flyToBounds(kecamatan.bounds, { duration: 1.5, padding: [20, 20], maxZoom: kecamatan.zoom });
    } else {
      map.flyTo(kecamatan.center, kecamatan.zoom, { duration: 1.5 });
    }
  }, [selectedArea, map]);

  return null;
};

// ============ KOMPONEN HIGHLIGHT KECAMATAN ============
const HighlightKecamatan = ({ selectedArea, mapMode }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const layerRef = useRef(null);
  const theme = THEMES[mapMode] || THEMES.dark;

  useEffect(() => {
    fetch('/kuburaya-kecamatan.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load kecamatan boundaries:', err));
  }, []);

  useEffect(() => {
    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }

    if (!geoData || !selectedArea || selectedArea === 'all') return;

    const feature = geoData.features.find(f => f.properties.id === selectedArea);
    if (!feature) return;

    const colors = theme.kecamatanColors[selectedArea] || { color: '#e94560', fillColor: '#e94560' };

    const layer = L.geoJSON(feature, {
      style: {
        color: colors.color,
        weight: 3,
        opacity: 1,
        fillColor: colors.fillColor,
        fillOpacity: theme.highlightFillOpacity,
        dashArray: null,
      },
      interactive: false,
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(feat.properties.name, {
          permanent: true,
          direction: 'center',
          className: `kecamatan-highlight-tooltip ${mapMode}`,
        });
      },
    });

    layer.addTo(map);
    layerRef.current = layer;

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [selectedArea, geoData, map, mapMode]);

  return null;
};

// ============ KOMPONEN JARINGAN JALAN KUBU RAYA ============
const KubuRayaRoads = ({ mapMode }) => {
  const map = useMap();
  const layerRef = useRef(null);
  const dataRef = useRef(null);
  const dataLoadedRef = useRef(false);
  const theme = THEMES[mapMode] || THEMES.dark;

  const getRoadStyleThemed = (feature) => {
    const highway = feature.properties?.highway || '';
    return theme.roadStyles[highway] || theme.roadStyles.default;
  };

  // Load data once
  useEffect(() => {
    if (dataLoadedRef.current) return;
    dataLoadedRef.current = true;

    fetch('/kuburaya-roads.json')
      .then(res => res.json())
      .then(data => {
        dataRef.current = data;
        rebuildLayer();
      })
      .catch(err => console.error('Failed to load roads:', err));

    const handleZoom = () => {
      if (!layerRef.current) return;
      const zoom = map.getZoom();
      if (zoom >= 12) {
        if (!map.hasLayer(layerRef.current)) {
          layerRef.current.addTo(map);
        }
      } else {
        if (map.hasLayer(layerRef.current)) {
          map.removeLayer(layerRef.current);
        }
      }
    };

    map.on('zoomend', handleZoom);

    return () => {
      map.off('zoomend', handleZoom);
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
    };
  }, [map]);

  // Rebuild layer when mode changes
  const rebuildLayer = () => {
    if (!dataRef.current) return;

    if (layerRef.current && map.hasLayer(layerRef.current)) {
      map.removeLayer(layerRef.current);
    }

    const layer = L.geoJSON(dataRef.current, {
      style: (feature) => getRoadStyleThemed(feature),
      onEachFeature: (feature, layer) => {
        const name = feature.properties?.name;
        const ref = feature.properties?.ref;
        const highway = feature.properties?.highway;
        if (name || ref) {
          layer.bindTooltip(
            `${name || ''}${ref ? ` (${ref})` : ''}<br/><small>${highway}</small>`,
            { sticky: true, direction: 'top', className: `road-tooltip ${mapMode}` }
          );
        }
      },
      interactive: false,
    });

    layerRef.current = layer;

    if (map.getZoom() >= 12) {
      layer.addTo(map);
    }
  };

  useEffect(() => {
    if (dataRef.current) {
      rebuildLayer();
    }
  }, [mapMode]);

  return null;
};

// ============ KOMPONEN BOUNDARY KUBU RAYA ============
const KubuRayaBoundary = ({ mapMode }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const theme = THEMES[mapMode] || THEMES.dark;

  useEffect(() => {
    map.setMaxBounds(KUBU_RAYA_BOUNDS);
    map.setMinZoom(10);

    fetch('/kuburaya-boundary.json')
      .then(res => res.json())
      .then(data => setGeoData(data))
      .catch(err => console.error('Failed to load boundary:', err));
  }, [map]);

  if (!geoData) return null;

  return (
    <GeoJSON
      key={`boundary-${mapMode}`}
      data={geoData}
      style={theme.boundary}
      interactive={false}
      onEachFeature={(feature, layer) => {
        layer.bindTooltip('Kabupaten Kubu Raya', {
          permanent: false,
          direction: 'center',
          className: `kuburaya-tooltip ${mapMode}`,
        });
      }}
    />
  );
};

// ============ KOMPONEN RUAS JALAN KABUPATEN KUBU RAYA ============
const RuasJalanLayer = ({ selectedRuas, mapMode, onRuasListLoaded }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const allLayerRef = useRef(null);
  const highlightLayerRef = useRef(null);
  const isDark = mapMode === 'dark';

  // Load GeoJSON once
  useEffect(() => {
    fetch('/kuburaya-ruas-jalan.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
        // Extract road names for parent component
        if (onRuasListLoaded) {
          const roads = data.features
            .filter(f => f.properties.folder === 'Nama & Nomor Ruas')
            .map(f => f.properties.name)
            .filter(Boolean)
            .sort((a, b) => {
              const numA = parseInt(a.match(/^(\d+)/)?.[1] || '999');
              const numB = parseInt(b.match(/^(\d+)/)?.[1] || '999');
              return numA - numB;
            });
          onRuasListLoaded(roads);
        }
      })
      .catch(err => console.error('Failed to load ruas jalan:', err));
  }, []);

  // Show all ruas as thin lines
  useEffect(() => {
    if (!geoData) return;

    if (allLayerRef.current) {
      map.removeLayer(allLayerRef.current);
      allLayerRef.current = null;
    }

    const layer = L.geoJSON(geoData, {
      filter: (feature) => feature.properties.folder === 'Nama & Nomor Ruas',
      style: () => ({
        color: isDark ? '#fbbf24' : '#d97706',
        weight: 2,
        opacity: selectedRuas ? 0.15 : 0.45,
        dashArray: '6, 4',
      }),
      interactive: false,
    });

    layer.addTo(map);
    allLayerRef.current = layer;

    return () => {
      if (allLayerRef.current && map.hasLayer(allLayerRef.current)) {
        map.removeLayer(allLayerRef.current);
      }
    };
  }, [geoData, mapMode, selectedRuas, map]);

  // Highlight selected ruas
  useEffect(() => {
    if (highlightLayerRef.current) {
      map.removeLayer(highlightLayerRef.current);
      highlightLayerRef.current = null;
    }

    if (!geoData || !selectedRuas) return;

    const feature = geoData.features.find(
      f => f.properties.name === selectedRuas && f.properties.folder === 'Nama & Nomor Ruas'
    );
    if (!feature) return;

    const layer = L.geoJSON(feature, {
      style: () => ({
        color: isDark ? '#facc15' : '#b45309',
        weight: 6,
        opacity: 1,
      }),
      interactive: false,
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(feat.properties.name, {
          permanent: true,
          direction: 'center',
          className: `ruas-highlight-tooltip ${mapMode}`,
        });
      },
    });

    layer.addTo(map);
    highlightLayerRef.current = layer;

    // Fly to the road
    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { duration: 1.2, padding: [40, 40], maxZoom: 15 });
    }

    return () => {
      if (highlightLayerRef.current && map.hasLayer(highlightLayerRef.current)) {
        map.removeLayer(highlightLayerRef.current);
      }
    };
  }, [selectedRuas, geoData, mapMode, map]);

  return null;
};

// ============ KOMPONEN TOGGLE MODE CLASS ============
const MapModeClass = ({ mapMode }) => {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    container.classList.remove('map-dark', 'map-light');
    container.classList.add(`map-${mapMode}`);
  }, [mapMode, map]);

  return null;
};

// ============ USER LOCATION MARKER ============
// CSS animasi pulsing dot — inject sekali saja
if (typeof document !== 'undefined' && !document.getElementById('user-loc-style')) {
  const s = document.createElement('style');
  s.id = 'user-loc-style';
  s.textContent = `
    @keyframes userLocPulse {
      0%   { transform: scale(1);   opacity: 1; }
      50%  { transform: scale(1.6); opacity: 0.35; }
      100% { transform: scale(1);   opacity: 1; }
    }
    @keyframes userLocRing {
      0%   { transform: scale(0.8); opacity: 0.8; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    .user-loc-icon { background: transparent !important; border: none !important; }
  `;
  document.head.appendChild(s);
}

// Ikon pulsing blue dot
const createUserLocationIcon = () => L.divIcon({
  className: 'user-loc-icon',
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <!-- Ring animasi luar -->
      <div style="
        position:absolute;top:0;left:0;right:0;bottom:0;
        border-radius:50%;
        background:rgba(59,130,246,0.25);
        animation:userLocRing 1.8s ease-out infinite;
      "></div>
      <!-- Dot utama -->
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:16px;height:16px;
        background:#3b82f6;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 0 0 2px rgba(59,130,246,0.5), 0 2px 8px rgba(0,0,0,0.5);
        animation:userLocPulse 2s ease-in-out infinite;
      "></div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
  popupAnchor: [0, -18],
});

// ============ DAMAGE CLUSTER LAYER ============
// Menggunakan leaflet.markercluster native untuk clustering marker kerusakan
const DamageClusterLayer = ({ markers, getDamageColor, getSeveritySize, theme, onRepairClick, currentUserId }) => {
  const map = useMap();
  const clusterRef = useRef(null);

  useEffect(() => {
    if (!map || !markers || markers.length === 0) return;

    // Hapus cluster group lama
    if (clusterRef.current) {
      map.removeLayer(clusterRef.current);
    }

    // Buat cluster group baru
    const cluster = L.markerClusterGroup({
      maxClusterRadius: 50,
      spiderfyOnMaxZoom: true,
      showCoverageOnHover: false,
      zoomToBoundsOnClick: true,
      disableClusteringAtZoom: 15,
      iconCreateFunction: (c) => {
        const count = c.getChildCount();
        const size = count > 50 ? 48 : count > 20 ? 42 : count > 10 ? 36 : 30;
        const bg = count > 50 ? '#dc2626' : count > 20 ? '#d97706' : count > 10 ? '#2563eb' : '#16a34a';
        return L.divIcon({
          html: `<div style="
            width:${size}px;height:${size}px;
            background:${bg};
            border:2.5px solid white;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
            color:white;font-weight:bold;font-size:${size > 40 ? 14 : 12}px;
            box-shadow:0 2px 10px rgba(0,0,0,0.4);
          ">${count}</div>`,
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size / 2],
        });
      },
    });

    // Tambahkan marker ke cluster
    markers.forEach((marker) => {
      if (!marker.lat || !marker.lng) return;
      const color = getDamageColor(marker.type);
      const radius = getSeveritySize(marker.severity);
      const isOwn = marker.is_own || (currentUserId && marker.petugas_user_id === currentUserId);
      const isOtherVerified = !isOwn && (marker.status === 'verified' || marker.status === 'repaired');
      const borderColor = isOtherVerified ? '#22d3ee' : 'white';
      const markerShadow = isOtherVerified
        ? '0 0 0 3px rgba(34,211,238,0.35),0 2px 10px rgba(0,0,0,0.55)'
        : '0 1px 6px rgba(0,0,0,0.5)';
      const icon = L.divIcon({
        html: `<div style="
          width:${radius * 2 + 4}px;height:${radius * 2 + 4}px;
          background:${color};
          border:${isOtherVerified ? 3 : 2}px solid ${borderColor};
          border-radius:50%;
          box-shadow:${markerShadow};
          opacity:${theme.markerFillOpacity};
        "></div>`,
        className: '',
        iconSize: [radius * 2 + 4, radius * 2 + 4],
        iconAnchor: [radius + 2, radius + 2],
      });

      const m = L.marker([marker.lat, marker.lng], { icon });
      const severityColor = marker.severity === 'high' ? '#dc2626' : marker.severity === 'medium' ? '#d97706' : '#16a34a';
      const statusColor   = marker.status === 'repaired' ? '#16a34a' : marker.status === 'verified' ? '#2563eb' : '#d97706';

      m.bindPopup(`
        <div style="font-family:sans-serif;min-width:220px;padding:4px">
          ${marker.image_url ? `<div style="margin:-8px -8px 10px"><img src="${marker.image_url}" class="rdd-popup-img" onclick="window.__rddOpenFullscreen && window.__rddOpenFullscreen(this.src)" onerror="window.__rddImgRetry && window.__rddImgRetry(this)" title="Klik untuk perbesar" style="width:100%;height:130px;object-fit:cover;border-radius:6px 6px 0 0;display:block"/></div>` : ''}
          <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
            <h3 style="margin:0;color:${color};font-weight:bold;font-size:14px">${marker.type}</h3>
            <span style="padding:2px 8px;border-radius:12px;font-size:11px;font-weight:bold;background:${severityColor};color:white">${(marker.severity || '').toUpperCase()}</span>
          </div>
          <div style="font-size:12px;line-height:2">
            <div style="display:flex;justify-content:space-between">
              <span style="color:#6b7280">Status</span>
              <span style="padding:1px 8px;border-radius:10px;font-size:11px;font-weight:bold;background:${statusColor};color:white">${(marker.status || '').toUpperCase()}</span>
            </div>
            <div style="display:flex;justify-content:space-between">
              <span style="color:#6b7280">Confidence</span>
              <span style="font-weight:600;color:${color}">${(marker.confidence * 100).toFixed(1)}%</span>
            </div>
            ${marker.petugas_name ? `<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Petugas Lapangan</span><span style="font-weight:600">${marker.petugas_name}</span></div>` : ''}
            ${marker.repaired_by_name ? `<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Tim Perbaikan</span><span style="font-weight:600;color:#d97706">${marker.repaired_by_name}</span></div>` : ''}
            ${marker.repaired_at ? `<div style="display:flex;justify-content:space-between"><span style="color:#6b7280">Waktu Perbaikan</span><span style="font-weight:600;color:#059669;font-size:11px">${marker.repaired_at}</span></div>` : ''}
            ${isOtherVerified ? `<div style="margin-top:6px;padding:5px 7px;background:#ecfeff;color:#0891b2;border-radius:6px;font-size:11px;font-weight:700;text-align:center">Marker Petugas Lain</div>` : ''}
          </div>
          ${onRepairClick && marker.status === 'verified' ? `<button class="repair-report-btn" data-marker-id="${marker.id}" style="width:100%;margin-top:8px;text-align:center;padding:7px;background:#16a34a;color:white;border:0;border-radius:6px;font-size:11px;font-weight:700;cursor:pointer">✓ Lapor Sudah Diperbaiki</button>` : ''}
          <a href="https://www.google.com/maps/search/?api=1&query=${marker.lat.toFixed(8)},${marker.lng.toFixed(8)}" target="_blank" style="display:block;margin-top:8px;text-align:center;padding:5px;background:#2563eb;color:white;border-radius:6px;font-size:11px;font-weight:600;text-decoration:none">🗺 Buka di Google Maps</a>
        </div>
      `, { maxWidth: 280, minWidth: 240 });

      if (onRepairClick) {
        m.on('popupopen', () => {
          const btn = document.querySelector(`.repair-report-btn[data-marker-id="${marker.id}"]`);
          if (btn) btn.onclick = () => onRepairClick(marker);
        });
      }

      cluster.addLayer(m);
    });

    cluster.addTo(map);
    clusterRef.current = cluster;

    return () => {
      if (clusterRef.current) {
        map.removeLayer(clusterRef.current);
        clusterRef.current = null;
      }
    };
  }, [map, markers, theme, onRepairClick, currentUserId]);

  return null;
};

// Sub-komponen: fly ke user saat pertama kali dapat lokasi
const FlyToUser = ({ position }) => {
  const map = useMap();
  const flewRef = useRef(false);
  useEffect(() => {
    if (position && !flewRef.current) {
      flewRef.current = true;
      map.flyTo([position.lat, position.lng], 15, { duration: 1.5 });
    }
  }, [position, map]);
  return null;
};

// Komponen utama marker lokasi user
const UserLocationMarker = ({ position, accuracy }) => {
  const userLocIcon = useMemo(() => createUserLocationIcon(), []);
  if (!position) return null;
  return (
    <React.Fragment>
      {/* Lingkaran akurasi GPS */}
      {accuracy && accuracy < 500 && (
        <CircleMarker
          center={[position.lat, position.lng]}
          radius={Math.min(accuracy / 3, 60)}
          fillColor="#3b82f6"
          fillOpacity={0.08}
          color="#3b82f6"
          weight={1}
          opacity={0.4}
          interactive={false}
        />
      )}
      {/* Marker titik lokasi */}
      <Marker position={[position.lat, position.lng]} icon={userLocIcon}>
        <Popup maxWidth={220}>
          <div style={{ fontFamily: 'sans-serif', padding: '4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontWeight: 'bold', fontSize: '13px', color: '#1d4ed8' }}>Lokasi Saya</span>
            </div>
            <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '4px' }}>📍 Koordinat GPS</div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', fontWeight: '600', color: '#111827', marginBottom: '8px' }}>
              {position.lat.toFixed(6)}, {position.lng.toFixed(6)}
            </div>
            {accuracy && (
              <div style={{ fontSize: '11px', color: '#6b7280', marginBottom: '8px' }}>
                Akurasi: ±{Math.round(accuracy)} meter
              </div>
            )}
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${position.lat.toFixed(7)},${position.lng.toFixed(7)}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'block', textAlign: 'center', padding: '5px 8px',
                background: '#2563eb', color: 'white', borderRadius: '6px',
                fontSize: '11px', fontWeight: '600', textDecoration: 'none',
              }}
            >
              🗺 Buka di Google Maps
            </a>
          </div>
        </Popup>
      </Marker>
      <FlyToUser position={position} />
    </React.Fragment>
  );
};

// ============ KOMPONEN DESELECT KLIK PETA ============
// Klik area kosong peta (bukan garis/marker) → batalkan seleksi rute
const MapClickDeselect = ({ onDeselect }) => {
  useMapEvents({
    click: () => {
      onDeselect();
    },
  });
  return null;
};

// ============ KOMPONEN FOKUS MARKER ============
const FocusMarkerHandler = ({ focusMarkerId, markers, routePaths, liveTracking }) => {
  const map = useMap();
  useEffect(() => {
    if (!focusMarkerId) return;
    const targetId = String(focusMarkerId);
    
    // Cari marker di semua sumber data
    let target = markers.find(m => String(m.id) === targetId);
    
    if (!target) {
      for (const route of routePaths) {
        if (route.damages) {
          target = route.damages.find(m => String(m.id) === targetId);
          if (target) break;
        }
      }
    }
    
    if (!target) {
      for (const session of liveTracking) {
        if (session.damages) {
          target = session.damages.find(m => String(m.id) === targetId);
          if (target) break;
        }
      }
    }

    if (target && target.latitude && target.longitude) {
      // Zoom in ke marker dengan animasi
      map.flyTo([target.latitude, target.longitude], 19, {
        animate: true,
        duration: 1.5
      });
    }
  }, [focusMarkerId, markers, routePaths, liveTracking, map]);

  return null;
};

// ============ KOMPONEN UTAMA PETA ============
const RoadDamageMap = ({
  markers = [],
  routePaths = [],
  liveTracking = [],
  selectedArea = null,
  mapMode = 'dark',
  selectedRuas = null,
  onRuasListLoaded,
  filters = {},
  userLocation = null,   // { lat, lng, accuracy }
  onRepairClick = null,
  currentUserId = null,
  focusMarkerId = null,
  onDeleteSession = null,
}) => {
  const petugasColors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#f97316', '#ec4899'];
  const theme = THEMES[mapMode] || THEMES.dark;
  const tile = TILE_LAYERS[mapMode] || TILE_LAYERS.dark;

  // State: ID rute yang sedang dipilih admin (null = tidak ada)
  const [selectedRouteId, setSelectedRouteId] = useState(null);
  // State: Info rute untuk floating panel
  const [selectedRouteInfo, setSelectedRouteInfo] = useState(null);

  const selectRoute = (id, info) => {
    if (selectedRouteId === id) {
      setSelectedRouteId(null);
      setSelectedRouteInfo(null);
    } else {
      setSelectedRouteId(id);
      setSelectedRouteInfo(info);
    }
  };

  const deselectRoute = () => {
    setSelectedRouteId(null);
    setSelectedRouteInfo(null);
  };

  // Buat ikon per warna dalam dua ukuran: normal dan highlighted (berubah jadi mini badges elegan)
  const makeRouteIcons = (color, highlighted = false) => {
    const size = highlighted ? 28 : 22;
    const shadow = highlighted
      ? `0 0 0 3px ${color}40, 0 4px 12px rgba(0,0,0,0.6)`
      : '0 2px 6px rgba(0,0,0,0.5)';
    const anchor = size / 2;
    return {
      start: L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;background:${color};
          border:2px solid white;border-radius:50%;
          box-shadow:${shadow};
          display:flex;align-items:center;justify-content:center;
          font-size:${highlighted ? 13 : 11}px;font-weight:900;color:white;
          transition:all 0.2s;
        ">A</div>`,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
      }),
      end: L.divIcon({
        className: '',
        html: `<div style="
          width:${size}px;height:${size}px;background:${color};
          border:2px solid white;border-radius:50%;
          box-shadow:${shadow};
          display:flex;align-items:center;justify-content:center;
          font-size:${highlighted ? 13 : 11}px;font-weight:900;color:white;
          transition:all 0.2s;
        ">B</div>`,
        iconSize: [size, size],
        iconAnchor: [anchor, anchor],
      }),
    };
  };

  // Cache icon petugas per warna
  const petugasIcons = useMemo(() => {
    return petugasColors.map(color => createPetugasIcon(color));
  }, []);

  // Filter kerusakan sesuai filter aktif (type, severity, status)
  const filterDamages = (damages) => {
    if (!damages || damages.length === 0) return [];
    return damages.filter(d => {
      if (filters.type && d.damage_type !== filters.type) return false;
      if (filters.severity && d.severity !== filters.severity) return false;
      if (filters.status && d.status !== filters.status) return false;
      return true;
    });
  };

  const hasSelection = selectedRouteId !== null;

  return (
    <div style={{ position: 'relative', height: '100%', width: '100%' }}>
    <MapContainer
      center={KUBU_RAYA_CENTER}
      zoom={DEFAULT_ZOOM}
      maxBounds={KUBU_RAYA_BOUNDS}
      maxBoundsViscosity={1.0}
      minZoom={10}
      maxZoom={MAX_ZOOM}
      className={`h-full w-full map-${mapMode}`}
      style={{ minHeight: '500px', height: '100%' }}
      // ── Optimasi performa ─────────────────────────────────────────
      // Canvas rendering jauh lebih cepat dari SVG untuk banyak marker
      preferCanvas={true}
      // Kurangi animasi zoom agar tidak terasa berat
      zoomAnimation={true}
      zoomAnimationThreshold={4}
      // Jangan re-render saat masih drag (hemat CPU)
      updateWhenIdle={false}
      updateWhenZooming={false}
    >
      {/* Set CSS class on map container */}
      <MapModeClass mapMode={mapMode} />

      {/* Klik di area kosong peta → batalkan seleksi rute */}
      <MapClickDeselect onDeselect={deselectRoute} />

      {/* Boundary Kubu Raya */}
      <KubuRayaBoundary mapMode={mapMode} />

      {/* Fly ke kecamatan yang dipilih */}
      <FlyToArea selectedArea={selectedArea} />

      {/* Highlight area kecamatan yang dipilih */}
      <HighlightKecamatan selectedArea={selectedArea} mapMode={mapMode} />

      {/* Tile Layer - berubah sesuai mode */}
      <TileLayer
        key={`tile-${mapMode}`}
        attribution={tile.attribution}
        url={tile.url}
        subdomains={tile.subdomains}
        maxZoom={MAX_ZOOM}
        keepBuffer={4}
        updateWhenIdle={true}
        updateWhenZooming={false}
      />

      {/* Jaringan Jalan Kubu Raya */}
      <KubuRayaRoads mapMode={mapMode} />

      {/* Ruas Jalan Kabupaten (SK Bupati) */}
      <RuasJalanLayer selectedRuas={selectedRuas} mapMode={mapMode} onRuasListLoaded={onRuasListLoaded} />

      {/* ====== RUTE TRACKING YANG SUDAH SELESAI ====== */}
      {routePaths.map((route, index) => {
        const routeId = route.id || index;
        const isSelected = selectedRouteId === routeId;
        const isDimmed  = hasSelection && !isSelected;
        const color     = route.color || (() => {
          if (route.user_id || route.user?.id) {
            const uid = Number(route.user_id || route.user.id);
            if (!isNaN(uid) && uid > 0) return petugasColors[(uid - 1) % petugasColors.length];
          }
          const str = String(route.userName || route.id || 'petugas');
          let hash = 0;
          for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          return petugasColors[Math.abs(hash) % petugasColors.length];
        })();
        const rIcons    = makeRouteIcons(color, isSelected);

        // Opacity garis: dipilih=terang namun tidak menutupi, tidak dipilih=redup ber-glow
        const lineOpacity    = isDimmed ? 0.12 : isSelected ? 0.50 : 0.40;
        const lineWeight     = isSelected ? 4   : 3;
        const glowOpacity    = isSelected ? 0.35 : 0.15;
        const markerOpacity  = isDimmed ? 0.25 : 1;

        return (
        <React.Fragment key={`route-done-${routeId}`}>
          {/* Lapisan GLOW bloom (outer glow, selalu ada agar keren tapi transparan) */}
          {route.path && route.path.length > 1 && !isDimmed && (
            <Polyline
              positions={route.path.map(p => [p.lat, p.lng])}
              color={color}
              weight={isSelected ? 5 : 4}
              opacity={isSelected ? 0.28 : 0.18}
              smoothFactor={5}
              interactive={false}
            />
          )}

          {/* Garis rute GPS utama — klik untuk pilih/deselect */}
          {route.path && route.path.length > 1 && (
            <Polyline
              positions={route.path.map(p => [p.lat, p.lng])}
              color={color}
              weight={lineWeight}
              opacity={lineOpacity}
              smoothFactor={5}
              eventHandlers={{
                click: (e) => {
                  L.DomEvent.stopPropagation(e);
                  selectRoute(routeId, { color, route });
                },
              }}
            />
          )}

          {/* Garis target A→B (Ruas Jalan) - Langsung tampil selalu */}
          {route.start_point && route.end_point && (
            <RouteTargetLine
              startPoint={route.start_point}
              endPoint={route.end_point}
              color={color}
              isSelected={isSelected}
            />
          )}

          {/* Marker titik mulai (A) — SELALU tampil di peta */}
          {route.start_point && (
            <Marker
              position={[route.start_point.lat, route.start_point.lng]}
              icon={rIcons.start}
              opacity={markerOpacity}
              eventHandlers={{ click: (e) => {
                L.DomEvent.stopPropagation(e);
                selectRoute(routeId, { color, route });
              }}}
            />
          )}

          {/* Marker titik akhir (B) — SELALU tampil di peta */}
          {route.end_point && (
            <Marker
              position={[route.end_point.lat, route.end_point.lng]}
              icon={rIcons.end}
              opacity={markerOpacity}
              eventHandlers={{ click: (e) => {
                L.DomEvent.stopPropagation(e);
                selectRoute(routeId, { color, route });
              }}}
            />
          )}

          {/* Marker kerusakan — dimmed jika rute lain dipilih */}
          {filterDamages(route.damages || []).map((damage) => (
            damage.latitude && damage.longitude && (
              <CircleMarker
                key={`done-dmg-${damage.id}`}
                center={[damage.latitude, damage.longitude]}
                radius={getSeveritySize(damage.severity)}
                fillColor={getDamageColor(damage.damage_type)}
                color={theme.markerBorder}
                weight={2}
                opacity={1}
                fillOpacity={theme.markerFillOpacity}
              >
                <Popup maxWidth={280} minWidth={260}>
                  <div style={{ fontFamily: 'sans-serif', padding: '2px' }}>
                    {/* Gambar kerusakan */}
                    {damage.image_url && (
                      <div style={{ margin: '-8px -8px 10px -8px' }}>
                        <RetryImage
                          src={damage.image_url}
                          alt={damage.damage_type}
                          title="Klik untuk perbesar"
                          onClick={() => window.__rddOpenFullscreen && window.__rddOpenFullscreen(damage.image_url)}
                          style={{ width: '100%', height: '160px', objectFit: 'cover', borderRadius: '6px 6px 0 0', display: 'block', cursor: 'zoom-in', transition: 'opacity 0.15s' }}
                          onMouseOver={e => e.currentTarget.style.opacity = '0.88'}
                          onMouseOut={e => e.currentTarget.style.opacity = '1'}
                        />
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h3 style={{ margin: 0, color: getDamageColor(damage.damage_type), fontWeight: 'bold', fontSize: '15px' }}>
                        {damage.damage_type}
                      </h3>
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '11px', fontWeight: 'bold',
                        background: damage.severity === 'high' ? '#dc2626' : damage.severity === 'medium' ? '#d97706' : '#16a34a',
                        color: 'white',
                      }}>
                        {damage.severity?.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.8' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e5e7eb', paddingBottom: '4px', marginBottom: '4px' }}>
                        <span style={{ color: '#6b7280' }}>Status</span>
                        <span style={{
                          padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 'bold',
                          background: damage.status === 'repaired' ? '#16a34a' : damage.status === 'verified' ? '#2563eb' : '#d97706',
                          color: 'white',
                        }}>
                          {damage.status?.toUpperCase()}
                        </span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Petugas</span>
                        <span style={{ fontWeight: '600' }}>{route.userName}</span>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>Confidence</span>
                        <span style={{ fontWeight: '600', color: getDamageColor(damage.damage_type) }}>
                          {(damage.confidence * 100).toFixed(1)}%
                        </span>
                      </div>
                      {route.ruas_jalan_name && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Ruas</span>
                          <span style={{ fontWeight: '600', fontSize: '11px', maxWidth: '140px', textAlign: 'right' }}>{route.ruas_jalan_name}</span>
                        </div>
                      )}
                      {damage.created_at && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Waktu</span>
                          <span style={{ fontWeight: '600', fontSize: '11px' }}>
                            {new Date(damage.created_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      )}
                      <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}
                        onClick={() => navigator.clipboard?.writeText(`${damage.latitude.toFixed(7)}, ${damage.longitude.toFixed(7)}`)}
                        title="Klik untuk salin koordinat"
                      >
                        <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>📍 Koordinat (klik untuk salin)</div>
                        <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                          {damage.latitude.toFixed(7)}, {damage.longitude.toFixed(7)}
                        </div>
                      </div>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${damage.latitude.toFixed(8)},${damage.longitude.toFixed(8)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'block', marginTop: '8px', textAlign: 'center',
                          padding: '5px', background: '#2563eb', color: 'white',
                          borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                          textDecoration: 'none',
                        }}
                      >
                        🗺 Buka di Google Maps
                      </a>
                    </div>
                  </div>
                </Popup>
              </CircleMarker>
            )
          ))}
        </React.Fragment>
        );
      })}

      {/* ====== LIVE TRACKING ====== */}
      {liveTracking.map((session, index) => {
        const color = session.color || (() => {
          if (session.user_id || session.user?.id) {
            const uid = Number(session.user_id || session.user.id);
            if (!isNaN(uid) && uid > 0) return petugasColors[(uid - 1) % petugasColors.length];
          }
          const str = String(session.user?.name || session.id || 'petugas');
          let hash = 0;
          for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
          return petugasColors[Math.abs(hash) % petugasColors.length];
        })();
        const petugasIcon = petugasIcons[index % petugasColors.length];
        const liveRIcons = makeRouteIcons(color, selectedRouteId === session.id);
        const routePath = session.route_path || [];
        const lastPos = session.last_position;
        const startPoint = session.start_point;
        const endPoint = session.end_point;
        const isLiveSelected = selectedRouteId === session.id;

        return (
          <React.Fragment key={`live-${session.id}`}>
            {/* Garis rute realtime - klik untuk lihat/hapus */}
            {routePath.length > 1 && (
              <>
                <Polyline
                  positions={routePath.map(p => [p.lat, p.lng])}
                  color={color}
                  weight={5}
                  opacity={0.25}
                  smoothFactor={5}
                  interactive={false}
                />
                <Polyline
                  positions={routePath.map(p => [p.lat, p.lng])}
                  color={color}
                  weight={isLiveSelected ? 3.5 : 2.5}
                  opacity={isLiveSelected ? 0.9 : 0.7}
                  smoothFactor={5}
                  eventHandlers={{
                    click: () => setSelectedRouteId(isLiveSelected ? null : session.id),
                  }}
                >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '150px' }}>
                    <h3 style={{ color, fontWeight: 'bold', margin: '0 0 5px 0' }}>
                      {session.user?.name || 'Petugas Aktif'}
                    </h3>
                    {session.ruas_jalan_name && (
                      <p style={{ margin: '2px 0', fontSize: '12px', color: theme.popupSubText }}>
                        <strong>Ruas:</strong> {session.ruas_jalan_name}
                      </p>
                    )}
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Status:</strong> Sedang Tracking
                    </p>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id, session.user?.name);
                        }}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}
                      >
                        🗑️ Hapus Titik / Rute Ini
                      </button>
                    )}
                  </div>
                </Popup>
              </Polyline>
              </>
            )}

            {/* Garis target A→B untuk Live Tracking - Langsung tampil */}
            {startPoint && endPoint && (
              <RouteTargetLine
                startPoint={startPoint}
                endPoint={endPoint}
                color={color}
                isSelected={isLiveSelected}
              />
            )}

            {/* Marker titik mulai (A) — SELALU tampil di peta */}
            {startPoint && (
              <Marker
                position={[startPoint.lat, startPoint.lng]}
                icon={liveRIcons.start}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '140px' }}>
                    <p style={{ fontWeight: 'bold', color: color, margin: '0 0 4px' }}>Titik Mulai (A)</p>
                    {session.ruas_jalan_name && (
                      <p style={{ fontSize: '12px', margin: '2px 0' }}>{session.ruas_jalan_name}</p>
                    )}
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>
                      {startPoint.lat.toFixed(6)}, {startPoint.lng.toFixed(6)}
                    </p>
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>Petugas: {session.user?.name}</p>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id, session.user?.name);
                        }}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}
                      >
                        🗑️ Hapus Titik / Rute Ini
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marker titik akhir (B) — SELALU tampil di peta */}
            {endPoint && (
              <Marker
                position={[endPoint.lat, endPoint.lng]}
                icon={liveRIcons.end}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '140px' }}>
                    <p style={{ fontWeight: 'bold', color: color, margin: '0 0 4px' }}>Titik Akhir (B)</p>
                    {session.ruas_jalan_name && (
                      <p style={{ fontSize: '12px', margin: '2px 0' }}>{session.ruas_jalan_name}</p>
                    )}
                    <p style={{ fontSize: '11px', color: theme.popupMuted }}>
                      {endPoint.lat.toFixed(6)}, {endPoint.lng.toFixed(6)}
                    </p>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id, session.user?.name);
                        }}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}
                      >
                        🗑️ Hapus Titik / Rute Ini
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Marker posisi petugas saat ini (SELALU TAMPIL) */}
            {lastPos && (
              <Marker
                position={[lastPos.lat, lastPos.lng]}
                icon={petugasIcon}
                eventHandlers={{
                  click: () => setSelectedRouteId(isLiveSelected ? null : session.id),
                }}
              >
                <Popup>
                  <div style={{ color: theme.popupText, minWidth: '150px' }}>
                    <h3 style={{ color, fontWeight: 'bold', margin: '0 0 5px 0' }}>
                      {session.user?.name || 'Petugas'}
                    </h3>
                    {session.ruas_jalan_name && (
                      <p style={{ margin: '2px 0', fontSize: '12px', color: theme.popupSubText }}>
                        <strong>Ruas:</strong> {session.ruas_jalan_name}
                      </p>
                    )}
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Status:</strong> Sedang Tracking
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '12px' }}>
                      <strong>Kerusakan:</strong> {session.total_damages || 0} terdeteksi
                    </p>
                    <p style={{ margin: '2px 0', fontSize: '11px', color: theme.popupMuted }}>
                      {lastPos.lat.toFixed(6)}, {lastPos.lng.toFixed(6)}
                    </p>
                    {onDeleteSession && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteSession(session.id, session.user?.name);
                        }}
                        style={{
                          marginTop: '8px',
                          width: '100%',
                          padding: '6px 10px',
                          background: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 'bold',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '5px',
                        }}
                      >
                        🗑️ Hapus Titik / Rute Ini
                      </button>
                    )}
                  </div>
                </Popup>
              </Marker>
            )}

            {filterDamages(session.damages || []).map((damage) => (
              damage.latitude && damage.longitude && (
                <CircleMarker
                  key={`live-dmg-${damage.id}`}
                  center={[damage.latitude, damage.longitude]}
                  radius={10}
                  fillColor={getDamageColor(damage.damage_type)}
                  color={theme.markerBorder}
                  weight={2}
                  opacity={1}
                  fillOpacity={0.9}
                >
                  <Popup maxWidth={260} minWidth={240}>
                    <div style={{ fontFamily: 'sans-serif', padding: '2px' }}>
                      {/* Badge live */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
                        <span style={{ fontSize: '10px', fontWeight: 'bold', color: '#16a34a', textTransform: 'uppercase' }}>Live — Baru Terdeteksi</span>
                      </div>

                      <h3 style={{ margin: '0 0 8px', color: getDamageColor(damage.damage_type), fontWeight: 'bold', fontSize: '15px' }}>
                        {damage.damage_type}
                      </h3>

                      <div style={{ fontSize: '12px', color: '#374151', lineHeight: '1.8' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Petugas</span>
                          <span style={{ fontWeight: '600' }}>{session.user?.name}</span>
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span style={{ color: '#6b7280' }}>Confidence</span>
                          <span style={{ fontWeight: '600', color: getDamageColor(damage.damage_type) }}>
                            {(damage.confidence * 100).toFixed(1)}%
                          </span>
                        </div>
                        {session.ruas_jalan_name && (
                          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                            <span style={{ color: '#6b7280' }}>Ruas</span>
                            <span style={{ fontWeight: '600', fontSize: '11px', maxWidth: '140px', textAlign: 'right' }}>{session.ruas_jalan_name}</span>
                          </div>
                        )}
                        <div style={{ marginTop: '6px', padding: '6px 8px', background: '#f3f4f6', borderRadius: '6px', cursor: 'pointer' }}
                          onClick={() => navigator.clipboard?.writeText(`${damage.latitude.toFixed(7)}, ${damage.longitude.toFixed(7)}`)}
                          title="Klik untuk salin koordinat"
                        >
                          <div style={{ color: '#6b7280', fontSize: '10px', marginBottom: '2px' }}>📍 Koordinat (klik untuk salin)</div>
                          <div style={{ fontFamily: 'monospace', fontSize: '11px', fontWeight: '600', color: '#1f2937' }}>
                            {damage.latitude.toFixed(7)}, {damage.longitude.toFixed(7)}
                          </div>
                        </div>
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${damage.latitude.toFixed(8)},${damage.longitude.toFixed(8)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'block', marginTop: '8px', textAlign: 'center',
                            padding: '5px', background: '#2563eb', color: 'white',
                            borderRadius: '6px', fontSize: '11px', fontWeight: '600',
                            textDecoration: 'none',
                          }}
                        >
                          🗺 Buka di Google Maps
                        </a>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              )
            ))}
          </React.Fragment>
        );
      })}

      {/* ====== FOKUS KE MARKER SPESIFIK (JIKA ADA) ====== */}
      {focusMarkerId && (
        <FocusMarkerHandler
          focusMarkerId={focusMarkerId}
          markers={markers}
          routePaths={routePaths}
          liveTracking={liveTracking}
        />
      )}

      {/* ====== LOKASI USER (Saya) ====== */}
      {userLocation && (
        <UserLocationMarker
          position={{ lat: userLocation.lat, lng: userLocation.lng }}
          accuracy={userLocation.accuracy}
        />
      )}

      {/* ====== MARKER KERUSAKAN TERSIMPAN (dengan clustering) ====== */}
      <DamageClusterLayer
        markers={markers}
        getDamageColor={getDamageColor}
        getSeveritySize={getSeveritySize}
        theme={theme}
        onRepairClick={onRepairClick}
        currentUserId={currentUserId}
      />
    </MapContainer>

      {/* ===== FLOATING INFO PANEL ===== */}
      {/* Muncul di pojok kiri-bawah peta, tidak menutupi marker/garis */}
      {selectedRouteInfo && (() => {
        const r = selectedRouteInfo.route;
        const col = selectedRouteInfo.color;
        const dark = mapMode === 'dark';
        const txtPrimary = dark ? '#f1f5f9' : '#0f172a';
        const txtMuted   = dark ? '#94a3b8' : '#64748b';
        const bgCard     = dark ? 'rgba(15,23,42,0.93)' : 'rgba(255,255,255,0.96)';

        // Hitung panjang rute GPS (Haversine)
        const haversine = (a, b) => {
          const R = 6371000;
          const dLat = (b.lat - a.lat) * Math.PI / 180;
          const dLng = (b.lng - a.lng) * Math.PI / 180;
          const s = Math.sin(dLat/2)**2 + Math.cos(a.lat*Math.PI/180)*Math.cos(b.lat*Math.PI/180)*Math.sin(dLng/2)**2;
          return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
        };
        const path = r.path || [];
        let gpsDistM = 0;
        for (let i = 1; i < path.length; i++) gpsDistM += haversine(path[i-1], path[i]);
        const formatDist = (m) => m >= 1000 ? `${(m/1000).toFixed(2)} km` : `${Math.round(m)} m`;

        // Jarak lurus A→B
        let straightDistM = 0;
        if (r.start_point && r.end_point) straightDistM = haversine(r.start_point, r.end_point);

        return (
          <div
            style={{
              position: 'absolute',
              bottom: '32px',
              left: '16px',
              zIndex: 1000,
              background: bgCard,
              backdropFilter: 'blur(14px)',
              border: `1.5px solid ${col}44`,
              borderRadius: '16px',
              padding: '14px 16px',
              minWidth: '230px',
              maxWidth: '280px',
              boxShadow: `0 6px 28px rgba(0,0,0,0.4), 0 0 0 1px ${col}22`,
              pointerEvents: 'auto',
              animation: 'fadeSlideUp 0.2s ease',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header nama petugas + tombol tutup */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{
                  width: '10px', height: '10px', borderRadius: '50%',
                  background: col, flexShrink: 0,
                  boxShadow: `0 0 6px ${col}`,
                }} />
                <span style={{ fontWeight: '700', color: txtPrimary, fontSize: '14px' }}>
                  {r.userName || 'Petugas'}
                </span>
              </div>
              <button
                onClick={deselectRoute}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: txtMuted, fontSize: '18px', lineHeight: 1, padding: '0 2px' }}
                title="Tutup"
              >×</button>
            </div>

            {/* Ruas jalan */}
            {r.ruas_jalan_name && (
              <div style={{ fontSize: '11px', color: txtMuted, marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>📍</span><span>{r.ruas_jalan_name}</span>
              </div>
            )}

            {/* Divider */}
            <div style={{ height: '1px', background: `${col}33`, margin: '0 0 10px 0' }} />

            {/* Titik A */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', alignItems: 'flex-start' }}>
              <span style={{
                background: col, color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '900', flexShrink: 0, marginTop: '1px',
              }}>A</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: txtPrimary }}>Titik Mulai</div>
                {r.start_point ? (
                  <div style={{ fontSize: '10px', color: txtMuted }}>
                    {Number(r.start_point.lat).toFixed(5)}, {Number(r.start_point.lng).toFixed(5)}
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: txtMuted }}>—</div>
                )}
              </div>
            </div>

            {/* Titik B */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '10px', alignItems: 'flex-start' }}>
              <span style={{
                background: col, color: 'white', borderRadius: '50%', width: '20px', height: '20px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: '900', flexShrink: 0, marginTop: '1px',
              }}>B</span>
              <div>
                <div style={{ fontSize: '11px', fontWeight: '600', color: txtPrimary }}>Titik Akhir</div>
                {r.end_point ? (
                  <div style={{ fontSize: '10px', color: txtMuted }}>
                    {Number(r.end_point.lat).toFixed(5)}, {Number(r.end_point.lng).toFixed(5)}
                  </div>
                ) : (
                  <div style={{ fontSize: '10px', color: txtMuted }}>—</div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div style={{ height: '1px', background: `${col}33`, margin: '0 0 10px 0' }} />

            {/* Info Kerusakan */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
              <div style={{ fontSize: '10px', color: txtMuted, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Kerusakan Ditemukan</div>
              <div style={{ fontSize: '14px', fontWeight: '800', color: (r.damages||[]).length > 0 ? '#ef4444' : txtPrimary }}>{(r.damages||[]).length} titik</div>
            </div>

            {/* Tombol Hapus */}
            {onDeleteSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(r.id || selectedRouteId, r.userName);
                  deselectRoute();
                }}
                style={{
                  width: '100%',
                  padding: '8px 10px',
                  background: 'linear-gradient(135deg, #ef4444, #dc2626)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '9px',
                  fontSize: '12px',
                  fontWeight: 'bold',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  boxShadow: '0 2px 10px rgba(239,68,68,0.4)',
                }}
              >
                🗑️ Hapus Rute Ini
              </button>
            )}
          </div>
        );
      })()}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default RoadDamageMap;
