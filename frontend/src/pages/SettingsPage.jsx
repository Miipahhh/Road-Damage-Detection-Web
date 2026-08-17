import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../contexts/ThemeContext";
import {
  ArrowLeft,
  Settings,
  Monitor,
  CheckCircle,
} from "lucide-react";
import { loadSettings, saveSettings, applyFontSize } from "../utils/settingsUtils";

const SettingsPage = () => {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const saved = loadSettings();

  // ── State pengaturan ─────────────────────────────────────────
  const [fontSize, setFontSize] = useState(saved.fontSize ?? "normal");
  const [savedToast, setSavedToast] = useState(false);

  const handleSave = () => {
    // simpan ke localStorage & terapkan langsung ke halaman
    saveSettings({ fontSize });
    applyFontSize(fontSize);
    setSavedToast(true);
    setTimeout(() => setSavedToast(false), 2500);
  };

  // ── Styling helpers ──────────────────────────────────────────
  const bg = isDark ? "bg-gray-950" : "bg-slate-50";
  const cardBg = isDark
    ? "bg-gray-900 border-gray-700/60"
    : "bg-white border-gray-200";
  const labelColor = isDark ? "text-gray-400" : "text-gray-500";
  const textColor = isDark ? "text-white" : "text-gray-900";
  const subText = isDark ? "text-gray-500" : "text-gray-400";

  const ToggleSwitch = ({ enabled, onToggle }) => (
    <button
      type="button"
      onClick={onToggle}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
        enabled ? "bg-blue-600" : isDark ? "bg-gray-600" : "bg-gray-300"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ${
          enabled ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );

  const SectionHeader = ({ icon: Icon, title, desc, color }) => (
    <div
      className={`px-5 py-4 border-b flex items-center gap-3 ${
        isDark
          ? "border-gray-700/60 bg-gray-800/40"
          : "border-gray-100 bg-gray-50"
      }`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center`}
        style={{ background: `${color}20` }}
      >
        <Icon className="w-4 h-4" style={{ color }} />
      </div>
      <div>
        <p className={`text-sm font-semibold ${textColor}`}>{title}</p>
        <p className={`text-xs ${labelColor}`}>{desc}</p>
      </div>
    </div>
  );

  const RowItem = ({ label, desc, children }) => (
    <div
      className="flex items-center justify-between gap-4 py-3.5 border-b last:border-0"
      style={{
        borderColor: isDark ? "rgba(75,85,99,0.3)" : "rgba(229,231,235,0.8)",
      }}
    >
      <div className="min-w-0">
        <p className={`text-sm font-medium ${textColor}`}>{label}</p>
        {desc && <p className={`text-xs mt-0.5 ${subText}`}>{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );

  const ChipGroup = ({ value, onChange, options }) => (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all border ${
            value === o.value
              ? "bg-blue-600 text-white border-blue-600"
              : isDark
                ? "bg-gray-800 text-gray-400 border-gray-600 hover:border-gray-500"
                : "bg-gray-100 text-gray-500 border-gray-200 hover:border-gray-300"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );

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
            Pengaturan
          </h1>
          <p className={`text-xs mt-0.5 ${labelColor}`}>
            Sesuaikan preferensi aplikasi
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-5">
        {/* ── Tampilan ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <SectionHeader
            icon={Monitor}
            title="Tampilan"
            desc="Tema dan ukuran teks"
            color="#6366f1"
          />
          <div className="px-5">
            {/* Dark / Light mode */}
            <RowItem
              label="Mode Gelap"
              desc="Cocok untuk penggunaan di lapangan malam hari"
            >
              <ToggleSwitch enabled={isDark} onToggle={toggleTheme} />
            </RowItem>

            {/* Ukuran Font */}
            <RowItem
              label="Ukuran Teks"
              desc="Pilih sesuai kenyamanan baca di lapangan"
            >
              <ChipGroup
                value={fontSize}
                onChange={setFontSize}
                options={[
                  { value: "kecil", label: "Kecil" },
                  { value: "normal", label: "Normal" },
                  { value: "besar", label: "Besar" },
                ]}
              />
            </RowItem>
          </div>
        </div>


        {/* ── Info ── */}
        <div className={`rounded-2xl border ${cardBg} overflow-hidden`}>
          <SectionHeader
            icon={Monitor}
            title="Info Aplikasi"
            desc="Versi aplikasi"
            color="#8b5cf6"
          />
          <div className="px-5">
            <RowItem label="Versi Aplikasi">
              <span
                className={`text-xs font-mono font-bold ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                v1.0.0
              </span>
            </RowItem>
          </div>
        </div>

        {/* ── Tombol Simpan ── */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 active:scale-[0.98] text-white font-bold text-sm transition-all shadow-lg shadow-blue-600/20 flex items-center justify-center gap-2"
        >
          {savedToast ? (
            <>
              <CheckCircle className="w-4 h-4" />
              Pengaturan Disimpan!
            </>
          ) : (
            <>
              <Settings className="w-4 h-4" />
              Simpan Pengaturan
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default SettingsPage;
