import React, { useRef, useEffect, Component, lazy, Suspense } from "react";
import { useLenis } from "./hooks/useLenis";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Navigate,
} from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import { ToastProvider } from "./contexts/ToastContext";
import ProtectedRoute from "./components/ProtectedRoute";
import TopNavbar from "./components/TopNavbar";
import ReparasiGlobalNotifier from "./components/ReparasiGlobalNotifier";
import LoginPage from "./pages/LoginPage";
import "./index.css";

// Lazy-load halaman berat agar bundle awal lebih kecil
const AdminDashboard      = lazy(() => import("./pages/AdminDashboard"));
const PetugasDashboard    = lazy(() => import("./pages/PetugasDashboard"));
const ReparasiDashboard   = lazy(() => import("./pages/ReparasiDashboard"));
const MapPage             = lazy(() => import("./pages/MapPage"));
const HistoryPage         = lazy(() => import("./pages/HistoryPage"));
const TrackingPage        = lazy(() => import("./pages/TrackingPage"));
const TrackingHistoryPage = lazy(() => import("./pages/TrackingHistoryPage"));
const UserManagementPage  = lazy(() => import("./pages/UserManagementPage"));
const ProfilePage         = lazy(() => import("./pages/ProfilePage"));
const SettingsPage        = lazy(() => import("./pages/SettingsPage"));
const HelpPage            = lazy(() => import("./pages/HelpPage"));
const NotFoundPage        = lazy(() => import("./pages/NotFoundPage"));

// Spinner SVG inline — tidak bergantung Tailwind animate-spin,
// pasti berputar di semua browser dan kondisi.
const spinnerStyle = {
  animation: 'page-spinner-rotate 0.8s linear infinite',
};
const spinnerKeyframes = `
  @keyframes page-spinner-rotate {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
`;

const PageLoader = () => (
  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center',
    justifyContent: 'center', height: '200px', gap: '14px' }}>
    <style>{spinnerKeyframes}</style>
    <svg style={spinnerStyle} width="40" height="40" viewBox="0 0 40 40"
      fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="20" cy="20" r="16" stroke="currentColor"
        strokeOpacity="0.15" strokeWidth="4" />
      <path d="M20 4 A16 16 0 0 1 36 20" stroke="#3b82f6"
        strokeWidth="4" strokeLinecap="round" />
    </svg>
    <span style={{ fontSize: '13px', color: 'var(--color-text-muted, #9ca3af)', letterSpacing: '0.05em' }}>
      Memuat halaman…
    </span>
  </div>
);


/**
 * ErrorBoundary — menangkap JS error dan tampilkan pesan di layar
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, background: "#0f172a",
          color: "#f87171", padding: "20px", overflowY: "auto",
          fontFamily: "monospace", fontSize: "13px", zIndex: 99999
        }}>
          <h2 style={{ color: "#ef4444", marginBottom: "12px" }}>⚠️ Error Aplikasi</h2>
          <p style={{ marginBottom: "8px", color: "#fca5a5" }}>
            {this.state.error?.message}
          </p>
          <pre style={{ background: "#1e293b", padding: "12px", borderRadius: "8px",
            whiteSpace: "pre-wrap", wordBreak: "break-all", fontSize: "11px", color: "#94a3b8" }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => this.setState({ hasError: false, error: null })}
            style={{ marginTop: "16px", padding: "8px 16px", background: "#2563eb",
              color: "white", border: "none", borderRadius: "6px", cursor: "pointer" }}
          >
            Coba Lagi
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * PageTransition — animasi modern saat ganti route.
 * Efek: slide-up + fade baru masuk, konten lama fade out.
 * Render pertama: langsung terlihat (tanpa animasi).
 */
const PageTransition = ({ pageKey, children, className = '', style = {} }) => {
  const containerRef = useRef(null);
  const prevKey = useRef(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    // Skip pada render pertama
    if (prevKey.current === null) {
      prevKey.current = pageKey;
      return;
    }
    prevKey.current = pageKey;

    // Animasi: slide dari bawah + fade in
    el.animate(
      [
        { opacity: 0, transform: 'translateY(16px) scale(0.99)' },
        { opacity: 1, transform: 'translateY(0)    scale(1)'    },
      ],
      {
        duration: 380,
        easing: 'cubic-bezier(0.16, 1, 0.3, 1)', // spring-like easing
        fill: 'both',
      }
    );
  }, [pageKey]);

  return (
    <div ref={containerRef} className={className} style={style}>
      {children}
    </div>
  );
};

// Halaman yang TIDAK pakai wrapper max-w / padding
const MAP_ROUTES = ["/admin/peta", "/petugas/peta", "/reparasi/peta"];

