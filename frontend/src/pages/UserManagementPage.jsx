import React, { useEffect, useState } from "react";
import { userService } from "../services/api";
import { useToast } from "../contexts/ToastContext";
import { useTheme } from "../contexts/ThemeContext";
import ConfirmModal from "../components/ConfirmModal";
import {
  UserPlus,
  Edit,
  ToggleLeft,
  ToggleRight,
  Search,
  X,
  Eye,
  User,
  Mail,
  Phone,
  Shield,
  Activity,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";

const getRoleLabel = (role) => {
  if (role === "admin") return "Administrator";
  if (role === "reparasi") return "Tim Perbaikan";
  return "Petugas Lapangan";
};

const getRoleBadgeClass = (role) => {
  if (role === "admin") return "bg-primary/20 text-primary border border-primary/30";
  if (role === "reparasi") return "bg-emerald-600/20 text-emerald-400 border border-emerald-600/30";
  return "bg-blue-600/20 text-blue-500 border border-blue-600/30";
};

const getAvatarBg = (role) => {
  if (role === "admin") return "bg-primary";
  if (role === "reparasi") return "bg-emerald-600";
  return "bg-blue-600";
};

// ─── Detail Panel Profil Petugas ─────────────────────────────────────────────
const UserDetailPanel = ({ user, onClose }) => {
  const { isDark } = useTheme();
  if (!user) return null;

  const joinDate = user.created_at
    ? new Date(user.created_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const lastActive = user.updated_at
    ? new Date(user.updated_at).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "—";

  const modalBg   = isDark ? "bg-[#1a2035] border-gray-700"   : "bg-white border-gray-200";
  const hdrBg     = isDark ? "from-gray-800 to-blue-900/60 border-gray-700" : "from-white to-blue-50 border-gray-200";
  const hdrTitle  = isDark ? "text-white"   : "text-gray-900";
  const closeCls  = isDark ? "bg-gray-700/60 hover:bg-gray-600 text-gray-400 hover:text-white" : "bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900";
  const sectionBorder = isDark ? "border-gray-800" : "border-gray-100";
  const rowBg     = isDark ? "bg-gray-800/60 border-gray-700/50" : "bg-gray-50 border-gray-200";
  const labelCls  = isDark ? "text-gray-500" : "text-gray-400";
  const valCls    = isDark ? "text-white"    : "text-gray-900";
  const statusCls = isDark ? "text-gray-400" : "text-gray-500";
  const footerBtn = isDark ? "bg-gray-700 hover:bg-gray-600 text-gray-200" : "bg-gray-100 hover:bg-gray-200 text-gray-700";

  return (
    <div
      className="fixed inset-0 bg-black/55 backdrop-blur-sm flex items-center justify-center z-[800] p-4"
      onClick={onClose}
    >
      <div
        className={`border rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ${modalBg}`}
        style={{ animation: "slideUpFade 0.25s ease-out" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`bg-gradient-to-r ${hdrBg} px-6 py-5 flex items-center justify-between border-b`}>
          <h2 className={`text-lg font-bold ${hdrTitle}`}>Detail Pengguna</h2>
          <button
            onClick={onClose}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${closeCls}`}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Avatar + nama */}
        <div className={`px-6 py-6 flex flex-col items-center text-center border-b ${sectionBorder}`}>
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center font-bold text-white text-3xl mb-3 ${getAvatarBg(user.role)}`}
          >
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h3 className={`text-xl font-bold ${hdrTitle}`}>{user.name}</h3>
          <span
            className={`mt-2 px-3 py-1 rounded-full text-xs font-semibold ${getRoleBadgeClass(user.role)}`}
          >
            {getRoleLabel(user.role)}
          </span>
          <div className="mt-2">
            <span
              className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                user.is_active ? "bg-green-500" : "bg-gray-400"
              }`}
            />
            <span className={`text-xs ${statusCls}`}>
              {user.is_active ? "Aktif" : "Nonaktif"}
            </span>
          </div>
        </div>

        {/* Info Grid */}
        <div className="px-6 py-5 space-y-3">
          <div className={`flex items-center gap-3 rounded-xl p-3 border ${rowBg}`}>
            <Mail className="w-4 h-4 text-blue-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>Email</p>
              <p className={`text-sm truncate ${valCls}`}>{user.email}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-xl p-3 border ${rowBg}`}>
            <Phone className="w-4 h-4 text-green-400 flex-shrink-0" />
            <div className="min-w-0">
              <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>No. HP</p>
              <p className={`text-sm truncate ${valCls}`}>{user.phone || "—"}</p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-xl p-3 border ${rowBg}`}>
            <Shield className="w-4 h-4 text-purple-400 flex-shrink-0" />
            <div>
              <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>Peran</p>
              <p className={`text-sm capitalize ${valCls}`}>
                {getRoleLabel(user.role)}
              </p>
            </div>
          </div>

          <div className={`flex items-center gap-3 rounded-xl p-3 border ${rowBg}`}>
            <Activity className={`w-4 h-4 flex-shrink-0 ${user.role === 'reparasi' ? 'text-emerald-400' : 'text-green-400'}`} />
            <div>
              <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>
                {user.role === 'reparasi' ? 'Total Perbaikan' : 'Total Tracking'}
              </p>
              <p className={`text-sm ${valCls}`}>
                {user.role === 'reparasi'
                  ? `${user.repaired_damages_count || 0} perbaikan`
                  : `${user.tracking_sessions_count || 0} sesi`
                }
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className={`flex items-center gap-2 rounded-xl p-3 border ${rowBg}`}>
              <Calendar className="w-4 h-4 text-yellow-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>Bergabung</p>
                <p className={`text-xs ${valCls}`}>{joinDate}</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 rounded-xl p-3 border ${rowBg}`}>
              <MapPin className="w-4 h-4 text-red-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className={`text-[10px] uppercase tracking-wide ${labelCls}`}>Terakhir Aktif</p>
                <p className={`text-xs ${valCls}`}>{lastActive}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-5">
          <button
            onClick={onClose}
            className={`w-full py-2.5 rounded-xl text-sm font-medium transition-colors ${footerBtn}`}
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Halaman Utama ────────────────────────────────────────────────────────────
const UserManagementPage = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [viewingUser, setViewingUser] = useState(null); // untuk detail panel
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
    role: "petugas",
  });
  const [formError, setFormError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [toggleConfirm, setToggleConfirm] = useState({ open: false, userId: null, isActive: false });
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, user: null });

  useEffect(() => {
    loadUsers();
  }, [currentPage, searchTerm, roleFilter]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // ambil daftar user -> UserManagementController@index
      const data = await userService.getAll({
        page: currentPage,
        search: searchTerm,
        role: roleFilter,
      });
      setUsers(data.data || []);
      setTotalPages(data.last_page || 1);
    } catch (error) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      if (editingUser) {
        const updateData = { ...formData };
        if (!updateData.password) delete updateData.password; // kosong = password tidak diubah
        await userService.update(editingUser.id, updateData); // -> UserManagementController@update
        toast.success(`Akun "${formData.name}" berhasil diperbarui.`);
      } else {
        await userService.create(formData); // -> UserManagementController@store
        toast.success(`Akun "${formData.name}" berhasil dibuat.`);
      }
      setShowForm(false);
      setEditingUser(null);
      setFormData({ name: "", email: "", phone: "", password: "", role: "petugas" });
      loadUsers();
    } catch (error) {
      const msg = error.response?.data?.message || "Gagal menyimpan data pengguna.";
      setFormError(msg);
      toast.error(msg);
    }
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      name: user.name,
      email: user.email,
      phone: user.phone || "",
      password: "",
      role: user.role,
    });
    setFormError("");
    setShowForm(true);
    setViewingUser(null);
  };

  const handleToggleActive = async () => {
    const { userId, isActive } = toggleConfirm;
    setToggleConfirm({ open: false, userId: null, isActive: false });
    try {
      // aktif/nonaktifkan login user -> UserManagementController@toggleActive
      await userService.toggleActive(userId);
      toast.success(isActive ? "Pengguna berhasil dinonaktifkan." : "Pengguna berhasil diaktifkan.");
      loadUsers();
    } catch (error) {
      console.error("Error toggling user:", error);
      toast.error("Gagal mengubah status pengguna.");
    }
  };

  const handleDeleteUser = async () => {
    const user = deleteConfirm.user;
    if (!user) return;
    setDeleteConfirm({ open: false, user: null });
    try {
      // hapus user, riwayat tracking/perbaikan tetap tersimpan -> UserManagementController@destroy
      await userService.delete(user.id);
      toast.success(`Pengguna "${user.name}" berhasil dihapus.`);
      if (editingUser && editingUser.id === user.id) {
        setShowForm(false);
        setEditingUser(null);
      }
      loadUsers();
    } catch (error) {
      console.error("Error deleting user:", error);
      toast.error(error.response?.data?.message || "Gagal menghapus pengguna.");
    }
  };

  // State untuk konfirmasi tutup form jika ada perubahan
  const [cancelConfirm, setCancelConfirm] = useState(false);

  // cek form berubah, biar minta konfirmasi kalau ditutup tanpa disimpan
  const isDirtyForm = () => {
    if (editingUser) {
      return formData.name !== editingUser.name ||
             formData.email !== editingUser.email ||
             formData.password !== "" ||
             formData.role !== editingUser.role;
    }
    return formData.name !== "" || formData.email !== "" || formData.password !== "";
  };

  const handleCancelForm = () => {
    if (isDirtyForm()) {
      setCancelConfirm(true);
    } else {
      cancelForm();
    }
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingUser(null);
    setFormData({ name: "", email: "", password: "", role: "petugas" });
    setFormError("");
    setCancelConfirm(false);
  };

  return (
    <div>
      <div className="overflow-auto p-4 lg:p-8">
        <div className="space-y-6">

          {/* Header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Kelola Akun Pengguna</h1>
              <p className="text-sm text-gray-400 mt-1">
                Kelola dan pantau semua pengguna sistem
              </p>
            </div>
            <button
              onClick={() => { cancelForm(); setShowForm(true); }}
              className="btn-primary flex items-center gap-2"
            >
              <UserPlus className="w-5 h-5" />
              Tambah Akun
            </button>
          </div>

          {/* Pencarian & Filter */}
          <div className="card">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Cari nama atau email..."
                  className="input-field pl-10"
                />
              </div>
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="input-field w-full md:w-48"
              >
                <option value="">Semua Peran</option>
                <option value="admin">Admin</option>
                <option value="petugas">Petugas</option>
                <option value="reparasi">Tim Perbaikan</option>
              </select>
            </div>
          </div>

          {/* Form Tambah/Edit */}
          {showForm && (
            <div className="card border-primary" style={{ animation: "slideDownFade 0.2s ease-out" }}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-semibold">
                  {editingUser ? "Edit Pengguna" : "Tambah Pengguna Baru"}
                </h2>
                <button onClick={handleCancelForm} className="text-gray-400 hover:text-white transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {formError && (
                <div className="bg-red-600/20 border border-red-600 rounded-lg p-3 mb-4">
                  <p className="text-red-400 text-sm">{formError}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nama</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="input-field"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Nomor HP</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="input-field"
                    placeholder="08xxxxxxxxxx"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Password {editingUser && "(kosongkan jika tidak diubah)"}
                  </label>
                  <input
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="input-field"
                    {...(!editingUser && { required: true })}
                    minLength={8}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Peran</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    className="input-field"
                  >
                    <option value="petugas">Petugas Lapangan</option>
                    <option value="reparasi">Tim Perbaikan</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div className="md:col-span-2 flex justify-between items-center pt-2">
                  <div className="flex gap-3">
                    <button type="submit" className="btn-primary">
                      {editingUser ? "Simpan Perubahan" : "Buat Akun"}
                    </button>
                    <button type="button" onClick={handleCancelForm} className="btn-secondary">
                      Batal
                    </button>
                  </div>
                  {editingUser && (
                    <button
                      type="button"
                      onClick={() => setDeleteConfirm({ open: true, user: editingUser })}
                      className="px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors flex items-center gap-2 shadow-lg hover:shadow-red-500/20"
                    >
                      <Trash2 className="w-4 h-4" />
                      Hapus Pengguna
                    </button>
                  )}
                </div>
              </form>
            </div>
          )}

          {/* Daftar Pengguna */}
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
          ) : users.length === 0 ? (
            <div className="card text-center py-14">
              <div className="w-16 h-16 rounded-full bg-gray-800 border border-gray-700 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-gray-500" />
              </div>
              <p className="text-gray-300 font-semibold text-lg">
                {searchTerm ? "Pengguna tidak ditemukan" : "Belum ada pengguna"}
              </p>
              <p className="text-gray-500 text-sm mt-1 mb-4">
                {searchTerm
                  ? `Tidak ada pengguna yang cocok dengan "${searchTerm}"`
                  : "Tambah akun petugas atau admin untuk mulai menggunakan sistem"}
              </p>
              {searchTerm ? (
                <button
                  onClick={() => setSearchTerm("")}
                  className="px-4 py-2 bg-blue-600/20 border border-blue-600/40 text-blue-400 rounded-lg text-sm hover:bg-blue-600/30 transition-colors"
                >
                  Hapus Pencarian
                </button>
              ) : (
                <button
                  onClick={() => setShowForm(true)}
                  className="px-4 py-2 bg-primary/20 border border-primary/40 text-primary rounded-lg text-sm hover:bg-primary/30 transition-colors"
                >
                  + Tambah Pengguna Pertama
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className="card flex items-center justify-between hover:border-gray-600 transition-all duration-200"
                >
                  {/* Avatar + info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold text-white text-base flex-shrink-0 ${getAvatarBg(user.role)}`}
                    >
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-white truncate">{user.name}</p>
                      <p className="text-sm text-gray-400 truncate">{user.email}</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                    <span
                      className={`hidden sm:inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        user.role === "admin"
                          ? "bg-primary/20 text-primary"
                          : user.role === "reparasi"
                            ? "bg-emerald-600/20 text-emerald-400"
                            : "bg-blue-600/20 text-blue-400"
                      }`}
                    >
                      {user.role === "admin" ? "Admin" : user.role === "reparasi" ? "Tim Perbaikan" : "Petugas"}
                    </span>
                    <span className="hidden md:inline-block text-sm text-gray-400">
                      {user.role === 'reparasi'
                        ? `${user.repaired_damages_count || 0} perbaikan`
                        : `${user.tracking_sessions_count || 0} tracking`
                      }
                    </span>

                    {/* Lihat Detail */}
                    <button
                      onClick={() => setViewingUser(user)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-blue-400 hover:bg-blue-600/10 transition-all"
                      title="Lihat Detail Profil"
                    >
                      <Eye className="w-4 h-4" />
                    </button>

                    {/* Edit */}
                    <button
                      onClick={() => handleEdit(user)}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all"
                      title="Edit"
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Toggle aktif */}
                    <button
                      onClick={() => setToggleConfirm({ open: true, userId: user.id, isActive: user.is_active })}
                      className="p-1"
                      title={user.is_active ? "Nonaktifkan" : "Aktifkan"}
                    >
                      {user.is_active ? (
                        <ToggleRight className="w-6 h-6 text-green-500" />
                      ) : (
                        <ToggleLeft className="w-6 h-6 text-gray-500" />
                      )}
                    </button>

                    {/* Hapus */}
                    <button
                      onClick={() => setDeleteConfirm({ open: true, user: user })}
                      className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-600/10 transition-all"
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Navigasi Halaman */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-1 btn-secondary disabled:opacity-40"
              >
                <ChevronLeft className="w-4 h-4" />
                Sebelumnya
              </button>
              <span className="text-gray-400 text-sm">
                {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-1 btn-secondary disabled:opacity-40"
              >
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Panel Detail Profil */}
      {viewingUser && (
        <UserDetailPanel
          user={viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}

      {/* Konfirmasi Ubah Status */}
      <ConfirmModal
        isOpen={toggleConfirm.open}
        onClose={() => setToggleConfirm({ open: false, userId: null, isActive: false })}
        onConfirm={handleToggleActive}
        title={toggleConfirm.isActive ? "Nonaktifkan Pengguna" : "Aktifkan Pengguna"}
        message={
          toggleConfirm.isActive
            ? "Pengguna tidak akan dapat login setelah dinonaktifkan. Lanjutkan?"
            : "Pengguna akan dapat login kembali setelah diaktifkan. Lanjutkan?"
        }
        confirmText={toggleConfirm.isActive ? "Nonaktifkan" : "Aktifkan"}
        confirmVariant={toggleConfirm.isActive ? "danger" : "primary"}
      />

      {/* Confirm tutup form jika ada perubahan belum disimpan */}
      <ConfirmModal
        isOpen={cancelConfirm}
        onClose={() => setCancelConfirm(false)}
        onConfirm={cancelForm}
        title="Buang Perubahan?"
        message="Anda memiliki perubahan yang belum disimpan. Yakin ingin menutup form ini?"
        confirmLabel="Ya, Buang"
        confirmVariant="danger"
      />

      {/* Confirm Hapus Pengguna */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, user: null })}
        onConfirm={handleDeleteUser}
        title="Hapus Pengguna?"
        message={`Apakah Anda yakin ingin menghapus pengguna "${deleteConfirm.user?.name}"? Data riwayat pekerjaan (tracking & perbaikan jalan) yang pernah dilakukan olehnya akan tetap tersimpan dengan aman dan tidak akan ikut terhapus.`}
        confirmLabel="Ya, Hapus"
        confirmVariant="danger"
      />

      <style>{`
        @keyframes slideDownFade {
          from { opacity: 0; transform: translateY(-12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default UserManagementPage;
