import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Announcements({ user }) {
  const [announcements, setAnnouncements] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [loading, setLoading] = useState(true);

  // New Announcement Modal
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    priority: "normal",
    target_role: "all",
    hub_id: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);
  const isAdmin = user?.role === "admin";

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    setLoading(true);
    try {
      const [annRes, hubsRes] = await Promise.all([
        api.announcements.getAll(),
        api.programs.getHubs(),
      ]);
      setAnnouncements(annRes.announcements || []);
      setHubs(hubsRes.hubs || []);
    } catch (err) {
      console.error("Load announcements error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);
    try {
      await api.announcements.create(formData);
      setShowModal(false);
      setFormData({
        title: "",
        content: "",
        priority: "normal",
        target_role: "all",
        hub_id: "",
      });
      loadAnnouncements();
    } catch (err) {
      setFormError(err.message || "Failed to create announcement.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;
    try {
      await api.announcements.delete(id);
      loadAnnouncements();
    } catch (err) {
      alert("Delete error: " + err.message);
    }
  };

  const getPriorityStyle = (priority) => {
    switch (priority) {
      case "urgent":
        return { bg: "#fef2f2", border: "#fecaca", text: "#991b1b", badge: "#ef4444" };
      case "important":
        return { bg: "#fffbeb", border: "#fde68a", text: "#92400e", badge: "#f59e0b" };
      default:
        return { bg: "#eff6ff", border: "#bfdbfe", text: "#1e40af", badge: "#3b82f6" };
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Organization Announcements</h1>
          <p className="page-subtitle">Official communications, strategic directives, and operational broadcasts</p>
        </div>

        {isLeader && (
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Broadcast Announcement</span>
          </button>
        )}
      </div>

      {/* Announcements Feed */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading announcements...</div>
      ) : announcements.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📢</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-main)" }}>No Current Announcements</h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>There are no active broadcasts for your role or hub.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          {announcements.map((ann) => {
            const style = getPriorityStyle(ann.priority);
            return (
              <div
                key={ann.id}
                className="card"
                style={{
                  borderLeft: `4px solid ${style.badge}`,
                  padding: "1.5rem 1.75rem",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.5rem" }}>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap" }}>
                      <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "var(--color-text-main)" }}>
                        {ann.title}
                      </h2>
                      <span
                        style={{
                          fontSize: "0.6875rem",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          padding: "0.15rem 0.5rem",
                          borderRadius: "999px",
                          background: style.bg,
                          color: style.text,
                          border: `1px solid ${style.border}`,
                        }}
                      >
                        {ann.priority}
                      </span>
                      {ann.hub_name && (
                        <span style={{ fontSize: "0.75rem", color: "#64748b", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "4px" }}>
                          📍 {ann.hub_name}
                        </span>
                      )}
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>
                        Target: <strong style={{ textTransform: "capitalize" }}>{ann.target_role}</strong>
                      </span>
                    </div>

                    <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "4px" }}>
                      Broadcasted by <strong>{ann.author_name}</strong> ({ann.author_role}) on {ann.created_at?.slice(0, 16)}
                    </div>
                  </div>

                  {(isAdmin || ann.created_by === user.id) && (
                    <button
                      onClick={() => handleDelete(ann.id)}
                      style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  )}
                </div>

                <div
                  style={{
                    fontSize: "0.9375rem",
                    color: "var(--color-text-main)",
                    marginTop: "1rem",
                    lineHeight: 1.6,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {ann.content}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Announcement Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Broadcast Organization Announcement</h3>
              <button onClick={() => setShowModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Announcement Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Q4 Executive Review Meeting"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Urgency Level *</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                    >
                      <option value="normal">Normal Information</option>
                      <option value="important">Important Directive</option>
                      <option value="urgent">Urgent Action Required</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Audience *</label>
                    <select
                      value={formData.target_role}
                      onChange={(e) => setFormData({ ...formData, target_role: e.target.value })}
                    >
                      <option value="all">Entire Organization (All)</option>
                      <option value="leaders">Leaders Only (Hub & Program Leaders)</option>
                      <option value="staff">Staff Members Only</option>
                    </select>
                  </div>
                </div>

                {isAdmin && (
                  <div className="form-group">
                    <label>Specific Regional Hub (Optional)</label>
                    <select
                      value={formData.hub_id}
                      onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
                    >
                      <option value="">All Hubs (Global)</option>
                      {hubs.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="form-group">
                  <label>Announcement Content & Action Details *</label>
                  <textarea
                    rows={5}
                    required
                    placeholder="Detail the announcement, schedule, objectives, or required compliance..."
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Broadcasting..." : "Broadcast Announcement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
