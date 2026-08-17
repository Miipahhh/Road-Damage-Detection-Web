import React, { useEffect, useState, useRef, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { useToast } from "../contexts/ToastContext";
import { roadDamageService } from "../services/api";
import { AlertTriangle, ChevronDown, ChevronUp, ArrowRight, ClipboardList } from "lucide-react";

const ReparasiGlobalNotifier = () => {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const toast = useToast();
  const location = useLocation();
  const navigate = useNavigate();

  const [rejectedList, setRejectedList] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const prevVerifiedCount = useRef(null);
  const prevRejectedCount = useRef(null);

  const checkStatus = useCallback(async () => {
    if (!user || user.role !== "reparasi") return;
    try {
      const res = await roadDamageService.getMapMarkers({ status: "verified" });
      const markers = res.markers || [];
      const rejected = markers.filter(m => m.notes && m.notes.startsWith("Ditolak:"));
      
      // Cek apakah ada kerusakan verified baru yang siap diperbaiki
      if (prevVerifiedCount.current !== null && markers.length > prevVerifiedCount.current) {
        const diff = markers.length - prevVerifiedCount.current;
        toast.warning(
          `🔔 ${diff} kerusakan baru siap diperbaiki! Cek peta untuk detailnya.`,
          8000
        );
      }
      prevVerifiedCount.current = markers.length;

      // Cek apakah ada laporan perbaikan baru yang ditolak Admin
      if (prevRejectedCount.current !== null && rejected.length > prevRejectedCount.current) {
        toast.error(
          `⚠️ Ada laporan perbaikan Anda yang baru saja ditolak Admin! Silakan cek alasannya dan perbaiki kembali.`,
          8000
        );
      }
      prevRejectedCount.current = rejected.length;

      setRejectedList(rejected);
    } catch (err) {
      console.error("Gagal memeriksa status reparasi:", err);
    }
  }, [user]);

  useEffect(() => {
    if (user?.role === "reparasi") {
      checkStatus();
      const interval = setInterval(checkStatus, 15000);
      return () => clearInterval(interval);
    }
  }, [user, checkStatus]);

  if (!user || user.role !== "reparasi") return null;

  // Di dashboard sudah ada kartu list penolakan besar, tapi di halaman lain (peta, profil, dll) kita tampilkan alert bar ini
  if (location.pathname === "/reparasi/dashboard") return null;
  if (rejectedList.length === 0) return null;

  return (
    <div className="bg-red-600/95 text-white border-b border-red-700 shadow-lg relative z-[550] transition-all">
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 py-2.5 flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-white/20 rounded-lg animate-pulse">
            <AlertTriangle className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-xs sm:text-sm font-bold">
              ⚠️ Terdapat {rejectedList.length} Laporan Perbaikan yang Ditolak oleh Admin!
            </p>
            <p className="text-[11px] sm:text-xs text-red-100 hidden sm:block">
              Silakan periksa catatan alasan penolakan dan lakukan perbaikan ulang pada lokasi tersebut.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setExpanded(!expanded)}
            className="px-3 py-1 bg-red-700/80 hover:bg-red-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 border border-red-400/30 transition-colors cursor-pointer"
          >
            <span>{expanded ? "Tutup Daftar" : "Lihat Daftar"}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded List */}
      {expanded && (
        <div className="bg-red-950/95 border-t border-red-500/30 px-4 lg:px-8 py-4 max-h-60 overflow-y-auto shadow-inner">
          <div className="max-w-[1400px] mx-auto space-y-2">
            <p className="text-xs font-bold text-red-200 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <ClipboardList className="w-4 h-4" />
              <span>Daftar Laporan Ditolak — Klik untuk Fokus ke Peta & Perbaiki:</span>
            </p>
            {rejectedList.map((reject) => (
              <div
                key={reject.id}
                onClick={() => {
                  setExpanded(false);
                  navigate("/reparasi/peta", { state: { focusId: reject.id, _t: Date.now() } });
                }}
                className="flex items-center justify-between p-3 rounded-xl bg-red-900/60 hover:bg-red-800/80 border border-red-500/30 cursor-pointer transition-all group"
              >
                <div className="min-w-0 flex-1 pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs sm:text-sm text-white truncate">
                      {reject.damage_type}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/40 text-red-100 font-semibold">
                      {reject.ruas_jalan || "Ruas Jalan"}
                    </span>
                  </div>
                  <p className="text-xs text-red-200 italic mt-1 truncate">
                    "{reject.notes ? reject.notes.replace("Ditolak: ", "") : "Tanpa alasan"}"
                  </p>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-red-700 rounded-lg text-xs font-bold shadow group-hover:scale-105 transition-transform flex-shrink-0">
                  <span>Perbaiki</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReparasiGlobalNotifier;
