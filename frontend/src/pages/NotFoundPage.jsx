import React from "react";
import { useNavigate } from "react-router-dom";
import { Home, MapPinOff, ArrowLeft } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const NotFoundPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const goHome = () => {
    if (user?.role === "admin") navigate("/admin/dashboard");
    else if (user?.role === "petugas") navigate("/petugas/dashboard");
    else navigate("/login");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-6"
      style={{ backgroundColor: "var(--color-secondary)" }}
    >
      <div className="text-center max-w-md">
        {/* Angka 404 dengan efek gradient */}
        <div className="relative mb-8">
          <p
            className="text-[120px] font-black leading-none select-none drop-shadow-2xl opacity-80"
            style={{
              background:
                "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #38bdf8 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            404
          </p>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full border border-blue-500/20 bg-blue-500/10 backdrop-blur-sm flex items-center justify-center shadow-[0_0_30px_rgba(59,130,246,0.15)]">
              <MapPinOff className="w-10 h-10 text-blue-400" />
            </div>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-white mb-3">
          Jalur Tidak Ditemukan
        </h1>
        <p className="text-gray-400 text-sm leading-relaxed mb-8">
          Halaman yang Anda cari tidak ada atau sudah dipindahkan. Pastikan URL
          yang dimasukkan sudah benar.
        </p>

        <div className="flex gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gray-700 hover:bg-gray-600 text-gray-200 font-semibold text-sm transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
          <button
            onClick={goHome}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm transition-colors"
          >
            <Home className="w-4 h-4" /> Beranda
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFoundPage;