const AppContent = () => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Smooth scroll: dinonaktifkan di peta & halaman tracking GPS
  const LENIS_EXCLUDED = [
    "/admin/peta", "/petugas/peta", "/reparasi/peta",
    "/petugas/tracking",
  ];
  const lenisEnabled = !LENIS_EXCLUDED.some((r) => location.pathname === r);
  useLenis(lenisEnabled);

  if (loading) {
    return (
      <div
        className="flex items-center justify-center h-screen"
        style={{ backgroundColor: "var(--color-secondary)" }}
      >
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4" style={{ color: "var(--color-text-muted)" }}>
            Memuat sistem...
          </p>
        </div>
      </div>
    );
  }

  if (location.pathname === "/login") {
    return <LoginPage />;
  }

  const isAdminRoute = location.pathname.startsWith("/admin/");
  const isPetugasRoute = location.pathname.startsWith("/petugas/");
  const isReparasiRoute = location.pathname.startsWith("/reparasi/");

  // Halaman peta: full screen tanpa wrapper
  const isMapRoute = MAP_ROUTES.some((r) => location.pathname === r);

  // Halaman profil/pengaturan/bantuan: punya header sendiri, tanpa wrapper max-w
  const isFullPageRoute = [
    "/admin/profil",
    "/admin/pengaturan",
    "/admin/bantuan",
    "/petugas/profil",
    "/petugas/pengaturan",
    "/petugas/bantuan",
    "/reparasi/profil",
    "/reparasi/pengaturan",
    "/reparasi/bantuan",
  ].includes(location.pathname);

  const routes = (
    <Routes>
      <Route
        path="/"
        element={
          user ? (
            user.role === "admin" ? (
              <Navigate to="/admin/dashboard" replace />
            ) : user.role === "reparasi" ? (
              <Navigate to="/reparasi/dashboard" replace />
            ) : (
              <Navigate to="/petugas/dashboard" replace />
            )
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />

      {/* ── Petugas Routes ── */}
      <Route
        path="/petugas/dashboard"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <PetugasDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/tracking"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <TrackingPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/peta"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/riwayat"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <TrackingHistoryPage showAll={false} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/profil"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/pengaturan"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/petugas/bantuan"
        element={
          <ProtectedRoute roles={["petugas"]}>
            <HelpPage />
          </ProtectedRoute>
        }
      />

      {/* ── Admin Routes ── */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute roles={["admin"]}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/peta"
        element={
          <ProtectedRoute roles={["admin"]}>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/kerusakan"
        element={
          <ProtectedRoute roles={["admin"]}>
            <HistoryPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/tracking"
        element={
          <ProtectedRoute roles={["admin"]}>
            <TrackingHistoryPage showAll={true} />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pengguna"
        element={
          <ProtectedRoute roles={["admin"]}>
            <UserManagementPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profil"
        element={
          <ProtectedRoute roles={["admin"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/pengaturan"
        element={
          <ProtectedRoute roles={["admin"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bantuan"
        element={
          <ProtectedRoute roles={["admin"]}>
            <HelpPage />
          </ProtectedRoute>
        }
      />

      {/* ── Tim Perbaikan Routes ── */}
      <Route
        path="/reparasi/dashboard"
        element={
          <ProtectedRoute roles={["reparasi"]}>
            <ReparasiDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reparasi/peta"
        element={
          <ProtectedRoute roles={["reparasi"]}>
            <MapPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reparasi/profil"
        element={
          <ProtectedRoute roles={["reparasi"]}>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reparasi/pengaturan"
        element={
          <ProtectedRoute roles={["reparasi"]}>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/reparasi/bantuan"
        element={
          <ProtectedRoute roles={["reparasi"]}>
            <HelpPage />
          </ProtectedRoute>
        }
      />
      {/* 404 */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );

  return (
    <div className={isMapRoute ? "flex flex-col h-[100dvh] w-full overflow-hidden" : "flex flex-col min-h-[100dvh] w-full"}>
      {/* TopNavbar — tampil di semua halaman role */}
      {(isAdminRoute || isPetugasRoute || isReparasiRoute) && <TopNavbar />}

      {/* Global Alert & Notifier untuk Tim Perbaikan di semua halaman */}
      {isReparasiRoute && <ReparasiGlobalNotifier />}

      {/* Peta: full screen, tanpa animasi transisi (agar tidak glitch) */}
      {isMapRoute ? (
        <div className="flex-1 mobile-content-height lg:desktop-content-height w-full overflow-hidden flex flex-col relative">
          <Suspense fallback={<PageLoader />}>{routes}</Suspense>
        </div>
      ) : isFullPageRoute ? (
        <PageTransition
          pageKey={location.pathname}
          className="flex-1 w-full overflow-auto"
        >
          <div className="max-w-[1400px] mx-auto w-full px-4 lg:px-8">
            <Suspense fallback={<PageLoader />}>{routes}</Suspense>
          </div>
        </PageTransition>
      ) : (
        <main className="flex-1 w-full">
          <PageTransition
            pageKey={location.pathname}
            className="w-full"
          >
            <div className="max-w-[1400px] mx-auto w-full px-4 lg:px-8 py-4 lg:py-6">
              <Suspense fallback={<PageLoader />}>{routes}</Suspense>
            </div>
          </PageTransition>
        </main>
      )}
    </div>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <ToastProvider>
              <ErrorBoundary>
                <Routes>
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/*" element={<AppContent />} />
                </Routes>
              </ErrorBoundary>
            </ToastProvider>
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </ErrorBoundary>
  );
}

export default App;
