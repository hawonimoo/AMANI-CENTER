import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function ClimateProgram({ user }) {
  const [activities, setActivities] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingActivity, setEditingActivity] = useState(null);

  // Form states
  const [formTitle, setFormTitle] = useState("");
  const [formType, setFormType] = useState("Tree Planting");
  const [formDate, setFormDate] = useState("");
  const [formLocation, setFormLocation] = useState("");
  const [formLead, setFormLead] = useState("Mauwa");
  const [formTargetParts, setFormTargetParts] = useState(50);
  const [formActualParts, setFormActualParts] = useState(0);
  const [formTreesPlanted, setFormTreesPlanted] = useState(0);
  const [formStatus, setFormStatus] = useState("planned");
  const [formOutcomes, setFormOutcomes] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    fetchActivities();
  }, []);

  const fetchActivities = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.climate.getActivities();
      setActivities(res.activities || []);
      setStats(res.stats || {});
    } catch (err) {
      setError(err.message || "Failed to load climate activities.");
    } finally {
      setLoading(false);
    }
  };

  const openNewModal = () => {
    setEditingActivity(null);
    setFormTitle("");
    setFormType("Tree Planting");
    setFormDate(new Date().toISOString().split("T")[0]);
    setFormLocation("");
    setFormLead("Mauwa");
    setFormTargetParts(50);
    setFormActualParts(0);
    setFormTreesPlanted(0);
    setFormStatus("planned");
    setFormOutcomes("");
    setShowModal(true);
  };

  const openEditModal = (act) => {
    setEditingActivity(act);
    setFormTitle(act.title);
    setFormType(act.activity_type);
    setFormDate(act.target_date);
    setFormLocation(act.location);
    setFormLead(act.lead_officer || "Mauwa");
    setFormTargetParts(act.target_participants);
    setFormActualParts(act.actual_participants);
    setFormTreesPlanted(act.trees_planted);
    setFormStatus(act.status);
    setFormOutcomes(act.outcomes || "");
    setShowModal(true);
  };

  const handleSaveActivity = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        title: formTitle,
        activity_type: formType,
        target_date: formDate,
        location: formLocation,
        lead_officer: formLead,
        target_participants: formTargetParts,
        actual_participants: formActualParts,
        trees_planted: formTreesPlanted,
        status: formStatus,
        outcomes: formOutcomes,
      };

      if (editingActivity) {
        await api.climate.updateActivity(editingActivity.id, payload);
        setSuccess("Climate activity updated.");
      } else {
        await api.climate.createActivity(payload);
        setSuccess("New climate activity recorded.");
      }
      setShowModal(false);
      fetchActivities();
    } catch (err) {
      setError(err.message || "Failed to save activity.");
    }
  };

  const handleDeleteActivity = async (id) => {
    if (!window.confirm("Delete this climate activity?")) return;
    try {
      await api.climate.deleteActivity(id);
      setSuccess("Activity deleted.");
      fetchActivities();
    } catch (err) {
      setError(err.message || "Failed to delete activity.");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>🌱</span>
            <h1 className="page-title">Climate Change Program</h1>
          </div>
          <p className="page-subtitle">
            Environmental Sustainability, Agroforestry, Community Outreach & Water Resilience
          </p>
        </div>

        <button className="btn-primary" onClick={openNewModal}>
          + Plan Climate Activity
        </button>
      </div>

      {/* Leadership banner */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid #dc2626",
          marginBottom: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a" }}>
            Climate Change Program Lead: <span style={{ color: "#dc2626" }}>Mauwa</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
            Managing environmental awareness campaigns, community water resilience, and indigenous tree planting drives.
          </div>
        </div>
        <span className="badge badge-completed">Lead: Mauwa</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stats Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Indigenous Trees Planted
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626", margin: "0.25rem 0" }}>
            {Number(stats.total_trees || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            Target: 10,000 community seedlings
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Community Participants
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {Number(stats.total_participants || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            Across outreach and field planting workshops
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Completed Activities
          </div>
          <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {stats.completed_activities || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            {stats.planned_activities || 0} additional activities scheduled
          </div>
        </div>
      </div>

      {/* Activities Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Activity Title</th>
              <th>Type</th>
              <th>Date & Location</th>
              <th>Trees Planted</th>
              <th>Participants (Target / Actual)</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {activities.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#a1a1aa", padding: "2.5rem" }}>
                  No climate activities recorded yet. Click "+ Plan Climate Activity" to add one.
                </td>
              </tr>
            ) : (
              activities.map((a) => (
                <tr key={a.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{a.title}</div>
                    {a.outcomes && (
                      <div style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "2px", maxWidth: "280px" }}>
                        {a.outcomes}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{a.activity_type}</span>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, fontSize: "0.8125rem" }}>{a.target_date}</div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a" }}>📍 {a.location}</div>
                  </td>
                  <td>
                    <span style={{ fontWeight: 800, color: a.trees_planted > 0 ? "#dc2626" : "#71717a", fontFamily: "var(--font-mono)" }}>
                      {a.trees_planted > 0 ? `${a.trees_planted} trees` : "0"}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", fontFamily: "var(--font-mono)" }}>
                      {a.actual_participants} / {a.target_participants}
                    </span>
                  </td>
                  <td>
                    <span className={`badge badge-${a.status === "completed" ? "completed" : a.status === "ongoing" ? "in_progress" : "pending"}`}>
                      {a.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                      <button
                        className="btn-secondary"
                        style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                        onClick={() => openEditModal(a)}
                      >
                        Update
                      </button>
                      {isLeader && (
                        <button
                          className="btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleDeleteActivity(a.id)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingActivity ? "Update Climate Activity" : "Plan New Climate Activity"}
              </h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveActivity}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Activity Title *</label>
                  <input
                    type="text"
                    required
                    value={formTitle}
                    onChange={(e) => setFormTitle(e.target.value)}
                    placeholder="e.g. Indigenous Tree Seedling Distribution & Agroforestry"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Activity Type *</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                      <option value="Tree Planting">Tree Planting</option>
                      <option value="Community Outreach">Community Outreach</option>
                      <option value="Water Resilience">Water Resilience</option>
                      <option value="Climate Education">Climate Education</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Target Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Location *</label>
                    <input
                      type="text"
                      required
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="e.g. Kili Foothills Community Ward"
                    />
                  </div>

                  <div className="form-group">
                    <label>Lead Officer</label>
                    <input
                      type="text"
                      value={formLead}
                      onChange={(e) => setFormLead(e.target.value)}
                      placeholder="Mauwa"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.75rem" }}>
                  <div className="form-group">
                    <label>Target People</label>
                    <input
                      type="number"
                      value={formTargetParts}
                      onChange={(e) => setFormTargetParts(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Actual People</label>
                    <input
                      type="number"
                      value={formActualParts}
                      onChange={(e) => setFormActualParts(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Trees Planted</label>
                    <input
                      type="number"
                      value={formTreesPlanted}
                      onChange={(e) => setFormTreesPlanted(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Status</label>
                  <select value={formStatus} onChange={(e) => setFormStatus(e.target.value)}>
                    <option value="planned">Planned</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Activity Outcomes & Field Notes</label>
                  <textarea
                    rows="3"
                    value={formOutcomes}
                    onChange={(e) => setFormOutcomes(e.target.value)}
                    placeholder="Log distribution figures, community feedback, and next steps..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Activity
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
