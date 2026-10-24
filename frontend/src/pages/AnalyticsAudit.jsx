import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function AnalyticsAudit({ user }) {
  const [dashboardData, setDashboardData] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState("");
  const [activeTab, setActiveTab] = useState("exports"); // "exports", "audit", "settings"
  const [actionFilter, setActionFilter] = useState("");
  const [settingsSaved, setSettingsSaved] = useState(false);

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadData();
  }, [actionFilter]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashRes, auditRes, settingsRes] = await Promise.all([
        api.analytics.getDashboard(),
        isAdmin ? api.analytics.getAuditLogs(actionFilter ? { action: actionFilter } : {}) : Promise.resolve({ logs: [] }),
        isAdmin ? api.analytics.getSettings() : Promise.resolve({ settings: {} }),
      ]);

      setDashboardData(dashRes.data || null);
      setAuditLogs(auditRes.logs || []);
      setSettings(settingsRes.settings || {});
    } catch (err) {
      console.error("Failed to load analytics:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (category) => {
    setExporting(category);
    try {
      await api.analytics.downloadExport(category);
    } catch (err) {
      alert("Export failed: " + err.message);
    } finally {
      setExporting("");
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await api.analytics.updateSettings(settings);
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 2500);
    } catch (err) {
      alert("Settings update failed: " + err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">{isAdmin ? "Organization Analytics & Audit Center" : "Program Analytics & Exports"}</h1>
          <p className="page-subtitle">Export official datasets, inspect historical audit trails, and oversee system compliance</p>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "1.75rem",
          gap: "1.5rem",
        }}
      >
        <button
          onClick={() => setActiveTab("exports")}
          style={{
            padding: "0.65rem 0",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: activeTab === "exports" ? "var(--color-primary)" : "var(--color-text-muted)",
            borderBottom: activeTab === "exports" ? "2px solid var(--color-primary)" : "none",
            marginBottom: "-1px",
          }}
        >
          Data Exports & Summary
        </button>

        {isAdmin && (
          <button
            onClick={() => setActiveTab("audit")}
            style={{
              padding: "0.65rem 0",
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: activeTab === "audit" ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === "audit" ? "2px solid var(--color-primary)" : "none",
              marginBottom: "-1px",
            }}
          >
            Security Audit Trail ({auditLogs.length})
          </button>
        )}

        {isAdmin && (
          <button
            onClick={() => setActiveTab("settings")}
            style={{
              padding: "0.65rem 0",
              fontSize: "0.9375rem",
              fontWeight: 700,
              color: activeTab === "settings" ? "var(--color-primary)" : "var(--color-text-muted)",
              borderBottom: activeTab === "settings" ? "2px solid var(--color-primary)" : "none",
              marginBottom: "-1px",
            }}
          >
            System Settings
          </button>
        )}
      </div>

      {/* Tab 1: Exports & Analytics Summary */}
      {activeTab === "exports" && (
        <>
          {/* Export Action Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1.75rem" }}>📋</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginTop: "0.5rem" }}>Tasks & Deliverables</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Export all delegated tasks with statuses, deadlines, priorities, and assignees.
                </p>
              </div>
              <button
                className="btn-primary"
                disabled={exporting === "tasks"}
                onClick={() => handleExport("tasks")}
                style={{ marginTop: "1.25rem", width: "100%" }}
              >
                {exporting === "tasks" ? "Generating..." : "Download Tasks CSV"}
              </button>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1.75rem" }}>📑</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginTop: "0.5rem" }}>Daily Work Reports</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Export verified daily accountability logs, challenges recorded, and leader feedback.
                </p>
              </div>
              <button
                className="btn-primary"
                disabled={exporting === "reports"}
                onClick={() => handleExport("reports")}
                style={{ marginTop: "1.25rem", width: "100%" }}
              >
                {exporting === "reports" ? "Generating..." : "Download Reports CSV"}
              </button>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1.75rem" }}>👥</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginTop: "0.5rem" }}>Staff & Personnel Roster</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Export active personnel records, roles, regional hubs, and program assignments.
                </p>
              </div>
              <button
                className="btn-primary"
                disabled={exporting === "staff"}
                onClick={() => handleExport("staff")}
                style={{ marginTop: "1.25rem", width: "100%" }}
              >
                {exporting === "staff" ? "Generating..." : "Download Staff CSV"}
              </button>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
              <div>
                <div style={{ fontSize: "1.75rem" }}>⏱️</div>
                <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, marginTop: "0.5rem" }}>Attendance Logs</h3>
                <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginTop: "0.25rem" }}>
                  Export timestamped shift check-in/out records, late arrivals, and attendance notes.
                </p>
              </div>
              <button
                className="btn-primary"
                disabled={exporting === "attendance"}
                onClick={() => handleExport("attendance")}
                style={{ marginTop: "1.25rem", width: "100%" }}
              >
                {exporting === "attendance" ? "Generating..." : "Download Attendance CSV"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Security Audit Logs (Admin) */}
      {activeTab === "audit" && isAdmin && (
        <>
          <div className="card" style={{ padding: "0.85rem 1.25rem", marginBottom: "1.25rem", display: "flex", gap: "1rem" }}>
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              style={{ width: "260px" }}
            >
              <option value="">All Administrative Actions</option>
              <option value="LOGIN_SUCCESS">Logins</option>
              <option value="CREATE_USER">Create User</option>
              <option value="UPDATE_USER">Update User</option>
              <option value="DEACTIVATE_USER">Deactivate User</option>
              <option value="ADMIN_PASSWORD_RESET">Admin Password Reset</option>
              <option value="CREATE_PROGRAM">Create Program</option>
              <option value="CREATE_TASK">Create Task</option>
              <option value="SUBMIT_REPORT">Submit Report</option>
              <option value="REVIEW_REPORT">Review Report</option>
              <option value="CREATE_ANNOUNCEMENT">Broadcast Announcement</option>
              <option value="EXPORT_DATA">Data Export</option>
            </select>
            {actionFilter && (
              <button onClick={() => setActionFilter("")} style={{ fontSize: "0.8125rem", color: "#dc2626", fontWeight: 600 }}>
                Reset Filter ✕
              </button>
            )}
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor</th>
                  <th>Action</th>
                  <th>Target Entity</th>
                  <th>Details</th>
                  <th>IP Address</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.map((log) => (
                  <tr key={log.id}>
                    <td style={{ fontSize: "0.8125rem", color: "#64748b", whiteSpace: "nowrap" }}>
                      {log.created_at?.slice(0, 19).replace("T", " ")}
                    </td>
                    <td>
                      <div style={{ fontWeight: 700, fontSize: "0.8125rem" }}>{log.user_name || "System"}</div>
                      <div style={{ fontSize: "0.6875rem", color: "#94a3b8" }}>{log.user_email}</div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          fontWeight: 700,
                          padding: "0.2rem 0.5rem",
                          background: "#f1f5f9",
                          borderRadius: "4px",
                          color: "#1e293b",
                        }}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", textTransform: "capitalize" }}>
                      {log.entity_type} {log.entity_id ? `#${log.entity_id}` : ""}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#475569", maxWidth: "300px", wordBreak: "break-all" }}>
                      {log.details || "—"}
                    </td>
                    <td style={{ fontSize: "0.75rem", color: "#94a3b8", fontFamily: "var(--font-mono)" }}>
                      {log.ip_address || "internal"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Tab 3: System Settings (Admin) */}
      {activeTab === "settings" && isAdmin && (
        <div className="card" style={{ maxWidth: "700px" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 700, marginBottom: "0.25rem" }}>
            Organization Configuration
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", marginBottom: "1.5rem" }}>
            Global parameters controlling organization defaults and compliance windows
          </p>

          {settingsSaved && (
            <div className="alert alert-success" style={{ marginBottom: "1.25rem" }}>
              <span>✓ Settings updated successfully.</span>
            </div>
          )}

          <form onSubmit={handleSaveSettings}>
            <div className="form-group">
              <label>Organization Legal Entity Name</label>
              <input
                type="text"
                value={settings.org_name || ""}
                onChange={(e) => setSettings({ ...settings, org_name: e.target.value })}
              />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label>Daily Reporting Deadline (Local Time)</label>
                <input
                  type="time"
                  value={settings.reporting_deadline_hour || "17:00"}
                  onChange={(e) => setSettings({ ...settings, reporting_deadline_hour: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label>Attendance Late Threshold</label>
                <input
                  type="time"
                  value={settings.attendance_late_threshold || "09:15"}
                  onChange={(e) => setSettings({ ...settings, attendance_late_threshold: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label>Global System Welcome Notice</label>
              <textarea
                rows={3}
                value={settings.system_announcement || ""}
                onChange={(e) => setSettings({ ...settings, system_announcement: e.target.value })}
              />
            </div>

            <button type="submit" className="btn-primary" style={{ marginTop: "1rem" }}>
              Save Configuration
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
