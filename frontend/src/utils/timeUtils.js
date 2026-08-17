/**
 * timeAgo — mengubah tanggal ke format waktu relatif Indonesia
 * Contoh: "2 menit lalu", "kemarin", "3 hari lalu"
 */
export const timeAgo = (dateInput) => {
  if (!dateInput) return "—";
  const date = new Date(dateInput);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  if (diffSec < 60)  return "Baru saja";
  if (diffMin < 60)  return `${diffMin} menit lalu`;
  if (diffHour < 24) return `${diffHour} jam lalu`;
  if (diffDay === 1) return "Kemarin";
  if (diffDay < 7)   return `${diffDay} hari lalu`;
  if (diffDay < 30)  return `${Math.floor(diffDay / 7)} minggu lalu`;
  if (diffDay < 365) return `${Math.floor(diffDay / 30)} bulan lalu`;
  return `${Math.floor(diffDay / 365)} tahun lalu`;
};

/**
 * formatDate — format tanggal ke bahasa Indonesia
 * Contoh: "20 Jun 2026, 15:30"
 */
export const formatDate = (dateInput, opts = {}) => {
  if (!dateInput) return "—";
  return new Date(dateInput).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...opts,
  });
};
