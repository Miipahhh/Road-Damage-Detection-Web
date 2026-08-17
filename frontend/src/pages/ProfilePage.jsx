import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { authService } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Lock,
  Eye,
  EyeOff,
  CheckCircle,
  AlertCircle,
  Save,
  Shield,
} from "lucide-react";

const ProfilePage = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();

  // Form ganti password
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    new: "",
    confirm: "",
  });
  const [showPass, setShowPass] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [passwordStatus, setPasswordStatus] = useState(null); // null | "success" | "error"
  const [passwordMsg, setPasswordMsg] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  // Form nomor HP
  const [phone, setPhone] = useState(user?.phone || "");
  const [phoneStatus, setPhoneStatus] = useState(null);
  const [phoneMsg, setPhoneMsg] = useState("");
  const [phoneLoading, setPhoneLoading] = useState(false);

  // Validasi kekuatan password baru
  const passwordStrength = (() => {
    const p = passwordForm.new;
    if (!p) return null;
    let score = 0;
    if (p.length >= 8) score++;
    if (/[A-Z]/.test(p)) score++;
    if (/[0-9]/.test(p)) score++;
    if (/[^A-Za-z0-9]/.test(p)) score++;
    if (score <= 1) return { label: "Lemah", color: "#ef4444", width: "25%" };
    if (score === 2) return { label: "Cukup", color: "#f59e0b", width: "50%" };
    if (score === 3) return { label: "Kuat", color: "#3b82f6", width: "75%" };
    return { label: "Sangat Kuat", color: "#22c55e", width: "100%" };
  })();

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordStatus(null);
    setPasswordMsg("");

    if (passwordForm.new !== passwordForm.confirm) {
      toast.error("Password baru dan konfirmasi tidak cocok.");
      setPasswordStatus("error");
      setPasswordMsg("Password baru dan konfirmasi tidak cocok.");
      return;
    }
    if (passwordForm.new.length < 8) {
      toast.error("Password baru minimal 8 karakter.");
      setPasswordStatus("error");
      setPasswordMsg("Password baru minimal 8 karakter.");
      return;
    }

    setPasswordLoading(true);
    try {
      // -> AuthController@updatePassword, backend cabut semua token lama
      await authService.updatePassword({
        current_password: passwordForm.current,
        new_password: passwordForm.new,
        new_password_confirmation: passwordForm.confirm,
      });

      toast.success("Password berhasil diubah. Silakan login ulang.");
      setPasswordForm({ current: "", new: "", confirm: "" });

      // Backend sudah mencabut semua token. Bersihkan state frontend lalu arahkan ke login.
      await logout();
      navigate("/login", {
        replace: true,
        state: { message: "Password berhasil diubah. Silakan login ulang dengan password baru." },
      });
    } catch (err) {
      const msg = err?.response?.data?.message || "Gagal memperbarui password.";
      setPasswordStatus("error");
      setPasswordMsg(msg);
      toast.error(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // validasi nomor HP format 08xxxxxxxxxx (10-13 digit)
  const isValidPhone = (value) => /^08[0-9]{8,11}$/.test(value);

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setPhoneStatus(null);

    if (!isValidPhone(phone)) {
      const msg = "Nomor HP tidak valid. Gunakan format 08xxxxxxxxxx (10-13 digit).";
      setPhoneStatus("error");
      setPhoneMsg(msg);
      toast.error(msg);
      return;
    }

    setPhoneLoading(true);
    try {
      // -> AuthController@updateProfile
      await authService.updateProfile({ phone });
      setPhoneStatus("success");
      toast.success("Nomor HP berhasil disimpan.");
    } catch (err) {
      const msg = err?.response?.data?.message || "Gagal menyimpan nomor HP.";
      setPhoneStatus("error");
      setPhoneMsg(msg);
      toast.error(msg);
    } finally {
      setPhoneLoading(false);
    }
  };

  // ── Styling helpers ──────────────────────────────────────────
  const bg = isDark ? "bg-gray-950" : "bg-slate-50";
  const cardBg = isDark
    ? "bg-gray-900 border-gray-700/60"
    : "bg-white border-gray-200";
  const labelColor = isDark ? "text-gray-400" : "text-gray-500";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const inputBg = isDark
    ? "bg-gray-800 border-gray-600 text-white placeholder-gray-500 focus:border-blue-500"
    : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-400 focus:border-blue-500";
  const readonlyBg = isDark
    ? "bg-gray-800/50 border-gray-700 text-gray-400"
    : "bg-gray-100 border-gray-200 text-gray-500";

  const roleLabel =
    user?.role === "admin"
      ? "Administrator"
      : user?.role === "reparasi"
        ? "Tim Perbaikan"
        : "Petugas";

  return (
    <div className={`min-h-screen ${bg}`}>
      {/* ── Header ── */}
      <div
        className={`sticky top-0 z-10 border-b px-4 py-3 flex items-center gap-3 ${
          isDark ? "bg-gray-900 border-gray-700" : "bg-white border-gray-200"
        } shadow-sm`}
      >
        <button
          onClick={() => navigate(-1)}
          className={`w-9 h-9 rounded-xl flex items-center justify-center transition-colors ${
            isDark
              ? "bg-gray-800 hover:bg-gray-700 text-gray-300"
              : "bg-gray-100 hover:bg-gray-200 text-gray-600"
          }`}
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className={`text-base font-bold leading-none ${textColor}`}>
            Profil Saya
          </h1>
          <p className={`text-xs mt-0.5 ${labelColor}`}>
            Kelola informasi akun Anda
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Card: Informasi Akun ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          {/* Card header */}
          <div
            className={`px-5 py-4 border-b flex items-center gap-3 ${
              isDark
                ? "border-gray-700/60 bg-gray-800/40"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-blue-600/20 flex items-center justify-center">
              <User className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textColor}`}>
                Informasi Akun
              </p>
              <p className={`text-xs ${labelColor}`}>
                Data akun tidak dapat diubah
              </p>
            </div>
          </div>

          <div className="px-5 py-5 space-y-4">
            {/* Avatar */}
            <div className="flex items-center gap-4 pb-4 border-b border-gray-700/40">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center font-bold text-white text-2xl shadow-lg">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className={`text-base font-bold ${textColor}`}>
                  {user?.name}
                </p>
                <span className="inline-block mt-1 text-xs bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-full px-2.5 py-0.5 font-semibold">
                  {roleLabel}
                </span>
              </div>
            </div>

            {/* Nama */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${labelColor}`}
              >
                Nama Lengkap
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${readonlyBg}`}
              >
                <User className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="text-sm">{user?.name}</span>
              </div>
            </div>

            {/* Email */}
            <div>
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${labelColor}`}
              >
                Email
              </label>
              <div
                className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl border ${readonlyBg}`}
              >
                <Mail className="w-4 h-4 flex-shrink-0 opacity-50" />
                <span className="text-sm">{user?.email}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ── Card: Nomor HP ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <div
            className={`px-5 py-4 border-b flex items-center gap-3 ${
              isDark
                ? "border-gray-700/60 bg-gray-800/40"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-green-600/20 flex items-center justify-center">
              <Phone className="w-4 h-4 text-green-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textColor}`}>Nomor HP</p>
              <p className={`text-xs ${labelColor}`}>
                Nomor yang dapat dihubungi
              </p>
            </div>
          </div>

          <form onSubmit={handlePhoneSubmit} className="px-5 py-5">
            <div className="mb-4">
              <label
                className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${labelColor}`}
              >
                Nomor Telepon
              </label>
              <div className="relative">
                <Phone
                  className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${labelColor}`}
                />
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    setPhoneStatus(null);
                  }}
                  placeholder="08xxxxxxxxxx"
                  className={`w-full pl-10 pr-4 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputBg}`}
                />
              </div>
            </div>

            {phoneStatus === "success" && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-400 font-medium">
                  Nomor HP berhasil disimpan.
                </p>
              </div>
            )}
            {phoneStatus === "error" && (
              <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400 font-medium">
                  {phoneMsg || "Gagal menyimpan nomor HP."}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={phoneLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-600 hover:bg-green-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {phoneLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4" />
              )}
              {phoneLoading ? "Menyimpan..." : "Simpan Nomor"}
            </button>
          </form>
        </div>

        {/* ── Card: Ganti Password ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <div
            className={`px-5 py-4 border-b flex items-center gap-3 ${
              isDark
                ? "border-gray-700/60 bg-gray-800/40"
                : "border-gray-100 bg-gray-50"
            }`}
          >
            <div className="w-8 h-8 rounded-xl bg-purple-600/20 flex items-center justify-center">
              <Shield className="w-4 h-4 text-purple-400" />
            </div>
            <div>
              <p className={`text-sm font-semibold ${textColor}`}>
                Keamanan Akun
              </p>
              <p className={`text-xs ${labelColor}`}>
                Perbarui password secara berkala
              </p>
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit} className="px-5 py-5 space-y-4">
            {/* Password lama */}
            {[
              {
                key: "current",
                label: "Password Saat Ini",
                placeholder: "Masukkan password lama",
              },
              {
                key: "new",
                label: "Password Baru",
                placeholder: "Minimal 8 karakter",
              },
              {
                key: "confirm",
                label: "Konfirmasi Password Baru",
                placeholder: "Ulangi password baru",
              },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label
                  className={`block text-xs font-semibold uppercase tracking-wide mb-1.5 ${labelColor}`}
                >
                  {label}
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 ${labelColor}`}
                  />
                  <input
                    type={showPass[key] ? "text" : "password"}
                    value={passwordForm[key]}
                    onChange={(e) => {
                      setPasswordForm((p) => ({ ...p, [key]: e.target.value }));
                      setPasswordStatus(null);
                    }}
                    placeholder={placeholder}
                    required
                    className={`w-full pl-10 pr-11 py-2.5 rounded-xl border text-sm outline-none transition-all ${inputBg}`}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setShowPass((p) => ({ ...p, [key]: !p[key] }))
                    }
                    className={`absolute right-3 top-1/2 -translate-y-1/2 ${labelColor} hover:text-white transition-colors`}
                  >
                    {showPass[key] ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {/* Bar kekuatan password */}
                {key === "new" && passwordForm.new && passwordStrength && (
                  <div className="mt-2">
                    <div
                      className={`h-1 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                    >
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: passwordStrength.width,
                          backgroundColor: passwordStrength.color,
                        }}
                      />
                    </div>
                    <p
                      className="text-xs mt-1"
                      style={{ color: passwordStrength.color }}
                    >
                      {passwordStrength.label}
                    </p>
                  </div>
                )}

                {/* Cek cocok konfirmasi */}
                {key === "confirm" && passwordForm.confirm && (
                  <p
                    className={`text-xs mt-1 ${
                      passwordForm.new === passwordForm.confirm
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {passwordForm.new === passwordForm.confirm
                      ? "✓ Password cocok"
                      : "✗ Password tidak cocok"}
                  </p>
                )}
              </div>
            ))}

            {/* Pesan status */}
            {passwordStatus === "success" && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-green-500/10 border border-green-500/30">
                <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
                <p className="text-xs text-green-400 font-medium">
                  {passwordMsg}
                </p>
              </div>
            )}
            {passwordStatus === "error" && (
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-red-500/10 border border-red-500/30">
                <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                <p className="text-xs text-red-400 font-medium">
                  {passwordMsg}
                </p>
              </div>
            )}

            <button
              type="submit"
              disabled={passwordLoading}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-white text-sm font-semibold transition-colors"
            >
              {passwordLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {passwordLoading ? "Menyimpan..." : "Perbarui Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
