import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../contexts/ThemeContext';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const KUBU_RAYA_CENTER = [-0.0917, 109.3717];
const KUBU_RAYA_BOUNDS = [[-1.05, 109.00], [0.30, 110.00]];

// Ambil rute mengikuti jalan dari OSRM (gratis, pakai OpenStreetMap)
const fetchRoadRoute = async (start, end) => {
  try {
    const url = `https://router.project-osrm.org/route/v1/driving/${start.lng},${start.lat};${end.lng},${end.lat}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.code === 'Ok' && data.routes.length > 0) {
      return data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
    }
  } catch (e) {
    console.error('OSRM routing error:', e);
  }
  return null;
};

// Icon titik mulai (hijau)
const startIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;
    background:#22c55e;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:12px;font-weight:bold;color:white;
  ">A</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Icon titik akhir (merah)
const endIcon = L.divIcon({
  className: '',
  html: `<div style="
    width:28px;height:28px;
    background:#ef4444;
    border:3px solid white;
    border-radius:50%;
    box-shadow:0 2px 8px rgba(0,0,0,0.5);
    display:flex;align-items:center;justify-content:center;
    font-size:12px;font-weight:bold;color:white;
  ">B</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Icon posisi petugas saat ini (biru berkedip)
const myLocationIcon = L.divIcon({
  className: '',
  html: `
    <div style="position:relative;width:36px;height:36px;">
      <div style="
        position:absolute;inset:0;
        background:rgba(59,130,246,0.25);
        border-radius:50%;
        animation:ripple 1.8s ease-out infinite;
      "></div>
      <div style="
        position:absolute;top:50%;left:50%;
        transform:translate(-50%,-50%);
        width:16px;height:16px;
        background:#3b82f6;
        border:3px solid white;
        border-radius:50%;
        box-shadow:0 2px 6px rgba(0,0,0,0.4);
      "></div>
    </div>
    <style>
      @keyframes ripple {
        0% { transform: scale(0.5); opacity: 0.8; }
        100% { transform: scale(2.2); opacity: 0; }
      }
    </style>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Komponen untuk fly ke posisi petugas saat modal pertama dibuka
const FlyToMyLocation = ({ location, shouldFly }) => {
  const map = useMap();
  const hasFlewRef = useRef(false);

  useEffect(() => {
    if (shouldFly && location?.lat && location?.lng && !hasFlewRef.current) {
      map.flyTo([location.lat, location.lng], 16, { duration: 1.2 });
      hasFlewRef.current = true;
    }
  }, [location?.lat, location?.lng, shouldFly]);

  return null;
};

// Komponen untuk menangkap klik peta
const MapClickHandler = ({ step, onStartSet, onEndSet }) => {
  useMapEvents({
    click(e) {
      const { lat, lng } = e.latlng;
      if (step === 'start') {
        onStartSet({ lat, lng });
      } else if (step === 'end') {
        onEndSet({ lat, lng });
      }
    },
  });
  return null;
};

// Komponen untuk set max bounds
const BoundsController = () => {
  const map = useMap();
  useEffect(() => {
    map.setMaxBounds(KUBU_RAYA_BOUNDS);
    map.setMinZoom(10);
  }, [map]);
  return null;
};

// ── Batas Wilayah Kubu Raya ──
// Memuat kuburaya-boundary.json dan render sebagai polygon garis tepi
const KubuRayaBoundaryLayer = () => {
  const map = useMap();
  const layerRef = useRef(null);

  useEffect(() => {
    fetch('/kuburaya-boundary.json')
      .then(res => res.json())
      .then(data => {
        if (layerRef.current) { map.removeLayer(layerRef.current); }

        const layer = L.geoJSON(data, {
          style: () => ({
            color: '#facc15',          // kuning terang
            weight: 3,
            opacity: 0.9,
            fillColor: '#facc15',
            fillOpacity: 0.05,         // hampir transparan, hanya hint warna
            dashArray: '10, 6',        // garis putus-putus agar terlihat sebagai batas
          }),
        });

        // Label "Wilayah Kubu Raya" di tengah
        layer.eachLayer(lyr => {
          if (lyr.getCenter) {
            try {
              const center = lyr.getCenter();
              const label = L.marker(center, {
                icon: L.divIcon({
                  className: '',
                  html: `<div style="
                    background: rgba(250,204,21,0.15);
                    border: 1px solid rgba(250,204,21,0.5);
                    color: #facc15;
                    font-size: 11px;
                    font-weight: 700;
                    padding: 3px 8px;
                    border-radius: 4px;
                    white-space: nowrap;
                    letter-spacing: 0.5px;
                    text-shadow: 0 1px 3px rgba(0,0,0,0.8);
                  ">📍 Wilayah Kubu Raya</div>`,
                  iconAnchor: [70, 10],
                }),
                interactive: false,
                zIndexOffset: -100,
              });
              label.addTo(map);
              // Simpan label agar bisa di-cleanup
              if (!layerRef._labels) layerRef._labels = [];
              layerRef._labels.push(label);
            } catch (e) {}
          }
        });

        layer.addTo(map);
        layerRef.current = layer;
      })
      .catch(err => console.warn('Boundary load failed:', err));

    return () => {
      if (layerRef.current && map.hasLayer(layerRef.current)) {
        map.removeLayer(layerRef.current);
      }
      if (layerRef._labels) {
        layerRef._labels.forEach(l => { try { map.removeLayer(l); } catch(e){} });
        layerRef._labels = [];
      }
    };
  }, [map]);

  return null;
};

