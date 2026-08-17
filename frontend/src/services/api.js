import axios from "axios";

const API_BASE_URL = "https://api.geovision.risetmaster.my.id/api";

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Ambil token dari localStorage saat aplikasi start
const token = localStorage.getItem("token");
if (token) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

// Interceptor untuk tangani error 401 (token expired/invalid)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      delete api.defaults.headers.common["Authorization"];
      if (window.location.pathname !== "/login") {
        // Emit event agar App bisa tampilkan toast sebelum redirect
        window.dispatchEvent(new CustomEvent("session-expired"));
        setTimeout(() => {
          window.location.href = "/login";
        }, 1800);
      }
    }
    return Promise.reject(error);
  },
);

// ==================== AUTH SERVICE ====================
export const authService = {
  // POST /login -> AuthController@login
  login: async (email, password) => {
    const response = await api.post("/login", { email, password });
    return response.data;
  },
  // POST /logout -> AuthController@logout
  logout: async () => {
    const response = await api.post("/logout");
    return response.data;
  },
  // GET /me -> AuthController@me
  me: async () => {
    const response = await api.get("/me");
    return response.data;
  },
  // PUT /profile -> AuthController@updateProfile
  updateProfile: async (data) => {
    const response = await api.put("/profile", data);
    return response.data;
  },
  // PUT /profile/password -> AuthController@updatePassword
  updatePassword: async (data) => {
    const response = await api.put("/profile/password", data);
    return response.data;
  },
};

// ==================== ROAD DAMAGE SERVICE ====================
export const roadDamageService = {
  // GET /road-damages -> RoadDamageController@index
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(`/road-damages?${params.toString()}`);
    return response.data;
  },

  // GET /road-damages/{id} -> RoadDamageController@show
  getById: async (id) => {
    const response = await api.get(`/road-damages/${id}`);
    return response.data;
  },

  // POST /road-damages/detect -> RoadDamageController@detect
  detect: async (formData) => {
    const response = await api.post("/road-damages/detect", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },

  // PUT /road-damages/{id} -> RoadDamageController@update
  update: async (id, data) => {
    const response = await api.put(`/road-damages/${id}`, data);
    return response.data;
  },

  // DELETE /road-damages/{id} -> RoadDamageController@destroy
  delete: async (id) => {
    const response = await api.delete(`/road-damages/${id}`);
    return response.data;
  },

  // POST /road-damages/bulk-delete -> RoadDamageController@bulkDestroy
  bulkDelete: async (ids) => {
    const response = await api.post("/road-damages/bulk-delete", { ids });
    return response.data;
  },

  // GET /road-damages/stats/summary -> RoadDamageController@statistics
  getStatistics: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(
      `/road-damages/stats/summary?${params.toString()}`,
    );
    return response.data;
  },

  // GET /road-damages/map/markers -> RoadDamageController@mapData
  getMapMarkers: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(
      `/road-damages/map/markers?${params.toString()}`,
    );
    return response.data;
  },

  // POST /road-damages/{id}/lapor-perbaikan -> RoadDamageController@laporPerbaikan
  laporPerbaikan: async (id, formData) => {
    const response = await api.post(
      `/road-damages/${id}/lapor-perbaikan`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    return response.data;
  },

  // POST /road-damages/{id}/approve-repair -> RoadDamageController@approveRepair
  approveRepair: async (id) => {
    const response = await api.post(`/road-damages/${id}/approve-repair`);
    return response.data;
  },

  // POST /road-damages/{id}/reject-repair -> RoadDamageController@rejectRepair
  rejectRepair: async (id) => {
    const response = await api.post(`/road-damages/${id}/reject-repair`);
    return response.data;
  },
};

