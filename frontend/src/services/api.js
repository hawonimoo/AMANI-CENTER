const API_BASE = "/api";

async function request(endpoint, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const config = {
    ...options,
    headers,
  };

  if (config.body && typeof config.body === "object" && !(config.body instanceof FormData)) {
    config.body = JSON.stringify(config.body);
  }

  const response = await fetch(`${API_BASE}${endpoint}`, config);

  // If response is a file/blob (e.g. CSV export)
  if (response.headers.get("Content-Type")?.includes("text/csv")) {
    return response.blob();
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    if (response.status === 401 && !endpoint.includes("/auth/login")) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-logout"));
    }
    const message = data.error || data.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return data;
}

export const api = {
  // Auth
  auth: {
    login: async (email, password) => {
      const data = await request("/auth/login", {
        method: "POST",
        body: { email, password },
      });
      if (data.token) {
        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(data.user));
      }
      return data;
    },
    getMe: () => request("/auth/me"),
    changePassword: (currentPassword, newPassword) =>
      request("/auth/change-password", {
        method: "POST",
        body: { currentPassword, newPassword },
      }),
    logout: () => {
      request("/auth/logout", { method: "POST" }).catch(() => {});
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.dispatchEvent(new Event("auth-logout"));
    },
    getCurrentUser: () => {
      try {
        const u = localStorage.getItem("user");
        return u ? JSON.parse(u) : null;
      } catch {
        return null;
      }
    },
    getToken: () => localStorage.getItem("token"),
  },

  // Programs & Hubs
  programs: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/programs${query ? `?${query}` : ""}`);
    },
    getOne: (id) => request(`/programs/${id}`),
    create: (data) => request("/programs", { method: "POST", body: data }),
    update: (id, data) => request(`/programs/${id}`, { method: "PUT", body: data }),
    delete: (id) => request(`/programs/${id}`, { method: "DELETE" }),
    getHubs: () => request("/programs/hubs"),
    createHub: (data) => request("/programs/hubs", { method: "POST", body: data }),
    updateHub: (id, data) => request(`/programs/hubs/${id}`, { method: "PUT", body: data }),
    deleteHub: (id) => request(`/programs/hubs/${id}`, { method: "DELETE" }),
    addMember: (programId, userId) =>
      request(`/programs/${programId}/members`, { method: "POST", body: { user_id: userId } }),
    removeMember: (programId, userId) =>
      request(`/programs/${programId}/members/${userId}`, { method: "DELETE" }),
  },

  // Tasks
  tasks: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/tasks${query ? `?${query}` : ""}`);
    },
    getOne: (id) => request(`/tasks/${id}`),
    create: (data) => request("/tasks", { method: "POST", body: data }),
    update: (id, data) => request(`/tasks/${id}`, { method: "PUT", body: data }),
    updateStatus: (id, status, completion_notes) =>
      request(`/tasks/${id}/status`, { method: "PATCH", body: { status, completion_notes } }),
    addComment: (id, comment) =>
      request(`/tasks/${id}/comments`, { method: "POST", body: { comment } }),
    delete: (id) => request(`/tasks/${id}`, { method: "DELETE" }),
  },

  // Daily Reports
  reports: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/reports${query ? `?${query}` : ""}`);
    },
    getToday: () => request("/reports/today"),
    getOne: (id) => request(`/reports/${id}`),
    submit: (data) => request("/reports", { method: "POST", body: data }),
    update: (id, data) => request(`/reports/${id}`, { method: "PUT", body: data }),
    review: (id, data) => request(`/reports/${id}/review`, { method: "PATCH", body: data }),
  },

  // Staff / Users
  users: {
    getAll: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/users${query ? `?${query}` : ""}`);
    },
    getOne: (id) => request(`/users/${id}`),
    create: (data) => request("/users", { method: "POST", body: data }),
    update: (id, data) => request(`/users/${id}`, { method: "PUT", body: data }),
    resetPassword: (id, newPassword) =>
      request(`/users/${id}/reset-password`, { method: "POST", body: { newPassword } }),
    delete: (id) => request(`/users/${id}`, { method: "DELETE" }),
  },

  // Attendance & Leaves
  attendance: {
    getToday: () => request("/attendance/today"),
    checkIn: (notes) => request("/attendance/check-in", { method: "POST", body: { notes } }),
    checkOut: () => request("/attendance/check-out", { method: "POST" }),
    getHistory: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/attendance${query ? `?${query}` : ""}`);
    },
    getLeaves: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/attendance/leave${query ? `?${query}` : ""}`);
    },
    submitLeave: (data) => request("/attendance/leave", { method: "POST", body: data }),
    reviewLeave: (id, data) => request(`/attendance/leave/${id}`, { method: "PATCH", body: data }),
  },

  // In-App Notifications
  notifications: {
    getAll: () => request("/notifications"),
    markRead: (id) => request(`/notifications/${id}/read`, { method: "PATCH" }),
    markAllRead: () => request("/notifications/read-all", { method: "PATCH" }),
    delete: (id) => request(`/notifications/${id}`, { method: "DELETE" }),
  },

  // Announcements
  announcements: {
    getAll: () => request("/announcements"),
    create: (data) => request("/announcements", { method: "POST", body: data }),
    delete: (id) => request(`/announcements/${id}`, { method: "DELETE" }),
  },

  // Analytics, Exports, Audit Logs, Settings
  analytics: {
    getDashboard: () => request("/analytics/dashboard"),
    getAuditLogs: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/analytics/audit-logs${query ? `?${query}` : ""}`);
    },
    getSettings: () => request("/analytics/settings"),
    updateSettings: (settings) => request("/analytics/settings", { method: "PUT", body: { settings } }),
    downloadExport: async (type) => {
      const token = localStorage.getItem("token");
      const res = await fetch(`${API_BASE}/analytics/export/${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Failed to export data.");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    },
  },

  // Radio Station
  radio: {
    getSchedules: () => request("/radio/schedules"),
    createSchedule: (data) => request("/radio/schedules", { method: "POST", body: data }),
    updateSchedule: (id, data) => request(`/radio/schedules/${id}`, { method: "PUT", body: data }),
    deleteSchedule: (id) => request(`/radio/schedules/${id}`, { method: "DELETE" }),
    getHandovers: () => request("/radio/handovers"),
    logHandover: (data) => request("/radio/handovers", { method: "POST", body: data }),
    getPresenters: () => request("/radio/presenters"),
  },

  // Social Media & Communications
  comms: {
    getPosts: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/comms/posts${query ? `?${query}` : ""}`);
    },
    createPost: (data) => request("/comms/posts", { method: "POST", body: data }),
    updatePost: (id, data) => request(`/comms/posts/${id}`, { method: "PUT", body: data }),
    deletePost: (id) => request(`/comms/posts/${id}`, { method: "DELETE" }),
  },

  // Finance Department
  finance: {
    getSummary: () => request("/finance/summary"),
    getTransactions: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/finance/transactions${query ? `?${query}` : ""}`);
    },
    createTransaction: (data) => request("/finance/transactions", { method: "POST", body: data }),
    updateStatus: (id, status) =>
      request(`/finance/transactions/${id}/status`, { method: "PUT", body: { status } }),
  },

  // Climate Change Program
  climate: {
    getActivities: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/climate/activities${query ? `?${query}` : ""}`);
    },
    createActivity: (data) => request("/climate/activities", { method: "POST", body: data }),
    updateActivity: (id, data) => request(`/climate/activities/${id}`, { method: "PUT", body: data }),
    deleteActivity: (id) => request(`/climate/activities/${id}`, { method: "DELETE" }),
  },

  // KijijiConnect Digital Hub
  hub: {
    getCohorts: () => request("/hub/cohorts"),
    createCohort: (data) => request("/hub/cohorts", { method: "POST", body: data }),
    getParticipants: (cohortId) => request(`/hub/cohorts/${cohortId}/participants`),
    enrollParticipant: (cohortId, data) =>
      request(`/hub/cohorts/${cohortId}/participants`, { method: "POST", body: data }),
    updateParticipant: (id, data) => request(`/hub/participants/${id}`, { method: "PUT", body: data }),
    deleteParticipant: (id) => request(`/hub/participants/${id}`, { method: "DELETE" }),
  },

  // Field Collaboration & Ideas Board (Whole Organization)
  collaboration: {
    getPosts: (params = {}) => {
      const query = new URLSearchParams(params).toString();
      return request(`/collaboration${query ? `?${query}` : ""}`);
    },
    getPost: (id) => request(`/collaboration/${id}`),
    createPost: (data) => request("/collaboration", { method: "POST", body: data }),
    addComment: (id, comment) =>
      request(`/collaboration/${id}/comments`, { method: "POST", body: { comment } }),
    likePost: (id) => request(`/collaboration/${id}/like`, { method: "POST" }),
    updateStatus: (id, status) =>
      request(`/collaboration/${id}/status`, { method: "PATCH", body: { status } }),
  },
};

export default api;
