import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function DigitalHub({ user }) {
  const [cohorts, setCohorts] = useState([]);
  const [selectedCohort, setSelectedCohort] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modals
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);

  // New Cohort Form
  const [cohortName, setCohortName] = useState("");
  const [cohortTrack, setCohortTrack] = useState("");
  const [cohortStart, setCohortStart] = useState("");
  const [cohortEnd, setCohortEnd] = useState("");
  const [cohortMentor, setCohortMentor] = useState("Bob Wandate & Nemo Fara");
  const [cohortCapacity, setCohortCapacity] = useState(30);

  // Participant Form
  const [partName, setPartName] = useState("");
  const [partEmail, setPartEmail] = useState("");
  const [partPhone, setPartPhone] = useState("");
  const [partProject, setPartProject] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    fetchCohorts();
  }, []);

  const fetchCohorts = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.hub.getCohorts();
      const list = res.cohorts || [];
      setCohorts(list);
      if (list.length > 0 && !selectedCohort) {
        setSelectedCohort(list[0]);
        fetchParticipants(list[0].id);
      } else if (selectedCohort) {
        fetchParticipants(selectedCohort.id);
      }
    } catch (err) {
      setError(err.message || "Failed to load cohorts.");
    } finally {
      setLoading(false);
    }
  };

  const fetchParticipants = async (cohortId) => {
    try {
      const res = await api.hub.getParticipants(cohortId);
      setParticipants(res.participants || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSelectCohort = (cohort) => {
    setSelectedCohort(cohort);
    fetchParticipants(cohort.id);
  };

  const handleCreateCohort = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.hub.createCohort({
        name: cohortName,
        track: cohortTrack,
        start_date: cohortStart,
        end_date: cohortEnd,
        mentor_name: cohortMentor,
        capacity: cohortCapacity,
      });
      setSuccess("New training cohort created successfully.");
      setShowCohortModal(false);
      setCohortName("");
      setCohortTrack("");
      fetchCohorts();
    } catch (err) {
      setError(err.message || "Failed to create cohort.");
    }
  };

  const handleEnrollParticipant = async (e) => {
    e.preventDefault();
    if (!selectedCohort) return;
    setError("");
    try {
      await api.hub.enrollParticipant(selectedCohort.id, {
        full_name: partName,
        contact_email: partEmail,
        contact_phone: partPhone,
        project_title: partProject,
      });
      setSuccess(`Enrolled ${partName} in ${selectedCohort.name}.`);
      setShowEnrollModal(false);
      setPartName("");
      setPartEmail("");
      setPartPhone("");
      setPartProject("");
      fetchCohorts();
      fetchParticipants(selectedCohort.id);
    } catch (err) {
      setError(err.message || "Failed to enroll participant.");
    }
  };

  const handleDeleteParticipant = async (id) => {
    if (!window.confirm("Remove this participant?")) return;
    try {
      await api.hub.deleteParticipant(id);
      setSuccess("Participant removed.");
      if (selectedCohort) fetchParticipants(selectedCohort.id);
    } catch (err) {
      setError(err.message || "Failed to remove participant.");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>💻</span>
            <h1 className="page-title">KijijiConnect Digital Hub</h1>
          </div>
          <p className="page-subtitle">
            Digital Skills Cohorts, Youth Innovation, Participant Roster & Applied Projects
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {selectedCohort && (
            <button className="btn-secondary" onClick={() => setShowEnrollModal(true)}>
              + Enroll Participant
            </button>
          )}
          {isLeader && (
            <button className="btn-primary" onClick={() => setShowCohortModal(true)}>
              + New Cohort
            </button>
          )}
        </div>
      </div>

      {/* Staff & Hub Notice Card */}
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
            Hub Unit: <span style={{ color: "#dc2626" }}>KijijiConnect Digital Hub</span> (Official Singular Hub)
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
            Key Hub Specialists: <strong>Bob Wandate</strong>, <strong>Nemo Fara</strong>, and <strong>Full-Time Connector (Name TBD / Awaiting Confirmation)</strong>.
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className="badge badge-admin">KijijiConnect Digital Hub</span>
          <span className="badge badge-completed">Cohort Lab Active</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Cohorts Tabs & Selection */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        {cohorts.map((c) => {
          const isSelected = selectedCohort?.id === c.id;
          return (
            <div
              key={c.id}
              onClick={() => handleSelectCohort(c)}
              className="card"
              style={{
                cursor: "pointer",
                borderColor: isSelected ? "#dc2626" : "var(--color-border)",
                borderWidth: isSelected ? "2px" : "1px",
                backgroundColor: isSelected ? "#ffffff" : "#ffffff",
                boxShadow: isSelected ? "var(--shadow-md)" : "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                <span className={`badge badge-${c.status === "active" ? "in_progress" : "pending"}`}>
                  {c.status}
                </span>
                <span style={{ fontSize: "0.75rem", color: "#71717a", fontFamily: "var(--font-mono)" }}>
                  {c.start_date} → {c.end_date}
                </span>
              </div>

              <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", margin: "0.5rem 0 0.25rem" }}>
                {c.name}
              </div>

              <div style={{ fontSize: "0.8125rem", color: "#52525b" }}>
                Track: <strong>{c.track}</strong>
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "1rem", borderTop: "1px solid #f4f4f5", paddingTop: "0.75rem" }}>
                <div style={{ fontSize: "0.75rem", color: "#71717a" }}>
                  Mentor: <strong>{c.mentor_name || "Assigned Hub Lead"}</strong>
                </div>
                <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: isSelected ? "#dc2626" : "#0a0a0a" }}>
                  {c.enrolled_count || 0} / {c.capacity} enrolled
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Participant Roster for Selected Cohort */}
      {selectedCohort && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
                Participant Roster: {selectedCohort.name}
              </h2>
              <p style={{ fontSize: "0.75rem", color: "#71717a" }}>
                Enrolled students, attendance compliance rates, and capstone digital innovation projects.
              </p>
            </div>
            <button className="btn-secondary" onClick={() => setShowEnrollModal(true)}>
              + Add Participant
            </button>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Participant Full Name</th>
                  <th>Contact Info</th>
                  <th>Attendance Rate</th>
                  <th>Digital Innovation Project</th>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {participants.length === 0 ? (
                  <tr>
                    <td colSpan="6" style={{ textAlign: "center", color: "#a1a1aa", padding: "2.5rem" }}>
                      No participants enrolled yet in this cohort. Click "Enroll Participant" to add learners.
                    </td>
                  </tr>
                ) : (
                  participants.map((p) => (
                    <tr key={p.id}>
                      <td style={{ fontWeight: 700, color: "#0a0a0a" }}>{p.full_name}</td>
                      <td>
                        <div style={{ fontSize: "0.8125rem" }}>{p.contact_email || "No email"}</div>
                        <div style={{ fontSize: "0.75rem", color: "#71717a" }}>{p.contact_phone || "No phone"}</div>
                      </td>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                          <div style={{ width: "80px", height: "6px", background: "#f4f4f5", borderRadius: "999px", overflow: "hidden" }}>
                            <div style={{ width: `${p.attendance_rate}%`, height: "100%", background: "#dc2626" }} />
                          </div>
                          <span style={{ fontSize: "0.75rem", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                            {p.attendance_rate}%
                          </span>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{p.project_title || "Pending assignment"}</div>
                      </td>
                      <td>
                        <span className={`badge badge-${p.status === "enrolled" ? "completed" : "pending"}`}>
                          {p.status}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          className="btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleDeleteParticipant(p.id)}
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: Create Cohort */}
      {showCohortModal && (
        <div className="modal-overlay" onClick={() => setShowCohortModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Create Digital Hub Training Cohort</h3>
              <button onClick={() => setShowCohortModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateCohort}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Cohort Name *</label>
                  <input
                    type="text"
                    required
                    value={cohortName}
                    onChange={(e) => setCohortName(e.target.value)}
                    placeholder="e.g. Cohort 3: Full-Stack Web Development"
                  />
                </div>

                <div className="form-group">
                  <label>Specialization / Track *</label>
                  <input
                    type="text"
                    required
                    value={cohortTrack}
                    onChange={(e) => setCohortTrack(e.target.value)}
                    placeholder="e.g. Web Development, Digital Media, Python Basics"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={cohortStart}
                      onChange={(e) => setCohortStart(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      required
                      value={cohortEnd}
                      onChange={(e) => setCohortEnd(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Mentor / Lead Specialist</label>
                    <input
                      type="text"
                      value={cohortMentor}
                      onChange={(e) => setCohortMentor(e.target.value)}
                      placeholder="e.g. Bob Wandate / Nemo Fara"
                    />
                  </div>
                  <div className="form-group">
                    <label>Capacity</label>
                    <input
                      type="number"
                      min="5"
                      max="100"
                      value={cohortCapacity}
                      onChange={(e) => setCohortCapacity(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowCohortModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Create Cohort
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enroll Participant */}
      {showEnrollModal && (
        <div className="modal-overlay" onClick={() => setShowEnrollModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Enroll Participant in {selectedCohort?.name}</h3>
              <button onClick={() => setShowEnrollModal(false)}>✕</button>
            </div>

            <form onSubmit={handleEnrollParticipant}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Full Name *</label>
                  <input
                    type="text"
                    required
                    value={partName}
                    onChange={(e) => setPartName(e.target.value)}
                    placeholder="e.g. Grace Wanjiku"
                  />
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Contact Email</label>
                    <input
                      type="email"
                      value={partEmail}
                      onChange={(e) => setPartEmail(e.target.value)}
                      placeholder="grace@example.com"
                    />
                  </div>
                  <div className="form-group">
                    <label>Phone Number</label>
                    <input
                      type="tel"
                      value={partPhone}
                      onChange={(e) => setPartPhone(e.target.value)}
                      placeholder="+254 700 000 000"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Proposed Digital Capstone Project</label>
                  <input
                    type="text"
                    value={partProject}
                    onChange={(e) => setPartProject(e.target.value)}
                    placeholder="e.g. Community Agro-E-Commerce Hub"
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowEnrollModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Enroll Participant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
