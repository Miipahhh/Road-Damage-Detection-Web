import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { CheckCircle2, AlertTriangle, Info, X, AlertCircle, Trash2 } from "lucide-react";

const ToastContext = createContext(null);

let toastId = 0;

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = "info", duration = 3500) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
    return id;
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = {
    success: (msg, dur) => addToast(msg, "success", dur || 3500),
    error:   (msg, dur) => addToast(msg, "error",   dur || 5000),
    warning: (msg, dur) => addToast(msg, "warning", dur || 4500),
    info:    (msg, dur) => addToast(msg, "info",    dur || 3500),
    delete:  (msg, dur) => addToast(msg, "delete",  dur || 3500),
  };

  // Tangkap event session expired dari api.js interceptor
  useEffect(() => {
    const handleSessionExpired = () => {
      addToast("Sesi Anda telah berakhir. Silakan login kembali.", "warning", 6000);
    };
    window.addEventListener("session-expired", handleSessionExpired);
    return () => window.removeEventListener("session-expired", handleSessionExpired);
  }, [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
};

/* ─── Toast Config ─────────────────────────────────────────────────────────── */
const CONFIGS = {
  success: {
    icon: CheckCircle2,
    accent: "#22c55e",
    border: "rgba(34,197,94,0.35)",
    iconBg: "rgba(34,197,94,0.12)",
    bar: "#22c55e",
    label: "Berhasil",
  },
  error: {
    icon: AlertCircle,
    accent: "#ef4444",
    border: "rgba(239,68,68,0.35)",
    iconBg: "rgba(239,68,68,0.12)",
    bar: "#ef4444",
    label: "Gagal",
  },
  warning: {
    icon: AlertTriangle,
    accent: "#f59e0b",
    border: "rgba(245,158,11,0.35)",
    iconBg: "rgba(245,158,11,0.12)",
    bar: "#f59e0b",
    label: "Perhatian",
  },
  info: {
    icon: Info,
    accent: "#3b82f6",
    border: "rgba(59,130,246,0.35)",
    iconBg: "rgba(59,130,246,0.12)",
    bar: "#3b82f6",
    label: "Info",
  },
  delete: {
    icon: Trash2,
    accent: "#ef4444",
    border: "rgba(239,68,68,0.35)",
    iconBg: "rgba(239,68,68,0.12)",
    bar: "#ef4444",
    label: "Dihapus",
  },
};

/* ─── Toast Item ───────────────────────────────────────────────────────────── */
const ToastItem = ({ toast: t, onRemove }) => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const raf = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(raf);
  }, []);

  const cfg = CONFIGS[t.type] || CONFIGS.info;
  const Icon = cfg.icon;

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => onRemove(t.id), 250);
  };

  return (
    <div
      style={{
        transform: visible ? "translateX(0) scale(1)" : "translateX(80px) scale(0.95)",
        opacity: visible ? 1 : 0,
        transition: "transform 0.28s cubic-bezier(0.16,1,0.3,1), opacity 0.28s ease",
        borderRadius: "14px",
        overflow: "hidden",
        boxShadow: "0 8px 32px rgba(0,0,0,0.18), 0 2px 8px rgba(0,0,0,0.1)",
        border: `1px solid ${cfg.border}`,
        /* Adaptif: gunakan CSS var agar mengikuti tema */
        background: "var(--toast-bg, #1a2035)",
        color: "var(--toast-text, #f3f4f6)",
        position: "relative",
      }}
      className="flex items-start gap-3 px-4 py-3.5 min-w-0"
      role="alert"
    >
      {/* Left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: "3px",
          background: cfg.accent,
          borderRadius: "14px 0 0 14px",
        }}
      />

      {/* Icon */}
      <div
        style={{
          background: cfg.iconBg,
          borderRadius: "8px",
          padding: "6px",
          flexShrink: 0,
          marginTop: "1px",
        }}
      >
        <Icon style={{ width: "16px", height: "16px", color: cfg.accent }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p
          style={{
            fontSize: "11px",
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: cfg.accent,
            marginBottom: "2px",
          }}
        >
          {cfg.label}
        </p>
        <p
          style={{
            fontSize: "13px",
            lineHeight: "1.45",
            fontWeight: 500,
            color: "inherit",
            wordBreak: "break-word",
          }}
        >
          {t.message}
        </p>
      </div>

      {/* Close button */}
      <button
        onClick={handleClose}
        style={{
          flexShrink: 0,
          opacity: 0.5,
          transition: "opacity 0.15s",
          marginTop: "1px",
          padding: "2px",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.opacity = 1)}
        onMouseLeave={(e) => (e.currentTarget.style.opacity = 0.5)}
        aria-label="Tutup"
      >
        <X style={{ width: "15px", height: "15px", color: "currentColor" }} />
      </button>

      {/* Progress bar */}
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          height: "2.5px",
          background: cfg.bar,
          borderRadius: "0 0 0 14px",
          animation: `shrinkBar ${t.duration}ms linear forwards`,
          opacity: 0.8,
        }}
      />
    </div>
  );
};

/* ─── Toast Container ──────────────────────────────────────────────────────── */
const ToastContainer = ({ toasts, onRemove }) => {
  if (toasts.length === 0) return null;
  return (
    <>
      {/* CSS var injector for theme awareness */}
      <style>{`
        :root, [data-theme="dark"] { --toast-bg: #1a2035; --toast-text: #f3f4f6; }
        [data-theme="light"] { --toast-bg: #ffffff; --toast-text: #1e293b; }
      `}</style>

      <div
        className="fixed top-4 right-4 flex flex-col gap-2.5"
        style={{ zIndex: 99999, maxWidth: "calc(100vw - 32px)", width: "340px" }}
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onRemove={onRemove} />
        ))}
      </div>
    </>
  );
};
