import React from "react";
import { createPortal } from "react-dom";
import { Trash2, AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useTheme } from "../contexts/ThemeContext";

/**
 * ConfirmModal — pengganti browser confirm() / alert() yang premium.
 *
 * Props:
 *  - isOpen: boolean
 *  - type: "danger" | "warning" | "info" | "success" (default: "danger")
 *  - title: string
 *  - message: string
 *  - confirmLabel: string (default: "Ya, Hapus")
 *  - cancelLabel: string (default: "Batal")
 *  - onConfirm: () => void
 *  - onCancel: () => void
 *  - loading: boolean — tampilkan spinner di tombol konfirmasi
 */
const ConfirmModal = ({
  isOpen,
  type,
  confirmVariant,
  title = "Konfirmasi",
  message = "",
  confirmLabel,
  confirmText,
  cancelLabel,
  cancelText,
  onConfirm,
  onCancel,
  onClose,
  loading = false,
}) => {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const handleClose = onCancel || onClose || (() => {});
  const activeType = type || confirmVariant || "danger";
  const activeConfirmLabel = confirmLabel || confirmText || "Ya, Hapus";
  const activeCancelLabel = cancelLabel || cancelText || "Batal";

  const config = {
    danger: {
      icon: Trash2,
      iconBg: "bg-red-500/15 border border-red-500/30",
      iconColor: "text-red-500",
      btnClass: "bg-red-600 hover:bg-red-500 text-white",
      accent: "#ef4444",
    },
    warning: {
      icon: AlertTriangle,
      iconBg: "bg-yellow-500/15 border border-yellow-500/30",
      iconColor: "text-yellow-500",
      btnClass: "bg-yellow-500 hover:bg-yellow-400 text-white",
      accent: "#f59e0b",
    },
    info: {
      icon: Info,
      iconBg: "bg-blue-500/15 border border-blue-500/30",
      iconColor: "text-blue-500",
      btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
      accent: "#3b82f6",
    },
    primary: {
      icon: Info,
      iconBg: "bg-blue-500/15 border border-blue-500/30",
      iconColor: "text-blue-500",
      btnClass: "bg-blue-600 hover:bg-blue-500 text-white",
      accent: "#3b82f6",
    },
    success: {
      icon: CheckCircle2,
      iconBg: "bg-green-500/15 border border-green-500/30",
      iconColor: "text-green-500",
      btnClass: "bg-green-600 hover:bg-green-500 text-white",
      accent: "#22c55e",
    },
  };

  const { icon: Icon, iconBg, iconColor, btnClass, accent } = config[activeType] || config.danger;

  // Theme-aware classes
  const modalBg   = isDark ? "bg-[#1a2035] border-gray-700/70" : "bg-white border-gray-200";
  const titleCls  = isDark ? "text-white" : "text-gray-900";
  const msgCls    = isDark ? "text-gray-400" : "text-gray-500";
  const cancelCls = isDark
    ? "bg-gray-700 hover:bg-gray-600 text-gray-200"
    : "bg-gray-100 hover:bg-gray-200 text-gray-700";
  const closeCls  = isDark
    ? "bg-gray-700/60 hover:bg-gray-600 text-gray-400 hover:text-white"
    : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-800";

  // Render via Portal ke document.body — bypass ancestor transform
  // PageTransition (App.jsx) yang membuat position:fixed jadi relatif
  // ke container, bukan viewport, terutama kelihatan di mobile
  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: 10000,
        background: "rgba(0,0,0,0.55)",
        backdropFilter: "blur(8px)",
      }}
      onClick={handleClose}
    >
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-sm p-6 relative ${modalBg}`}
        style={{ animation: "slideUpFade 0.25s cubic-bezier(0.16,1,0.3,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent bar */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "40px",
            height: "3px",
            borderRadius: "0 0 4px 4px",
            background: accent,
          }}
        />

        {/* Close button */}
        <button
          onClick={handleClose}
          className={`absolute top-4 right-4 w-7 h-7 rounded-full flex items-center justify-center transition-colors ${closeCls}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>

        {/* Icon */}
        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 ${iconBg}`}>
          <Icon className={`w-7 h-7 ${iconColor}`} />
        </div>

        <h3 className={`text-lg font-bold text-center mb-2 ${titleCls}`}>{title}</h3>
        <p className={`text-sm text-center mb-6 leading-relaxed ${msgCls}`}>{message}</p>

        <div className="flex gap-3">
          <button
            onClick={handleClose}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors disabled:opacity-50 ${cancelCls}`}
          >
            {activeCancelLabel}
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className={`flex-1 px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2 ${btnClass} disabled:opacity-60`}
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Memproses...
              </>
            ) : (
              activeConfirmLabel
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default ConfirmModal;