// ==================== TRACKING SERVICE ====================
export const trackingService = {
  // routeData: { startPoint: {lat, lng}, endPoint: {lat, lng}, ruasJalanName: string|null }
  // POST /tracking/start -> TrackingSessionController@start
  start: async (routeData = null) => {
    const payload = {};
    if (routeData?.startPoint) {
      payload.start_point = routeData.startPoint;
    }
    if (routeData?.endPoint) {
      payload.end_point = routeData.endPoint;
    }
    if (routeData?.ruasJalanName) {
      payload.ruas_jalan_name = routeData.ruasJalanName;
    }
    const response = await api.post("/tracking/start", payload);
    return response.data;
  },

  // POST /tracking/{id}/stop -> TrackingSessionController@stop
  stop: async (sessionId) => {
    const response = await api.post(`/tracking/${sessionId}/stop`);
    return response.data;
  },

  // POST /tracking/{id}/route -> TrackingSessionController@updateRoute
  updateRoute: async (sessionId, latitude, longitude) => {
    const response = await api.post(`/tracking/${sessionId}/route`, {
      latitude,
      longitude,
    });
    return response.data;
  },

  // POST /tracking/{id}/damage -> TrackingSessionController@saveDamage
  saveDamage: async (sessionId, data) => {
    const response = await api.post(`/tracking/${sessionId}/damage`, data);
    return response.data;
  },

  // GET /tracking/active -> TrackingSessionController@activeSession
  getActiveSession: async () => {
    const response = await api.get("/tracking/active");
    return response.data;
  },

  // GET /tracking/my-history -> TrackingSessionController@myHistory
  getMyHistory: async (filters = {}) => {
    if (typeof filters === "number") filters = { page: filters };
    const params = new URLSearchParams();
    if (filters.page) params.append("page", filters.page);
    Object.entries(filters).forEach(([key, value]) => {
      if (
        key !== "page" &&
        value !== "" &&
        value !== null &&
        value !== undefined &&
        value !== "all"
      ) {
        params.append(key, value);
      }
    });
    const response = await api.get(`/tracking/my-history?${params.toString()}`);
    return response.data;
  },

  // GET /tracking-all -> TrackingSessionController@allHistory
  getAllHistory: async (filters = {}) => {
    const params = new URLSearchParams();

    // Parameter halaman
    if (filters.page) {
      params.append("page", filters.page);
    }

    // Parameter filter lainnya
    Object.entries(filters).forEach(([key, value]) => {
      if (
        key !== "page" &&
        value !== "" &&
        value !== null &&
        value !== undefined &&
        value !== "all"
      ) {
        params.append(key, value);
      }
    });

    const response = await api.get(`/tracking-all?${params.toString()}`);
    return response.data;
  },

  // GET /tracking/{id} -> TrackingSessionController@show
  getSession: async (id) => {
    const response = await api.get(`/tracking/${id}`);
    return response.data;
  },

  // Admin: semua sesi tracking aktif untuk live map (dipolling berkala)
  // GET /tracking-live -> TrackingSessionController@activeSessions
  getLiveSessions: async () => {
    const response = await api.get("/tracking-live");
    return response.data;
  },

  // Admin: hapus satu sesi (kerusakan jalan ikut terhapus/cascade)
  // DELETE /tracking/{id} -> TrackingSessionController@destroy
  deleteSession: async (id) => {
    const response = await api.delete(`/tracking/${id}`);
    return response.data;
  },

  // Admin: hapus banyak sesi sekaligus
  // POST /tracking-bulk-delete -> TrackingSessionController@bulkDestroy
  bulkDeleteSessions: async (ids) => {
    const response = await api.post("/tracking-bulk-delete", { ids });
    return response.data;
  },
};

// ==================== USER MANAGEMENT SERVICE ====================
export const userService = {
  // GET /users -> UserManagementController@index
  getAll: async (filters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params.append(key, value);
      }
    });
    const response = await api.get(`/users?${params.toString()}`);
    return response.data;
  },

  // POST /users -> UserManagementController@store
  create: async (data) => {
    const response = await api.post("/users", data);
    return response.data;
  },

  // GET /users/{id} -> UserManagementController@show
  getById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },

  // PUT /users/{id} -> UserManagementController@update
  update: async (id, data) => {
    const response = await api.put(`/users/${id}`, data);
    return response.data;
  },

  // POST /users/{id}/toggle-active -> UserManagementController@toggleActive
  toggleActive: async (id) => {
    const response = await api.post(`/users/${id}/toggle-active`);
    return response.data;
  },

  // DELETE /users/{id} -> UserManagementController@destroy
  delete: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
};

export default api;
