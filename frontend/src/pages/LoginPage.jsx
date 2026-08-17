import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import {
  MapPin,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  Sun,
  Moon,
  X,
  Phone,
  MessageCircle,
  Brain,
  Activity,
  Zap,
} from "lucide-react";

// ── Popup Kontak Admin ──────────────────────────────────────────
const AdminContactPopup = ({ onClose, isDark }) => {
  // Ganti nomor WA admin di sini
  const ADMIN_WA = "6283143298622"; // format: 62 + nomor tanpa 0 di depan
  const ADMIN_NAMA = "Admin Sistem";

  const handleOpenWA = () => {
    window.open(`https://wa.me/${ADMIN_WA}`, "_blank", "noopener,noreferrer");
  };

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.55)",
          backdropFilter: "blur(4px)",
          zIndex: 200,
          animation: "fadeIn 0.2s ease",
        }}
      />

      {/* Popup card */}
      <div
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          zIndex: 201,
          width: "100%",
          maxWidth: 340,
          padding: "0 16px",
          animation: "popupIn 0.25s cubic-bezier(0.34,1.56,0.64,1)",
        }}
      >
        <div
          style={{
            borderRadius: 20,
            background: isDark ? "#1a2235" : "#ffffff",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)"}`,
            boxShadow: isDark
              ? "0 24px 60px rgba(0,0,0,0.6)"
              : "0 24px 60px rgba(0,0,0,0.15)",
            overflow: "hidden",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 20px 16px",
              borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <MessageCircle size={20} color="#fff" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#1e293b",
                    margin: 0,
                  }}
                >
                  Hubungi Admin
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  Bantuan akses sistem
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                width: 30,
                height: 30,
                borderRadius: 8,
                border: "none",
                background: isDark
                  ? "rgba(255,255,255,0.08)"
                  : "rgba(0,0,0,0.06)",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.4)",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Konten */}
          <div style={{ padding: "18px 20px 20px" }}>
            <p
              style={{
                fontSize: 13,
                color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.5)",
                lineHeight: 1.5,
                margin: 0,
                marginBottom: 16,
              }}
            >
              Jika Anda lupa password atau membutuhkan akses ke sistem, silakan
              hubungi admin melalui WhatsApp:
            </p>

            {/* Card info admin */}
            <div
              style={{
                borderRadius: 12,
                background: isDark
                  ? "rgba(37,211,102,0.08)"
                  : "rgba(37,211,102,0.06)",
                border: `1px solid ${isDark ? "rgba(37,211,102,0.25)" : "rgba(37,211,102,0.3)"}`,
                padding: "12px 14px",
                marginBottom: 16,
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: "50%",
                  background: "linear-gradient(135deg, #25D366, #128C7E)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Phone size={18} color="#fff" />
              </div>
              <div>
                <p
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: isDark ? "#fff" : "#1e293b",
                    margin: 0,
                  }}
                >
                  {ADMIN_NAMA}
                </p>
                <p
                  style={{
                    fontSize: 14,
                    fontWeight: 600,
                    color: "#25D366",
                    margin: 0,
                    marginTop: 2,
                  }}
                >
                  +
                  {ADMIN_WA.replace(/^62/, "62 ").replace(
                    /(\d{4})(\d{4})(\d+)/,
                    "$1-$2-$3",
                  )}
                </p>
                <p
                  style={{
                    fontSize: 11,
                    color: isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.35)",
                    margin: 0,
                    marginTop: 1,
                  }}
                >
                  Dinas PU Kabupaten Kubu Raya
                </p>
              </div>
            </div>

            {/* Tombol buka WA */}
            <button
              onClick={handleOpenWA}
              style={{
                width: "100%",
                padding: "12px",
                borderRadius: 12,
                border: "none",
                background: "linear-gradient(135deg, #25D366, #128C7E)",
                color: "#ffffff",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                boxShadow: "0 4px 16px rgba(37,211,102,0.35)",
                transition: "all 0.2s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow =
                  "0 6px 20px rgba(37,211,102,0.45)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(37,211,102,0.35)";
              }}
            >
              <MessageCircle size={18} />
              Buka WhatsApp
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

