import React, { useState, useRef, useEffect } from "react";
import { useLocation, Link, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  LogOut,
  User,
  Settings,
  HelpCircle,
  ChevronDown,
  Menu,
  X,
  LayoutGrid,
  Map,
  ScanSearch,
  ClipboardList,
  UsersRound,
  Truck,
  Moon,
  ShieldAlert,
  Sun,
} from "lucide-react";

const TopNavbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, isAdmin, isReparasi } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const [isOpen, setIsOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const dropdownRef = useRef(null);

  // Scroll listener — aktifkan efek glassmorphism saat user scroll
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Tutup dropdown saat klik di luar
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () =>
        document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Kunci scroll body saat drawer terbuka
  useEffect(() => {
    if (drawerOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [drawerOpen]);

  // Tutup drawer saat route berubah
  useEffect(() => {
    setDrawerOpen(false);
    setIsOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    setIsOpen(false);
    setDrawerOpen(false);
    await logout();
  };

  // Base path sesuai role
  const basePath = isAdmin()
    ? "/admin"
    : isReparasi()
      ? "/reparasi"
      : "/petugas";
  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "reparasi"
        ? "Tim Perbaikan"
        : "Petugas";
  const avatarBg = user?.role === "reparasi" ? "bg-emerald-600" : "bg-blue-600";

  // Navigasi ke page — tutup drawer & dropdown dulu
  const goToPage = (path) => {
    setIsOpen(false);
    setDrawerOpen(false);
    navigate(path);
  };

  // Nav items berdasarkan role
  const adminNavItems = [
    { path: "/admin/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { path: "/admin/peta", icon: Map, label: "Peta Monitoring" },
    { path: "/admin/kerusakan", icon: ScanSearch, label: "Data Kerusakan" },
    { path: "/admin/tracking", icon: ClipboardList, label: "Riwayat Tracking" },
    { path: "/admin/pengguna", icon: UsersRound, label: "Kelola Pengguna" },
  ];

  const petugasNavItems = [
    { path: "/petugas/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { path: "/petugas/tracking", icon: Truck, label: "Mulai Tracking" },
    { path: "/petugas/peta", icon: Map, label: "Peta Kerusakan" },
    {
      path: "/petugas/riwayat",
      icon: ClipboardList,
      label: "Riwayat Tracking",
    },
  ];

  const reparasiNavItems = [
    { path: "/reparasi/dashboard", icon: LayoutGrid, label: "Dashboard" },
    { path: "/reparasi/peta", icon: Map, label: "Peta Kerusakan" },
  ];

  const navItems = isAdmin()
    ? adminNavItems
    : isReparasi()
      ? reparasiNavItems
      : petugasNavItems;

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  // Menu profil — semua navigate ke page
  const menuItems = [
    { label: "Profil Saya", icon: User, path: `${basePath}/profil` },
    { label: "Pengaturan", icon: Settings, path: `${basePath}/pengaturan` },
    { label: "Bantuan", icon: HelpCircle, path: `${basePath}/bantuan` },
  ];

  return (
    <>
      {/* ============================================================
          NAVBAR UTAMA
          ============================================================ */}
      <nav
        style={{
          transition:
            "background 0.3s ease, box-shadow 0.3s ease, padding 0.3s ease, backdrop-filter 0.3s ease",
        }}
        className={[
          "border-b relative z-[600]",
          scrolled ? "py-2 lg:py-2.5" : "py-3 lg:py-4",
          scrolled
            ? isDark
              ? "bg-gray-900/80 backdrop-blur-xl border-gray-700/60 shadow-lg shadow-black/30"
              : "bg-white/80 backdrop-blur-xl border-gray-200/60 shadow-lg shadow-black/10"
            : isDark
              ? "bg-gradient-to-r from-gray-900 via-gray-800 to-blue-900 border-gray-700"
              : "bg-white border-gray-200 shadow-sm",
        ].join(" ")}
      >
        {/* Centered container — sejajar dengan konten halaman */}
        <div className="max-w-[1400px] mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between">
            {/* KIRI */}
            <div className="flex items-center gap-3 lg:gap-8">
              {/* Hamburger — hanya mobile */}
              <button
                onClick={() => setDrawerOpen(true)}
                className={`lg:hidden flex items-center justify-center w-9 h-9 rounded-lg transition-colors ${
                  isDark
                    ? "bg-gray-700/60 hover:bg-gray-600/80 text-white"
                    : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                }`}
                aria-label="Buka menu navigasi"
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* Logo */}
              <div className="flex items-center gap-3.5">
                <img
                  src="/logo-pu.png"
                  alt="Logo Dinas PU"
                  className="w-14 h-14 lg:w-16 lg:h-16 object-contain flex-shrink-0 drop-shadow"
                />
                <div className="hidden sm:flex flex-col justify-center">
                  <span
                    className={`text-lg lg:text-xl font-bold leading-none ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Road Damage
                  </span>
                  <span
                    className={`text-lg lg:text-xl font-bold leading-none -mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
                  >
                    Detection System
                  </span>
                  <span
                    className={`text-xs lg:text-[13px] font-normal leading-none mt-1.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}
                  >
                    Dinas PU - Kabupaten Kubu Raya
                  </span>
                </div>
              </div>

              {/* Nav links — hanya desktop */}
              <div className="hidden lg:flex items-center gap-1 text-sm font-medium">
                {navItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`flex items-center gap-1.5 px-3 py-2 rounded-lg transition-colors ${
                        isActive(item.path)
                          ? "bg-blue-600/20 text-blue-600 border border-blue-500/30"
                          : isDark
                            ? "text-gray-400 hover:text-white hover:bg-gray-700/50"
                            : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* KANAN */}
            <div className="flex items-center gap-2">
              {/* Theme toggle */}
              <button
                onClick={(e) => toggleTheme(e.currentTarget)}
                className="flex items-center justify-center w-9 h-9 rounded-lg transition-all duration-200"
                style={{
                  background: isDark
                    ? "rgba(251,191,36,0.1)"
                    : "rgba(99,102,241,0.1)",
                  color: isDark ? "#fbbf24" : "#6366f1",
                  border: `1px solid ${isDark ? "rgba(251,191,36,0.2)" : "rgba(99,102,241,0.2)"}`,
                }}
                title={isDark ? "Switch ke Light Mode" : "Switch ke Dark Mode"}
              >
                {isDark ? (
                  <Sun className="w-[18px] h-[18px]" />
                ) : (
                  <Moon className="w-[18px] h-[18px]" />
                )}
              </button>

              {/* Mobile: Avatar → ProfilPage */}
              <button
                onClick={() => goToPage(`${basePath}/profil`)}
                className="lg:hidden flex items-center justify-center"
                aria-label="Profil Saya"
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${avatarBg} flex-shrink-0`}
                >
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
              </button>

              {/* Desktop: Dropdown profil */}
              <div className="relative hidden lg:block" ref={dropdownRef}>
                <button
                  onClick={() => setIsOpen(!isOpen)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-colors ${
                    isDark ? "hover:bg-gray-700/50" : "hover:bg-gray-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white text-sm ${avatarBg} flex-shrink-0`}
                  >
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-sm font-semibold leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
                    >
                      {user?.name || "Admin"}
                    </p>
                    <p
                      className={`text-xs leading-tight ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      {roleLabel}
                    </p>
                  </div>
                  <ChevronDown
                    size={15}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""} ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  />
                </button>

                {/* Dropdown */}
                {isOpen && (
                  <div
                    className={`absolute top-full right-0 mt-2 w-56 border rounded-lg shadow-xl overflow-hidden z-[700] ${
                      isDark
                        ? "bg-gray-800 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 border-b ${
                        isDark
                          ? "bg-gray-900 border-gray-700"
                          : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <p
                        className={`text-sm font-semibold ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {user?.name}
                      </p>
                      <p
                        className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {user?.email}
                      </p>
                      <span
                        className={`inline-block mt-1 text-xs rounded px-2 py-0.5 capitalize ${user?.role === "reparasi" ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" : "bg-blue-600/20 text-blue-500 border border-blue-500/30"}`}
                      >
                        {roleLabel}
                      </span>
                    </div>
                    <nav className="py-1">
                      {menuItems.map((item) => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.path}
                            onClick={() => goToPage(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                              isDark
                                ? "text-gray-300 hover:bg-blue-600/20 hover:text-blue-300"
                                : "text-gray-700 hover:bg-blue-50 hover:text-blue-600"
                            }`}
                          >
                            <Icon size={15} className="flex-shrink-0" />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </nav>
                    <div
                      className={`h-px ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                    />
                    <button
                      onClick={handleLogout}
                      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                        isDark
                          ? "text-red-400 hover:bg-red-600/20 hover:text-red-300"
                          : "text-red-500 hover:bg-red-50 hover:text-red-600"
                      }`}
                    >
                      <LogOut size={15} className="flex-shrink-0" />
                      <span>Logout</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          {/* end flex justify-between */}
        </div>
        {/* end max-w-[1400px] centered container */}
      </nav>

      {/* ============================================================
          MOBILE DRAWER — slide dari kiri
          ============================================================ */}
      <div
        className={`lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${
          drawerOpen
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none"
        }`}
        style={{ zIndex: 800 }}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      <div
        style={{ zIndex: 900 }}
        className={`lg:hidden fixed top-0 left-0 h-full w-72 max-w-[85vw] flex flex-col shadow-2xl transition-transform duration-300 ease-in-out border-r ${
          drawerOpen ? "translate-x-0" : "-translate-x-full"
        } ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        }`}
      >
        {/* Drawer header */}
        <div
          className={`flex items-center justify-between px-5 py-4 border-b ${
            isDark
              ? "border-gray-700 bg-gradient-to-r from-gray-900 to-blue-900/60"
              : "border-gray-200 bg-gradient-to-r from-white to-blue-50"
          }`}
        >
          <div className="flex items-center gap-3.5">
            <img
              src="/logo-pu.png"
              alt="Logo Dinas PU"
              className="w-14 h-14 object-contain flex-shrink-0 drop-shadow"
            />
            <div className="flex flex-col justify-center">
              <span
                className={`text-lg font-bold leading-none ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Road Damage
              </span>
              <span
                className={`text-lg font-bold leading-none -mt-1 ${isDark ? "text-white" : "text-gray-900"}`}
              >
                Detection System
              </span>
              <span
                className={`text-xs font-normal leading-none mt-1.5 ${isDark ? "text-slate-300" : "text-slate-600"}`}
              >
                Dinas PU - Kabupaten Kubu Raya
              </span>
            </div>
          </div>
          <button
            onClick={() => setDrawerOpen(false)}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              isDark
                ? "bg-gray-700/60 hover:bg-gray-600/80 text-gray-400 hover:text-white"
                : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900"
            }`}
            aria-label="Tutup menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User info — klik ke ProfilPage */}
        <button
          onClick={() => goToPage(`${basePath}/profil`)}
          className={`px-5 py-4 border-b transition-colors text-left w-full ${
            isDark
              ? "border-gray-700 bg-gray-800/50 hover:bg-gray-700/50"
              : "border-gray-200 bg-gray-50 hover:bg-gray-100"
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-full ${avatarBg} flex items-center justify-center font-bold text-white text-base flex-shrink-0`}
            >
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p
                className={`text-sm font-semibold truncate ${isDark ? "text-white" : "text-gray-900"}`}
              >
                {user?.name}
              </p>
              <p
                className={`text-xs truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                {user?.email}
              </p>
              <span
                className={`inline-block mt-0.5 text-[10px] rounded px-1.5 py-0.5 capitalize ${user?.role === "reparasi" ? "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30" : "bg-blue-600/20 text-blue-500 border border-blue-500/30"}`}
              >
                {roleLabel}
              </span>
            </div>
            <ChevronDown
              size={14}
              className={`-rotate-90 flex-shrink-0 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            />
          </div>
        </button>

        {/* Nav links */}
        <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
          <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider px-3 mb-2">
            Menu Navigasi
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : isDark
                      ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
                />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </Link>
            );
          })}

          <div
            className={`h-px my-2 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
          />
          <p
            className={`text-[10px] font-semibold uppercase tracking-wider px-3 mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
          >
            Akun
          </p>

          {/* Profil, Pengaturan, Bantuan — navigate ke page */}
          {menuItems.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            return (
              <button
                key={item.path}
                onClick={() => goToPage(item.path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                  active
                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/30"
                    : isDark
                      ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <Icon
                  className={`w-5 h-5 flex-shrink-0 ${active ? "text-white" : isDark ? "text-gray-400" : "text-gray-500"}`}
                />
                <span className="font-medium text-sm">{item.label}</span>
                {active && (
                  <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white opacity-80" />
                )}
              </button>
            );
          })}

          {/* Theme toggle */}
          <button
            onClick={(e) => toggleTheme(e.currentTarget)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isDark
                ? "text-gray-300 hover:bg-gray-800 hover:text-white"
                : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            {isDark ? (
              <Sun className="w-5 h-5 flex-shrink-0 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 flex-shrink-0 text-indigo-500" />
            )}
            <span className="font-medium text-sm">
              {isDark ? "Mode Terang" : "Mode Gelap"}
            </span>
          </button>
        </nav>

        {/* Logout */}
        <div
          className={`px-3 py-3 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}
        >
          <button
            onClick={handleLogout}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
              isDark
                ? "text-red-400 hover:bg-red-600/20 hover:text-red-300"
                : "text-red-500 hover:bg-red-50 hover:text-red-600"
            }`}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            <span className="font-medium text-sm">Logout</span>
          </button>
          <p
            className={`text-[10px] text-center mt-2 ${isDark ? "text-gray-600" : "text-gray-400"}`}
          >
            Dinas PU Kabupaten Kubu Raya
          </p>
        </div>
      </div>
    </>
  );
};

export default TopNavbar;
