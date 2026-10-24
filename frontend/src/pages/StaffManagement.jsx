import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function StaffManagement({ user }) {
  const [usersList, setUsersList] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [hubFilter, setHubFilter] = useState("");

  // Create/Edit Modal
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState("create"); // "create" or "edit"
  const [editingUserId, setEditingUserId] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    job_title: "",
    role: "staff",
    hub_id: "",
    is_active: 1,
    program_ids: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Reset Password Modal (Admin)
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetTargetUser, setResetTargetUser] = useState(null);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [resetSubmitting, setResetSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";
  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [search, roleFilter, hubFilter]);

  const fetchMeta = async () => {
    try {
      const [hubsRes, progsRes] = await Promise.all([
        api.programs.getHubs(),
        api.programs.getAll(),
      ]);
      setHubs(hubsRes.hubs || []);
      setPrograms(progsRes.programs || []);
    } catch (err) {
      console.error("Meta fetch error:", err);
    }
  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (roleFilter) params.role = roleFilter;
      if (hubFilter) params.hub_id = hubFilter;

      const res = await api.users.getAll(params);
      setUsersList(res.users || []);
    } catch (err) {
      console.error("Users fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openCreateModal = () => {
    setModalMode("create");
    setEditingUserId(null);
    setFormData({
      name: "",
      email: "",
      password: "amani2026",
      phone: "",
      job_title: "",
      role: "staff",
      hub_id: user?.role === "hub_leader" ? user.hub_id : (hubs[0]?.id || ""),
      is_active: 1,
      program_ids: [],
    });
    setFormError("");
    setShowModal(true);
  };

  const openEditModal = (u) => {
    setModalMode("edit");
    setEditingUserId(u.id);
    setFormData({
      name: u.name,
      email: u.email,
      password: "",
      phone: u.phone || "",
      job_title: u.job_title || "",
      role: u.role,
      hub_id: u.hub_id || "",
      is_active: u.is_active ? 1 : 0,
      program_ids: u.programs ? u.programs.map((p) => p.id) : [],
    });
    setFormError("");
    setShowModal(true);
  };

  const handleProgramToggle = (progId) => {
    const current = [...formData.program_ids];
    const idx = current.indexOf(progId);
    if (idx > -1) {
      current.splice(idx, 1);
    } else {
      current.push(progId);
    }
    setFormData({ ...formData, program_ids: current });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.name.trim() || !formData.email.trim()) {
        throw new Error("Name and email are required.");
      }

      if (modalMode === "create") {
        if (!formData.password || formData.password.length < 6) {
          throw new Error("Initial password must be at least 6 characters.");
        }
        await api.users.create(formData);
      } else {
        await api.users.update(editingUserId, formData);
      }

      setShowModal(false);
      fetchUsers();
    } catch (err) {
      setFormError(err.message || "Failed to save user.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (u) => {
    const newStatus = u.is_active ? 0 : 1;
    const action = newStatus ? "activate" : "deactivate";
    if (!window.confirm(`Are you sure you want to ${action} ${u.name}?`)) return;

    try {
      await api.users.update(u.id, { is_active: newStatus });
      fetchUsers();
    } catch (err) {
      alert(`Error updating user status: ${err.message}`);
    }
  };

  const handleAdminResetPassword = async (e) => {
    e.preventDefault();
    if (!newAdminPassword || newAdminPassword.length < 6) {
      alert("New password must be at least 6 characters.");
      return;
    }
    setResetSubmitting(true);
    try {
      await api.users.resetPassword(resetTargetUser.id, newAdminPassword);
      alert(`Password for ${resetTargetUser.name} has been reset.`);
      setShowResetModal(false);
      setNewAdminPassword("");
    } catch (err) {
      alert("Reset password error: " + err.message);
    } finally {
      setResetSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff & Personnel Directory</h1>
          <p className="page-subtitle">Manage organization staff members, roles, hub assignments, and program affiliations</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-secondary" onClick={() => api.analytics.downloadExport("staff")}>
            <span>📥 Export Roster CSV</span>
          </button>

          {isLeader && (
            <button className="btn-primary" onClick={openCreateModal}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              <span>Add Staff Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Filters Toolbar */}
      <div
        className="card"
        style={{
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <div style={{ flex: "1 1 240px" }}>
          <input
            type="text"
            placeholder="Search by staff name, email, or job title..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
            <option value="">All Roles</option>
            <option value="admin">Administrator</option>
            <option value="hub_leader">Hub Leader</option>
            <option value="program_leader">Program Leader</option>
            <option value="staff">Staff Member</option>
          </select>
        </div>

        <div style={{ flex: "0 1 200px" }}>
          <select value={hubFilter} onChange={(e) => setHubFilter(e.target.value)}>
            <option value="">All Hubs</option>
            {hubs.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </select>
        </div>

        {(search || roleFilter || hubFilter) && (
          <button
            onClick={() => {
              setSearch("");
              setRoleFilter("");
              setHubFilter("");
            }}
            style={{ fontSize: "0.8125rem", color: "var(--color-danger-text)", fontWeight: 600 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Users Table */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>
          Loading staff directory...
        </div>
      ) : usersList.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>👥</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-main)" }}>No Staff Found</h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>No personnel match the specified filters.</p>
        </div>
      ) : (
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Member & Title</th>
                <th>Role</th>
                <th>Hub</th>
                <th>Assigned Programs</th>
                <th>Deliverables</th>
                <th>Reports</th>
                <th>Status</th>
                {isLeader && <th style={{ textAlign: "right" }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id} style={{ opacity: u.is_active ? 1 : 0.6 }}>
                  <td>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "var(--radius-full)",
                          background: "#0a0a0a",
                          color: "#ffffff",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontWeight: 700,
                          fontSize: "0.8125rem",
                          border: "1px solid #dc2626",
                        }}
                      >
                        {u.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)", fontSize: "0.875rem" }}>
                          {u.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {u.email} {u.phone ? `• ${u.phone}` : ""}
                        </div>
                        {u.job_title && (
                          <div style={{ fontSize: "0.6875rem", color: "#475569", fontWeight: 500 }}>
                            {u.job_title}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${u.role}`}>{u.role.replace("_", " ")}</span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", color: "#334155" }}>{u.hub_name || "Unassigned"}</span>
                  </td>
                  <td>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", maxWidth: "260px" }}>
                      {(!u.programs || u.programs.length === 0) ? (
                        <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>None</span>
                      ) : (
                        u.programs.map((p) => (
                          <span
                            key={p.id}
                            style={{
                              fontSize: "0.6875rem",
                              background: "#f1f5f9",
                              padding: "0.15rem 0.45rem",
                              borderRadius: "4px",
                              color: "#475569",
                              fontWeight: 500,
                            }}
                          >
                            {p.name.split(" ")[0]}
                          </span>
                        ))
                      )}
                    </div>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                      <strong style={{ color: "#0a0a0a" }}>{u.completed_tasks || 0}</strong> / {u.total_tasks || 0}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#dc2626" }}>
                      {u.total_reports || 0}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 600,
                        padding: "0.2rem 0.55rem",
                        borderRadius: "999px",
                        background: u.is_active ? "#18181b" : "#fee2e2",
                        color: u.is_active ? "#ffffff" : "#991b1b",
                      }}
                    >
                      {u.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  {isLeader && (
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          onClick={() => openEditModal(u)}
                          style={{
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid var(--color-border)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            color: "var(--color-primary)",
                          }}
                        >
                          Edit
                        </button>

                        {isAdmin && (
                          <button
                            onClick={() => {
                              setResetTargetUser(u);
                              setNewAdminPassword("");
                              setShowResetModal(true);
                            }}
                            title="Admin Password Reset"
                            style={{
                              padding: "0.3rem 0.6rem",
                              borderRadius: "6px",
                              border: "1px solid var(--color-border)",
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: "#0891b2",
                            }}
                          >
                            Key
                          </button>
                        )}

                        {u.id !== user?.id && (
                          <button
                            onClick={() => handleToggleActive(u)}
                            style={{
                              padding: "0.3rem 0.6rem",
                              borderRadius: "6px",
                              border: `1px solid ${u.is_active ? "#fecaca" : "#d4d4d8"}`,
                              fontSize: "0.75rem",
                              fontWeight: 600,
                              color: u.is_active ? "#dc2626" : "#0a0a0a",
                              background: u.is_active ? "#fef2f2" : "#f4f4f5",
                            }}
                          >
                            {u.is_active ? "Deactivate" : "Activate"}
                          </button>
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Staff Create / Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {modalMode === "create" ? "Register Staff Member" : `Edit Personnel - ${formData.name}`}
              </h3>
              <button onClick={() => setShowModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleFormSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Amina Farah"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Work Email *</label>
                    <input
                      type="email"
                      required
                      placeholder="name@org.com"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Job Title / Position</label>
                    <input
                      type="text"
                      placeholder="e.g. Senior Broadcast Journalist"
                      value={formData.job_title}
                      onChange={(e) => setFormData({ ...formData, job_title: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>Contact Phone</label>
                    <input
                      type="text"
                      placeholder="+252-615-..."
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>{modalMode === "create" ? "Initial Password *" : "Password (Leave blank to keep)"}</label>
                    <input
                      type="password"
                      placeholder={modalMode === "create" ? "••••••••" : "Leave blank to keep current"}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>System Role *</label>
                    <select
                      value={formData.role}
                      onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    >
                      <option value="staff">Staff Member</option>
                      <option value="program_leader">Program Leader</option>
                      {isAdmin && <option value="hub_leader">Hub Leader</option>}
                      {isAdmin && <option value="admin">Administrator</option>}
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Assigned Regional Hub</label>
                  <select
                    value={formData.hub_id}
                    onChange={(e) => setFormData({ ...formData, hub_id: e.target.value })}
                  >
                    <option value="">Select Hub</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Program Membership Selection */}
                <div className="form-group">
                  <label>Assign to Programs</label>
                  <div
                    style={{
                      maxHeight: "150px",
                      overflowY: "auto",
                      border: "1px solid var(--color-border)",
                      borderRadius: "var(--radius-md)",
                      padding: "0.5rem 0.75rem",
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.4rem",
                    }}
                  >
                    {programs.map((p) => {
                      const isChecked = formData.program_ids.includes(p.id);
                      return (
                        <label
                          key={p.id}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.6rem",
                            fontSize: "0.8125rem",
                            cursor: "pointer",
                            padding: "0.2rem 0",
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleProgramToggle(p.id)}
                            style={{ width: "auto" }}
                          />
                          <span>{p.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : modalMode === "create" ? "Register Member" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admin Reset Password Modal */}
      {showResetModal && resetTargetUser && (
        <div className="modal-overlay" onClick={() => setShowResetModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Reset Password - {resetTargetUser.name}</h3>
              <button onClick={() => setShowResetModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminResetPassword}>
              <div className="modal-body">
                <p style={{ fontSize: "0.875rem", color: "var(--color-text-muted)", marginBottom: "1rem" }}>
                  Enter a new password for <strong>{resetTargetUser.email}</strong>. The user will be notified in-app.
                </p>

                <div className="form-group">
                  <label>New Temporary Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="Minimum 6 characters"
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowResetModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={resetSubmitting}>
                  {resetSubmitting ? "Resetting..." : "Reset Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