// ── Login Page ──────────────────────────────────────────────────
const LoginPage = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showAdminContact, setShowAdminContact] = useState(false);
  const { login } = useAuth();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();
  const successMessage = location.state?.message || "";

  const interactiveBlobRef = useRef(null);

  useEffect(() => {
    // blob dekoratif ikuti posisi kursor
    const handleMouseMove = (e) => {
      if (interactiveBlobRef.current) {
        interactiveBlobRef.current.animate(
          { transform: `translate(${e.clientX}px, ${e.clientY}px)` },
          { duration: 2000, fill: "forwards", easing: "ease-out" }
        );
      }
    };
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() && !password.trim()) {
      setError("Silakan isi email dan password terlebih dahulu.");
      return;
    }
    if (!email.trim()) {
      setError("Silakan isi email terlebih dahulu.");
      return;
    }
    if (!password.trim()) {
      setError("Silakan isi password terlebih dahulu.");
      return;
    }

    if (!/\S+@\S+\.\S+/.test(email.trim())) {
      setError("Format email tidak valid (contoh: nama@email.com).");
      return;
    }

    setLoading(true);

    try {
      // -> AuthController@login, lalu redirect sesuai role user
      const user = await login(email, password);
      if (user.role === "admin") {
        navigate("/admin/dashboard", { replace: true });
      } else if (user.role === "reparasi") {
        navigate("/reparasi/dashboard", { replace: true });
      } else {
        navigate("/petugas/dashboard", { replace: true });
      }
    } catch (err) {
      let message =
        err.response?.data?.message ||
        err.response?.data?.errors?.email?.[0] ||
        err.response?.data?.errors?.password?.[0] ||
        "Email atau password salah.";

      // terjemahkan pesan error bawaan Laravel ke Bahasa Indonesia
      if (typeof message === "string") {
        const lower = message.toLowerCase();
        if (lower.includes("valid email address") || lower.includes("must be a valid email")) {
          message = "Format email tidak valid (contoh: nama@email.com).";
        } else if (lower.includes("credentials do not match") || lower.includes("unauthorized") || lower.includes("failed") || lower.includes("incorrect")) {
          message = "Email atau password salah.";
        } else if (lower.includes("required")) {
          message = "Silakan isi semua field yang diperlukan.";
        }
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="bg-secondary"
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "row",
        fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── NATURAL AURORA BACKGROUND ── */}
      <div className="bg-aurora-wrapper">
        <div className="aurora-blob aurora-1" />
        <div className="aurora-blob aurora-2" />
        <div className="aurora-blob aurora-3" />
        <div className="aurora-interactive" ref={interactiveBlobRef} />
      </div>

      {/* Theme toggle — pojok kanan atas */}
      <button
        onClick={toggleTheme}
        aria-label="Toggle dark/light mode"
        className="z-50"
        style={{
          position: "fixed",
          top: 20,
          right: 20,
          zIndex: 100,
          width: 44,
          height: 44,
          borderRadius: 12,
          border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.1)"}`,
          background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.04)",
          backdropFilter: "blur(12px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          transition: "all 0.3s",
          color: isDark ? "#fbbf24" : "#6366f1",
        }}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      {/* ===== SISI KIRI — Animasi & Typography ===== */}
      <div
        className="hidden lg:flex relative"
        style={{
          flex: 1,
          alignItems: "flex-start",
          justifyContent: "center",
          flexDirection: "column",
          padding: "60px 80px",
          zIndex: 10,
        }}
      >
        {/* Decorative AI Vision Scanner */}
        <div className="absolute right-[15%] top-[25%] hidden xl:block opacity-40 animate-float-search">
          <div className="ai-vision-box">
            <div className="ai-vision-corners" />
            <div className="ai-vision-scanline" />
            <div className="ai-vision-target" />
          </div>
        </div>

        <div className="relative z-10 w-full max-w-lg">
          {/* Hero Title */}
          <h1
            style={{
              fontSize: "3.5rem",
              fontWeight: 800,
              lineHeight: 1.1,
              marginBottom: 20,
              letterSpacing: "-1px",
              color: isDark ? "#f8fafc" : "#0f172a",
            }}
          >
            Road Damage
            <br />
            <span
              className={isDark ? "text-blue-400" : "text-blue-600"}
              style={{ display: "inline-block" }}
            >
              Detection System
            </span>
          </h1>

          {/* Description */}
          <p
            style={{
              fontSize: "1.1rem",
              color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.6)",
              lineHeight: 1.6,
              marginBottom: 40,
            }}
          >
            Platform cerdas pemantauan infrastruktur. Memanfaatkan Artificial Intelligence untuk mendeteksi, memetakan, dan melacak kerusakan jalan raya secara real-time di Kabupaten Kubu Raya.
          </p>

          {/* Features List */}
          <div className="space-y-4">
            {[
              { icon: Brain, text: "Deteksi Kerusakan Berbasis AI Terintegrasi", color: isDark ? "#60a5fa" : "#2563eb" },
              { icon: Activity, text: "Pemetaan Spasial & Tracking Real-time", color: isDark ? "#60a5fa" : "#2563eb" },
              { icon: Zap, text: "Sinkronisasi Data Lapangan & Monitoring Langsung", color: isDark ? "#60a5fa" : "#2563eb" }
            ].map((feature, idx) => (
              <div key={idx} className="flex items-center gap-4">
                <div
                  className="flex items-center justify-center w-10 h-10 rounded-xl"
                  style={{
                    background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.05)"}`
                  }}
                >
                  <feature.icon size={20} color={feature.color} />
                </div>
                <span
                  style={{
                    fontSize: "0.95rem",
                    fontWeight: 500,
                    color: isDark ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.8)"
                  }}
                >
                  {feature.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ===== SISI KANAN — Form Login ===== */}
      <div
        style={{
          width: "100%",
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "32px 20px",
          minHeight: "100dvh",
        }}
      >
        <div
          className="login-card-interactive"
          style={{
            width: "100%",
            maxWidth: 400,
            padding: "36px 32px",
            borderRadius: 20,
            background: isDark
              ? "rgba(22,33,62,0.7)"
              : "rgba(255,255,255,0.85)",
            backdropFilter: "blur(24px)",
            WebkitBackdropFilter: "blur(24px)",
            border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)"}`,
            boxShadow: isDark
              ? "0 16px 64px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.05)"
              : "0 16px 64px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.8)",
            animation: "fadeSlideUp 0.6s ease-out",
          }}
        >
          {/* Mobile logo (hidden on desktop) */}
          <div
            className="lg:hidden"
            style={{ textAlign: "center", marginBottom: 24 }}
          >
            <div
              style={{
                width: 56,
                height: 56,
                borderRadius: 14,
                background: isDark
                  ? "linear-gradient(135deg, #e94560, #8b5cf6)"
                  : "linear-gradient(135deg, #2563eb, #7c3aed)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                boxShadow: isDark
                  ? "0 6px 24px rgba(233,69,96,0.3)"
                  : "0 6px 24px rgba(37,99,235,0.2)",
              }}
            >
              <MapPin size={28} color="#fff" />
            </div>
            <h3
              style={{
                fontSize: 17,
                fontWeight: 700,
                color: isDark ? "#fff" : "#1e293b",
                marginBottom: 2,
              }}
            >
              Road Damage Detection
            </h3>
            <p
              style={{
                fontSize: 12,
                color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)",
              }}
            >
              Dinas PU Kabupaten Kubu Raya
            </p>
          </div>

          {/* Heading */}
          <h1
            style={{
              fontSize: 24,
              fontWeight: 800,
              color: isDark ? "#ffffff" : "#1e293b",
              marginBottom: 6,
              letterSpacing: "-0.3px",
            }}
          >
            Selamat Datang
          </h1>
          <p
            style={{
              fontSize: 14,
              color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)",
              marginBottom: 28,
            }}
          >
            Masuk menggunakan akun yang telah didaftarkan
          </p>

          {/* Success message (mis. setelah ganti password) */}
          {successMessage && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: isDark
                  ? "rgba(34,197,94,0.12)"
                  : "rgba(34,197,94,0.08)",
                border: `1px solid ${isDark ? "rgba(34,197,94,0.3)" : "rgba(34,197,94,0.2)"}`,
                marginBottom: 14,
              }}
            >
              <CheckCircle size={18} color="#22c55e" style={{ flexShrink: 0 }} />
              <p style={{ fontSize: 13, color: "#22c55e", margin: 0 }}>
                {successMessage}
              </p>
            </div>
          )}

          {/* Error */}
          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "12px 14px",
                borderRadius: 12,
                background: isDark
                  ? "rgba(239,68,68,0.12)"
                  : "rgba(239,68,68,0.08)",
                border: `1px solid ${isDark ? "rgba(239,68,68,0.3)" : "rgba(239,68,68,0.2)"}`,
                marginBottom: 20,
              }}
            >
              <AlertCircle
                size={18}
                color="#ef4444"
                style={{ flexShrink: 0 }}
              />
              <p style={{ fontSize: 13, color: "#ef4444", margin: 0 }}>
                {error}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{ marginBottom: 18 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError("");
                }}
                placeholder="nama@email.com"
                style={{
                  width: "100%",
                  padding: "12px 16px",
                  borderRadius: 12,
                  border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                  background: isDark
                    ? "rgba(255,255,255,0.04)"
                    : "rgba(0,0,0,0.02)",
                  color: isDark ? "#f3f4f6" : "#1e293b",
                  fontSize: 15,
                  outline: "none",
                  transition: "border-color 0.2s, box-shadow 0.2s",
                  boxSizing: "border-box",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = isDark ? "#e94560" : "#2563eb";
                  e.target.style.boxShadow = isDark
                    ? "0 0 0 3px rgba(233,69,96,0.15)"
                    : "0 0 0 3px rgba(37,99,235,0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = isDark
                    ? "rgba(255,255,255,0.1)"
                    : "rgba(0,0,0,0.12)";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom: 24 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.5)",
                  marginBottom: 8,
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Password
              </label>
              <div style={{ position: "relative" }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError("");
                  }}
                  placeholder="••••••••"
                  style={{
                    width: "100%",
                    padding: "12px 48px 12px 16px",
                    borderRadius: 12,
                    border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`,
                    background: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.02)",
                    color: isDark ? "#f3f4f6" : "#1e293b",
                    fontSize: 15,
                    outline: "none",
                    transition: "border-color 0.2s, box-shadow 0.2s",
                    boxSizing: "border-box",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = isDark ? "#e94560" : "#2563eb";
                    e.target.style.boxShadow = isDark
                      ? "0 0 0 3px rgba(233,69,96,0.15)"
                      : "0 0 0 3px rgba(37,99,235,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = isDark
                      ? "rgba(255,255,255,0.1)"
                      : "rgba(0,0,0,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: "absolute",
                    right: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isDark
                      ? "rgba(255,255,255,0.35)"
                      : "rgba(0,0,0,0.3)",
                    padding: 4,
                    display: "flex",
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: "100%",
                padding: "13px",
                borderRadius: 12,
                border: "none",
                background: isDark
                  ? "linear-gradient(135deg, #e94560, #c73659)"
                  : "linear-gradient(135deg, #2563eb, #4f46e5)",
                color: "#ffffff",
                fontSize: 15,
                fontWeight: 700,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.25s",
                boxShadow: isDark
                  ? "0 4px 20px rgba(233,69,96,0.35)"
                  : "0 4px 20px rgba(37,99,235,0.25)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                letterSpacing: "0.3px",
              }}
              onMouseEnter={(e) => {
                if (!loading) {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = isDark
                    ? "0 8px 28px rgba(233,69,96,0.45)"
                    : "0 8px 28px rgba(37,99,235,0.35)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = isDark
                  ? "0 4px 20px rgba(233,69,96,0.35)"
                  : "0 4px 20px rgba(37,99,235,0.25)";
              }}
            >
              {loading ? (
                <>
                  <div
                    style={{
                      width: 20,
                      height: 20,
                      border: "2px solid rgba(255,255,255,0.3)",
                      borderTopColor: "#fff",
                      borderRadius: "50%",
                      animation: "spin 0.7s linear infinite",
                    }}
                  />
                  Memproses...
                </>
              ) : (
                "Masuk ke Sistem"
              )}
            </button>
          </form>

          {/* Footer */}
          <p
            style={{
              textAlign: "center",
              fontSize: 12,
              color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)",
              marginTop: 20,
              lineHeight: 1.6,
            }}
          >
            Lupa password?{" "}
            <span
              onClick={() => setShowAdminContact(true)}
              style={{
                color: isDark ? "#e94560" : "#2563eb",
                cursor: "pointer",
                fontWeight: 600,
                textDecoration: "underline",
                textUnderlineOffset: 2,
              }}
            >
              Hubungi admin sistem
            </span>
          </p>
        </div>
      </div>

      {/* Popup kontak admin */}
      {showAdminContact && (
        <AdminContactPopup
          onClose={() => setShowAdminContact(false)}
          isDark={isDark}
        />
      )}

      {/* Animations */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(24px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        @keyframes float-orb {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33%      { transform: translate(20px, -15px) scale(1.05); }
          66%      { transform: translate(-15px, 10px) scale(0.95); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes popupIn {
          from { opacity: 0; transform: translate(-50%, -45%) scale(0.92); }
          to   { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