// Komponen layer ruas jalan
const RuasJalanLayer = ({ selectedRuas, onRuasListLoaded }) => {
  const map = useMap();
  const [geoData, setGeoData] = useState(null);
  const allLayerRef = useRef(null);
  const highlightLayerRef = useRef(null);

  useEffect(() => {
    fetch('/kuburaya-ruas-jalan.json')
      .then(res => res.json())
      .then(data => {
        setGeoData(data);
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

  useEffect(() => {
    if (!geoData) return;
    if (allLayerRef.current) { map.removeLayer(allLayerRef.current); allLayerRef.current = null; }

    const layer = L.geoJSON(geoData, {
      filter: f => f.properties.folder === 'Nama & Nomor Ruas',
      style: () => ({
        color: '#fbbf24',
        weight: 2,
        opacity: selectedRuas ? 0.2 : 0.5,
        dashArray: '6, 4',
      }),
      onEachFeature: (feature, lyr) => {
        if (feature.properties.name) {
          lyr.bindTooltip(feature.properties.name, { sticky: true, direction: 'top', className: 'ruas-tooltip dark' });
        }
      },
    });
    layer.addTo(map);
    allLayerRef.current = layer;
    return () => { if (allLayerRef.current && map.hasLayer(allLayerRef.current)) map.removeLayer(allLayerRef.current); };
  }, [geoData, selectedRuas, map]);

  useEffect(() => {
    if (highlightLayerRef.current) { map.removeLayer(highlightLayerRef.current); highlightLayerRef.current = null; }
    if (!geoData || !selectedRuas) return;

    const feature = geoData.features.find(f => f.properties.name === selectedRuas && f.properties.folder === 'Nama & Nomor Ruas');
    if (!feature) return;

    const layer = L.geoJSON(feature, {
      style: () => ({ color: '#facc15', weight: 6, opacity: 1 }),
      onEachFeature: (feat, lyr) => {
        lyr.bindTooltip(feat.properties.name, { permanent: true, direction: 'center', className: 'ruas-highlight-tooltip dark' });
      },
    });
    layer.addTo(map);
    highlightLayerRef.current = layer;

    const bounds = layer.getBounds();
    if (bounds.isValid()) {
      map.flyToBounds(bounds, { duration: 1.2, padding: [40, 40], maxZoom: 15 });
    }
    return () => { if (highlightLayerRef.current && map.hasLayer(highlightLayerRef.current)) map.removeLayer(highlightLayerRef.current); };
  }, [selectedRuas, geoData, map]);

  return null;
};

/**
 * Modal untuk memilih titik mulai & akhir tracking di peta
 * Props:
 *   isOpen           - boolean
 *   onClose          - fn()
 *   onConfirm        - fn({ startPoint, endPoint, ruasJalanName })
 *   currentLocation  - { lat, lng } posisi petugas saat ini (dari GPS background)
 */
const MapPickerModal = ({ isOpen, onClose, onConfirm, currentLocation = null }) => {
  const { isDark } = useTheme();
  const [step, setStep] = useState('start'); // 'start' | 'end' | 'confirm'
  const [startPoint, setStartPoint] = useState(null);
  const [endPoint, setEndPoint] = useState(null);
  const [ruasList, setRuasList] = useState([]);
  const [selectedRuas, setSelectedRuas] = useState('');
  const [routePath, setRoutePath] = useState(null);   // array [{lat,lng}] dari OSRM
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeDistance, setRouteDistance] = useState(null); // jarak dalam meter
  const [routeDuration, setRouteDuration] = useState(null); // durasi dalam detik
  const [localMapMode, setLocalMapMode] = useState('dark'); // 'dark' | 'light'

  // Reset saat modal dibuka
  useEffect(() => {
    if (isOpen) {
      setStep('start');
      setStartPoint(null);
      setEndPoint(null);
      setSelectedRuas('');
      setRoutePath(null);
      setRouteDistance(null);
      setRouteDuration(null);
    }
  }, [isOpen]);

  const handleStartSet = (point) => {
    setStartPoint(point);
    setRoutePath(null);
    setStep('end');
  };

  const handleEndSet = async (point) => {
    setEndPoint(point);
    setStep('confirm');

    // Ambil rute mengikuti jalan dari OSRM
    setRouteLoading(true);
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${startPoint.lng},${startPoint.lat};${point.lng},${point.lat}?overview=full&geometries=geojson`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.code === 'Ok' && data.routes.length > 0) {
        const coords = data.routes[0].geometry.coordinates.map(([lng, lat]) => ({ lat, lng }));
        setRoutePath(coords);
        setRouteDistance(data.routes[0].distance);
        setRouteDuration(data.routes[0].duration);
      } else {
        // Fallback ke garis lurus jika OSRM gagal
        setRoutePath([startPoint, point]);
      }
    } catch (e) {
      console.error('OSRM error:', e);
      setRoutePath([startPoint, point]);
    }
    setRouteLoading(false);
  };

  const handleConfirm = () => {
    onConfirm({
      startPoint,
      endPoint,
      ruasJalanName: selectedRuas || null,
      routePath: routePath || null,
    });
  };

  const handleReset = () => {
    setStep('start');
    setStartPoint(null);
    setEndPoint(null);
    setRoutePath(null);
    setRouteDistance(null);
    setRouteDuration(null);
  };

  // Format jarak
  const formatDistance = (meters) => {
    if (!meters) return '';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${Math.round(meters)} m`;
  };

  // Hitung jarak lurus (Haversine) antara 2 titik koordinat {lat,lng} dalam meter
  const haversineDistance = (a, b) => {
    if (!a || !b || a.lat == null || b.lat == null) return null;
    const R = 6371000; // radius bumi (meter)
    const dLat = (b.lat - a.lat) * Math.PI / 180;
    const dLng = (b.lng - a.lng) * Math.PI / 180;
    const lat1 = a.lat * Math.PI / 180;
    const lat2 = b.lat * Math.PI / 180;
    const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
    return Math.round(2 * R * Math.asin(Math.sqrt(h)));
  };

  // Format jarak pendek: meter -> "350 m", "1.2 km"
  const formatDistanceShort = (meters) => {
    if (meters == null) return '';
    return meters >= 1000 ? `${(meters / 1000).toFixed(1)} km` : `${meters} m`;
  };

  if (!isOpen) return null;

  const stepInfo = {
    start: { label: 'Klik titik MULAI (A) di peta', color: '#22c55e', icon: 'A' },
    end:   { label: 'Klik titik AKHIR (B) di peta', color: '#ef4444', icon: 'B' },
    confirm: { label: 'Konfirmasi rute tracking', color: '#3b82f6', icon: '✓' },
  };

  const current = stepInfo[step];

  // Render via Portal ke document.body — bypass ancestor transform
  // PageTransition (App.jsx) yang membuat position:fixed jadi relatif
  // ke container, bukan viewport, terutama kelihatan di mobile
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px',
    }}>
      <div style={{
        background: isDark ? '#1a1a2e' : '#ffffff',
        border: isDark ? '1px solid #2d2d44' : '1px solid #e2e8f0',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '800px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '16px 20px', borderBottom: isDark ? '1px solid #2d2d44' : '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, color: isDark ? '#f1f1f1' : '#1e293b', fontSize: '18px', fontWeight: 'bold' }}>
              Tentukan Rute Inspeksi
            </h2>
            <p style={{ margin: '4px 0 0', color: isDark ? '#9ca3af' : '#64748b', fontSize: '13px' }}>
              Pilih titik mulai dan akhir ruas jalan yang akan diinspeksi
            </p>
          </div>
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: isDark ? '#9ca3af' : '#64748b', fontSize: '24px', cursor: 'pointer', lineHeight: 1 }}
          >×</button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: '12px 20px', background: isDark ? '#16213e' : '#f1f5f9', display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* Step A */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: startPoint ? '#22c55e' : (step === 'start' ? '#22c55e' : (isDark ? '#374151' : '#d1d5db')),
              border: '2px solid ' + (step === 'start' ? '#22c55e' : (startPoint ? '#22c55e' : (isDark ? '#4b5563' : '#cbd5e1'))),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'white',
            }}>A</div>
            <span style={{ color: startPoint ? '#22c55e' : (step === 'start' ? (isDark ? '#f1f1f1' : '#1e293b') : (isDark ? '#6b7280' : '#94a3b8')), fontSize: '13px' }}>
              Titik Mulai
            </span>
          </div>

          <div style={{ flex: 1, height: '2px', background: startPoint ? '#22c55e' : (isDark ? '#374151' : '#d1d5db'), borderRadius: '1px' }} />

          {/* Step B */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: endPoint ? '#ef4444' : (step === 'end' ? '#ef4444' : (isDark ? '#374151' : '#d1d5db')),
              border: '2px solid ' + (step === 'end' ? '#ef4444' : (endPoint ? '#ef4444' : (isDark ? '#4b5563' : '#cbd5e1'))),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'white',
            }}>B</div>
            <span style={{ color: endPoint ? '#ef4444' : (step === 'end' ? (isDark ? '#f1f1f1' : '#1e293b') : (isDark ? '#6b7280' : '#94a3b8')), fontSize: '13px' }}>
              Titik Akhir
            </span>
          </div>

          <div style={{ flex: 1, height: '2px', background: endPoint ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db'), borderRadius: '1px' }} />

          {/* Step Confirm */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: step === 'confirm' ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db'),
              border: '2px solid ' + (step === 'confirm' ? '#3b82f6' : (isDark ? '#4b5563' : '#cbd5e1')),
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '11px', fontWeight: 'bold', color: 'white',
            }}>✓</div>
            <span style={{ color: step === 'confirm' ? (isDark ? '#f1f1f1' : '#1e293b') : (isDark ? '#6b7280' : '#94a3b8'), fontSize: '13px' }}>
              Konfirmasi
            </span>
          </div>
        </div>

        {/* Instruksi aktif */}
        <div style={{
          padding: '10px 20px',
          background: current.color + '15',
          borderLeft: `3px solid ${current.color}`,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <p style={{ margin: 0, color: current.color, fontSize: '13px', fontWeight: '500' }}>
              {routeLoading ? 'Menghitung rute mengikuti jalan...' : current.label}
            </p>
            {/* Info jarak setelah rute dihitung */}
            {routeDistance && !routeLoading && (
              <div style={{ display: 'flex', gap: '12px', fontSize: '12px' }}>
                <span style={{ color: '#60a5fa' }}>📍 {formatDistance(routeDistance)}</span>
              </div>
            )}
          </div>
        </div>

        {/* Filter ruas jalan */}
        <div style={{ padding: '10px 20px', background: isDark ? '#0f0f23' : '#f8fafc', borderBottom: isDark ? '1px solid #2d2d44' : '1px solid #e2e8f0' }}>
          <select
            value={selectedRuas}
            onChange={e => setSelectedRuas(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px',
              background: isDark ? '#1a1a2e' : '#ffffff', border: isDark ? '1px solid #374151' : '1px solid #d1d5db',
              borderRadius: '6px', color: isDark ? '#f1f1f1' : '#1e293b', fontSize: '13px',
            }}
          >
            <option value="">-- Pilih Ruas Jalan (opsional, untuk highlight) --</option>
            {ruasList.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </div>

        {/* Peta */}
        <div style={{ flex: 1, minHeight: '350px', position: 'relative' }}>
          <MapContainer
            center={KUBU_RAYA_CENTER}
            zoom={12}
            maxBounds={KUBU_RAYA_BOUNDS}
            maxBoundsViscosity={1.0}
            minZoom={10}
            maxZoom={19}
            style={{ height: '100%', width: '100%', minHeight: '350px' }}
            className={isDark ? 'map-dark' : 'map-light'}
          >
            <BoundsController />
            <TileLayer
              key={`picker-tile-${localMapMode}`}
              url={localMapMode === 'dark'
                ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                : "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
              }
              attribution='&copy; OpenStreetMap &copy; CARTO'
              subdomains="abcd"
              maxZoom={19}
            />

            {/* Fly ke posisi petugas saat modal pertama dibuka */}
            <FlyToMyLocation location={currentLocation} shouldFly={isOpen} />

            <RuasJalanLayer selectedRuas={selectedRuas} onRuasListLoaded={setRuasList} />

            {/* Batas wilayah Kubu Raya */}
            <KubuRayaBoundaryLayer />

            <MapClickHandler
              step={step}
              onStartSet={handleStartSet}
              onEndSet={handleEndSet}
            />

            {/* Marker posisi petugas saat ini */}
            {currentLocation?.lat && currentLocation?.lng && (
              <Marker
                position={[currentLocation.lat, currentLocation.lng]}
                icon={myLocationIcon}
                zIndexOffset={1000}
              />
            )}

            {/* Marker titik mulai */}
            {startPoint && (
              <Marker position={[startPoint.lat, startPoint.lng]} icon={startIcon} />
            )}

            {/* Marker titik akhir */}
            {endPoint && (
              <Marker position={[endPoint.lat, endPoint.lng]} icon={endIcon} />
            )}

            {/* Garis rute mengikuti jalan (dari OSRM) */}
            {routePath && routePath.length > 1 && (
              <Polyline
                positions={routePath.map(p => [p.lat, p.lng])}
                color="#3b82f6"
                weight={4}
                opacity={0.85}
              />
            )}

            {/* Garis lurus sementara saat OSRM sedang loading */}
            {startPoint && endPoint && !routePath && (
              <Polyline
                positions={[[startPoint.lat, startPoint.lng], [endPoint.lat, endPoint.lng]]}
                color="#6b7280"
                weight={2}
                opacity={0.5}
                dashArray="6, 6"
              />
            )}
          </MapContainer>

          {/* Map style toggle button */}
          <button
            onClick={() => setLocalMapMode(m => m === 'dark' ? 'light' : 'dark')}
            title={localMapMode === 'dark' ? 'Ganti ke Mode Terang' : 'Ganti ke Mode Gelap'}
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 1000,
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              background: localMapMode === 'dark' ? 'rgba(255,255,255,0.92)' : 'rgba(30,30,50,0.90)',
              color: localMapMode === 'dark' ? '#1e293b' : '#f1f5f9',
              border: localMapMode === 'dark' ? '1px solid rgba(0,0,0,0.15)' : '1px solid rgba(255,255,255,0.15)',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              backdropFilter: 'blur(6px)',
              boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
              transition: 'all 0.2s',
            }}
          >
            {localMapMode === 'dark' ? '☀️ Mode Terang' : '🌙 Mode Gelap'}
          </button>
          {/* Overlay cursor hint */}
          {(step === 'start' || step === 'end') && (
            <div style={{
              position: 'absolute', bottom: '12px', left: '50%', transform: 'translateX(-50%)',
              background: isDark ? 'rgba(0,0,0,0.75)' : 'rgba(0,0,0,0.4)', color: isDark ? '#f1f1f1' : '#1e293b',
              padding: '6px 14px', borderRadius: '20px', fontSize: '12px',
              pointerEvents: 'none', zIndex: 1000,
            }}>
              {step === 'start' ? 'Klik peta untuk menentukan titik A (Mulai)' : 'Klik peta untuk menentukan titik B (Akhir)'}
            </div>
          )}


          {/* Loading indicator saat OSRM menghitung rute */}
          {routeLoading && (
            <div style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
              background: isDark ? 'rgba(0,0,0,0.8)' : 'rgba(0,0,0,0.5)', color: '#60a5fa',
              padding: '12px 20px', borderRadius: '8px', fontSize: '13px',
              zIndex: 1000, display: 'flex', alignItems: 'center', gap: '8px',
            }}>
              <div style={{
                width: '16px', height: '16px', border: '2px solid #60a5fa',
                borderTopColor: 'transparent', borderRadius: '50%',
                animation: 'spin 0.8s linear infinite',
              }} />
              Menghitung rute...
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div style={{ padding: '14px 20px', borderTop: isDark ? '1px solid #2d2d44' : '1px solid #e2e8f0', background: isDark ? '#0f0f23' : '#f8fafc', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {/* Info posisi & titik A/B — layout vertikal agar tidak terpotong di mobile */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {/* Posisi petugas */}
            {currentLocation?.lat && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />
                <span style={{ fontSize: '12px', color: '#60a5fa' }}>
                  Posisi saya:{' '}
                  <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                    {currentLocation.lat.toFixed(5)}, {currentLocation.lng.toFixed(5)}
                  </span>
                </span>
              </div>
            )}

            {/* Titik A */}
            {startPoint && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#22c55e', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>A</div>
                <span style={{ fontSize: '12px', color: '#22c55e' }}>
                  {currentLocation?.lat
                    ? <>{formatDistanceShort(haversineDistance(currentLocation, startPoint))} dari posisi saya</>
                    : <><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{startPoint.lat.toFixed(5)}, {startPoint.lng.toFixed(5)}</span></>}
                </span>
              </div>
            )}

            {/* Titik B */}
            {endPoint && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                <div style={{ width: '18px', height: '18px', borderRadius: '50%', background: '#ef4444', color: 'white', fontSize: '10px', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>B</div>
                <span style={{ fontSize: '12px', color: '#ef4444' }}>
                  {currentLocation?.lat
                    ? <>{formatDistanceShort(haversineDistance(currentLocation, endPoint))} dari posisi saya</>
                    : <><span style={{ fontFamily: 'monospace', fontWeight: 600 }}>{endPoint.lat.toFixed(5)}, {endPoint.lng.toFixed(5)}</span></>}
                </span>
              </div>
            )}
          </div>

          {/* Tombol aksi — baris terpisah */}
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <button
              onClick={handleReset}
              style={{
                padding: '8px 14px', borderRadius: '6px',
                background: 'transparent', border: isDark ? '1px solid #4b5563' : '1px solid #cbd5e1',
                color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Reset
            </button>

            <button
              onClick={onClose}
              style={{
                padding: '8px 14px', borderRadius: '6px',
                background: 'transparent', border: isDark ? '1px solid #4b5563' : '1px solid #cbd5e1',
                color: isDark ? '#9ca3af' : '#64748b', cursor: 'pointer', fontSize: '13px',
              }}
            >
              Batal
            </button>

            <button
              onClick={handleConfirm}
              disabled={!startPoint || !endPoint || routeLoading}
              style={{
                padding: '8px 18px', borderRadius: '6px',
                background: (startPoint && endPoint && !routeLoading) ? '#3b82f6' : (isDark ? '#374151' : '#d1d5db'),
                border: 'none',
                color: (startPoint && endPoint && !routeLoading) ? 'white' : (isDark ? '#6b7280' : '#94a3b8'),
                cursor: (startPoint && endPoint && !routeLoading) ? 'pointer' : 'not-allowed',
                fontSize: '13px', fontWeight: '600',
              }}
            >
              {routeLoading ? 'Menghitung...' : 'Mulai Tracking'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default MapPickerModal;
