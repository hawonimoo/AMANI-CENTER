import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Programs({ user }) {
  const [programs, setPrograms] = useState([]);
  const [hubs, setHubs] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedHub, setSelectedHub] = useState("");
  const [search, setSearch] = useState("");

  // Program Modal
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [programModalMode, setProgramModalMode] = useState("create"); // "create" or "edit"
  const [editingProgramId, setEditingProgramId] = useState(null);
  const [programForm, setProgramForm] = useState({
    name: "",
    description: "",
    hub_id: "",
  });
  const [programSubmitting, setProgramSubmitting] = useState(false);

  // Hub Modal
  const [showHubModal, setShowHubModal] = useState(false);
  const [hubForm, setHubForm] = useState({ name: "", description: "" });
  const [hubSubmitting, setHubSubmitting] = useState(false);

  // Members Modal
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [activeProgramDetails, setActiveProgramDetails] = useState(null);
  const [selectedUserIdToAdd, setSelectedUserIdToAdd] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    loadData();
  }, [selectedHub, search]);

  const loadData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedHub) params.hub_id = selectedHub;
      if (search) params.search = search;

      const [progsRes, hubsRes, usersRes] = await Promise.all([
        api.programs.getAll(params),
        api.programs.getHubs(),
        isLeader ? api.users.getAll() : Promise.resolve({ users: [] }),
      ]);

      setPrograms(progsRes.programs || []);
      setHubs(hubsRes.hubs || []);
      setAllUsers(usersRes.users || []);
    } catch (err) {
      console.error("Load programs error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleProgramSubmit = async (e) => {
    e.preventDefault();
    setProgramSubmitting(true);
    try {
      if (programModalMode === "create") {
        await api.programs.create(programForm);
      } else {
        await api.programs.update(editingProgramId, programForm);
      }
      setShowProgramModal(false);
      loadData();
    } catch (err) {
      alert("Error saving program: " + err.message);
    } finally {
      setProgramSubmitting(false);
    }
  };

  const handleHubSubmit = async (e) => {
    e.preventDefault();
    setHubSubmitting(true);
    try {
      await api.programs.createHub(hubForm);
      setShowHubModal(false);
      setHubForm({ name: "", description: "" });
      loadData();
    } catch (err) {
      alert("Error creating hub: " + err.message);
    } finally {
      setHubSubmitting(false);
    }
  };

  const openProgramMembers = async (prog) => {
    try {
      const res = await api.programs.getOne(prog.id);
      setActiveProgramDetails(res.program);
      setSelectedUserIdToAdd("");
      setShowMembersModal(true);
    } catch (err) {
      alert("Failed to load program members: " + err.message);
    }
  };

  const handleAddMember = async () => {
    if (!selectedUserIdToAdd || !activeProgramDetails) return;
    try {
      await api.programs.addMember(activeProgramDetails.id, selectedUserIdToAdd);
      const res = await api.programs.getOne(activeProgramDetails.id);
      setActiveProgramDetails(res.program);
      setSelectedUserIdToAdd("");
      loadData();
    } catch (err) {
      alert("Failed to add member: " + err.message);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!activeProgramDetails) return;
    try {
      await api.programs.removeMember(activeProgramDetails.id, userId);
      const res = await api.programs.getOne(activeProgramDetails.id);
      setActiveProgramDetails(res.program);
      loadData();
    } catch (err) {
      alert("Failed to remove member: " + err.message);
    }
  };

  const handleDeleteProgram = async (id) => {
    if (!window.confirm("Are you sure you want to delete this program? Tasks and reports linked to it may be affected.")) return;
    try {
      await api.programs.delete(id);
      loadData();
    } catch (err) {
      alert("Failed to delete program: " + err.message);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Programs & Regional Hubs</h1>
          <p className="page-subtitle">Coordinate organizational programs, allocate personnel, and monitor hub coverage</p>
        </div>

        {isLeader && (
          <div style={{ display: "flex", gap: "0.75rem" }}>
            <button className="btn-secondary" onClick={() => setShowHubModal(true)}>
              <span>+ New Hub</span>
            </button>
            <button
              className="btn-primary"
              onClick={() => {
                setProgramModalMode("create");
                setEditingProgramId(null);
                setProgramForm({ name: "", description: "", hub_id: hubs[0]?.id || "" });
                setShowProgramModal(true);
              }}
            >
              <span>+ New Program</span>
            </button>
          </div>
        )}
      </div>

      {/* Hubs Overview Strip */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}
      >
        {hubs.map((h) => (
          <div
            key={h.id}
            onClick={() => setSelectedHub(selectedHub === String(h.id) ? "" : String(h.id))}
            className="card"
            style={{
              cursor: "pointer",
              padding: "1.1rem 1.25rem",
              borderColor: selectedHub === String(h.id) ? "var(--color-primary)" : "var(--color-border)",
              backgroundColor: selectedHub === String(h.id) ? "#eff6ff" : "#ffffff",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 700, fontSize: "0.9375rem", color: "var(--color-text-main)" }}>
                📍 {h.name}
              </span>
              <span style={{ fontSize: "0.75rem", background: "#f1f5f9", padding: "0.15rem 0.5rem", borderRadius: "999px" }}>
                {h.program_count || 0} Programs
              </span>
            </div>
            {h.description && (
              <p style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "0.35rem", lineHeight: 1.4 }}>
                {h.description}
              </p>
            )}
            <div style={{ fontSize: "0.6875rem", color: "var(--color-primary)", fontWeight: 600, marginTop: "0.5rem" }}>
              {selectedHub === String(h.id) ? "Showing filtered programs (Click to reset)" : "Filter by this hub →"}
            </div>
          </div>
        ))}
      </div>

      {/* Search Bar */}
      <div className="card" style={{ padding: "0.85rem 1.25rem", marginBottom: "1.5rem", display: "flex", gap: "1rem" }}>
        <input
          type="text"
          placeholder="Search programs by name or description..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {selectedHub && (
          <button
            onClick={() => setSelectedHub("")}
            className="btn-secondary"
            style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", whiteSpace: "nowrap" }}
          >
            Clear Hub Filter ✕
          </button>
        )}
      </div>

      {/* Programs Grid */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading programs...</div>
      ) : programs.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📁</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-main)" }}>No Programs Found</h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>No programs registered under this criteria.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: "1.5rem" }}>
          {programs.map((prog) => (
            <div
              key={prog.id}
              className="card"
              style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}
            >
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                  <h3 style={{ fontSize: "1.0625rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                    {prog.name}
                  </h3>
                  {prog.hub_name && (
                    <span
                      style={{
                        fontSize: "0.6875rem",
                        padding: "0.2rem 0.5rem",
                        background: "#eff6ff",
                        color: "#1e40af",
                        borderRadius: "6px",
                        fontWeight: 600,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {prog.hub_name}
                    </span>
                  )}
                </div>

                <p
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-text-muted)",
                    marginTop: "0.5rem",
                    lineHeight: 1.5,
                    minHeight: "40px",
                  }}
                >
                  {prog.description || "No description provided."}
                </p>

                {/* Metrics */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                    marginTop: "1.25rem",
                    padding: "0.75rem",
                    background: "#f8fafc",
                    borderRadius: "8px",
                    textAlign: "center",
                  }}
                >
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#1e293b" }}>
                      {prog.member_count || 0}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 600 }}>Staff Assigned</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#2563eb" }}>
                      {prog.active_tasks || 0}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 600 }}>Active Tasks</div>
                  </div>
                  <div>
                    <div style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
                      {prog.total_reports || 0}
                    </div>
                    <div style={{ fontSize: "0.6875rem", color: "#64748b", fontWeight: 600 }}>Reports</div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "1.25rem",
                  paddingTop: "0.75rem",
                  borderTop: "1px solid var(--color-border)",
                }}
              >
                <button
                  onClick={() => openProgramMembers(prog)}
                  style={{
                    fontSize: "0.8125rem",
                    color: "var(--color-primary)",
                    fontWeight: 600,
                  }}
                >
                  👥 Manage Team ({prog.member_count || 0})
                </button>

                {isLeader && (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      onClick={() => {
                        setProgramModalMode("edit");
                        setEditingProgramId(prog.id);
                        setProgramForm({
                          name: prog.name,
                          description: prog.description || "",
                          hub_id: prog.hub_id || "",
                        });
                        setShowProgramModal(true);
                      }}
                      style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", fontWeight: 600 }}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteProgram(prog.id)}
                      style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600 }}
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Program Create / Edit Modal */}
      {showProgramModal && (
        <div className="modal-overlay" onClick={() => setShowProgramModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {programModalMode === "create" ? "Create New Program" : "Edit Program"}
              </h3>
              <button
                onClick={() => setShowProgramModal(false)}
                style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleProgramSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Program Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Digital Skills & Youth Innovation"
                    value={programForm.name}
                    onChange={(e) => setProgramForm({ ...programForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Operational Hub</label>
                  <select
                    value={programForm.hub_id}
                    onChange={(e) => setProgramForm({ ...programForm, hub_id: e.target.value })}
                  >
                    <option value="">Select Hub</option>
                    {hubs.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Description & Scope</label>
                  <textarea
                    rows={4}
                    placeholder="Overview of objectives, target audience, and primary activities..."
                    value={programForm.description}
                    onChange={(e) => setProgramForm({ ...programForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowProgramModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={programSubmitting}>
                  {programSubmitting ? "Saving..." : programModalMode === "create" ? "Create Program" : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New Hub Modal */}
      {showHubModal && (
        <div className="modal-overlay" onClick={() => setShowHubModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Register New Regional Hub</h3>
              <button onClick={() => setShowHubModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleHubSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Hub Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Kismayo Community Innovation Hub"
                    value={hubForm.name}
                    onChange={(e) => setHubForm({ ...hubForm, name: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Description / Location Info</label>
                  <textarea
                    rows={3}
                    placeholder="Physical branch details, geographical coverage..."
                    value={hubForm.description}
                    onChange={(e) => setHubForm({ ...hubForm, description: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowHubModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={hubSubmitting}>
                  {hubSubmitting ? "Registering..." : "Create Hub"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Members Modal */}
      {showMembersModal && activeProgramDetails && (
        <div className="modal-overlay" onClick={() => setShowMembersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Program Team: {activeProgramDetails.name}</h3>
              <button
                onClick={() => setShowMembersModal(false)}
                style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}
              >
                ✕
              </button>
            </div>

            <div className="modal-body">
              {/* Add member section (Leaders only) */}
              {isLeader && (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    marginBottom: "1.5rem",
                    paddingBottom: "1.25rem",
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  <select
                    value={selectedUserIdToAdd}
                    onChange={(e) => setSelectedUserIdToAdd(e.target.value)}
                    style={{ flex: 1 }}
                  >
                    <option value="">Select Staff Member to Assign</option>
                    {allUsers
                      .filter(
                        (u) =>
                          !activeProgramDetails.members?.some((m) => m.id === u.id)
                      )
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.email} - {u.role})
                        </option>
                      ))}
                  </select>
                  <button
                    type="button"
                    onClick={handleAddMember}
                    disabled={!selectedUserIdToAdd}
                    className="btn-primary"
                    style={{ padding: "0.5rem 1rem", fontSize: "0.8125rem", whiteSpace: "nowrap" }}
                  >
                    Add Member
                  </button>
                </div>
              )}

              {/* Members List */}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#64748b", textTransform: "uppercase" }}>
                  Current Team Members ({activeProgramDetails.members?.length || 0})
                </div>

                {(!activeProgramDetails.members || activeProgramDetails.members.length === 0) ? (
                  <div style={{ padding: "1.5rem", textAlign: "center", color: "var(--color-text-muted)" }}>
                    No staff members assigned to this program yet.
                  </div>
                ) : (
                  activeProgramDetails.members.map((mem) => (
                    <div
                      key={mem.id}
                      style={{
                        padding: "0.75rem 1rem",
                        border: "1px solid var(--color-border)",
                        borderRadius: "var(--radius-md)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.875rem", color: "var(--color-text-main)" }}>
                          {mem.name}
                        </div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {mem.email} • <span className={`badge badge-${mem.role}`}>{mem.role}</span>
                        </div>
                      </div>

                      {isLeader && (
                        <button
                          type="button"
                          onClick={() => handleRemoveMember(mem.id)}
                          style={{
                            fontSize: "0.75rem",
                            color: "#dc2626",
                            padding: "0.3rem 0.6rem",
                            borderRadius: "6px",
                            border: "1px solid #fecaca",
                            background: "#fef2f2",
                            fontWeight: 600,
                          }}
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={() => setShowMembersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
