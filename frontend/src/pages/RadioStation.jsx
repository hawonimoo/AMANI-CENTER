import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function RadioStation({ user }) {
  const [schedules, setSchedules] = useState([]);
  const [handovers, setHandovers] = useState([]);
  const [presenters, setPresenters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // Modal states
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [showHandoverModal, setShowHandoverModal] = useState(false);

  // Form states - Schedule
  const [formProgramTitle, setFormProgramTitle] = useState("");
  const [formPresenters, setFormPresenters] = useState("");
  const [formTimeSlot, setFormTimeSlot] = useState("");
  const [formTimePeriodStatus, setFormTimePeriodStatus] = useState("unconfirmed");
  const [formDayOfWeek, setFormDayOfWeek] = useState("Monday - Sunday");
  const [formIsOverlap, setFormIsOverlap] = useState(false);
  const [formOverlapNotes, setFormOverlapNotes] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // Form states - Handover
  const [formShiftDate, setFormShiftDate] = useState(new Date().toISOString().split("T")[0]);
  const [formHandoverTime, setFormHandoverTime] = useState("");
  const [formOutgoingPresenter, setFormOutgoingPresenter] = useState("");
  const [formIncomingPresenter, setFormIncomingPresenter] = useState("");
  const [formEquipmentStatus, setFormEquipmentStatus] = useState("Operational - All Systems Normal");
  const [formTransmissionNotes, setFormTransmissionNotes] = useState("");
  const [formHandoverNotes, setFormHandoverNotes] = useState("");

  const isExecutive =
    user?.role === "admin" ||
    user?.email === "john.green@amanicenter.org" ||
    user?.email === "khavai@amanicenter.org";
  const isAdmin = isExecutive || user?.role === "admin";
  const isLeader = isExecutive || ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    setError("");
    try {
      const [schedRes, handRes, presRes] = await Promise.all([
        api.radio.getSchedules(),
        api.radio.getHandovers(),
        api.radio.getPresenters(),
      ]);
      setSchedules(schedRes.schedules || []);
      setHandovers(handRes.handovers || []);
      setPresenters(presRes.presenters || []);
    } catch (err) {
      setError(err.message || "Failed to load radio station data.");
    } finally {
      setLoading(false);
    }
  };

  const openNewScheduleModal = () => {
    setEditingSchedule(null);
    setFormProgramTitle("");
    setFormPresenters("");
    setFormTimeSlot("");
    setFormTimePeriodStatus("unconfirmed");
    setFormDayOfWeek("Monday - Sunday");
    setFormIsOverlap(false);
    setFormOverlapNotes("");
    setFormNotes("");
    setShowScheduleModal(true);
  };

  const openEditScheduleModal = (s) => {
    setEditingSchedule(s);
    setFormProgramTitle(s.program_title);
    setFormPresenters(s.presenters);
    setFormTimeSlot(s.time_slot);
    setFormTimePeriodStatus(s.time_period_status || "unconfirmed");
    setFormDayOfWeek(s.day_of_week);
    setFormIsOverlap(Boolean(s.is_overlap_flagged));
    setFormOverlapNotes(s.overlap_notes || "");
    setFormNotes(s.notes || "");
    setShowScheduleModal(true);
  };

  const handleSaveSchedule = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const payload = {
        program_title: formProgramTitle,
        presenters: formPresenters,
        time_slot: formTimeSlot,
        time_period_status: formTimePeriodStatus,
        day_of_week: formDayOfWeek,
        is_overlap_flagged: formIsOverlap,
        overlap_notes: formOverlapNotes,
        notes: formNotes,
      };

      if (editingSchedule) {
        await api.radio.updateSchedule(editingSchedule.id, payload);
        setSuccess("Radio schedule updated successfully.");
      } else {
        await api.radio.createSchedule(payload);
        setSuccess("New radio schedule slot created.");
      }
      setShowScheduleModal(false);
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to save schedule.");
    }
  };

  const handleDeleteSchedule = async (id) => {
    if (!window.confirm("Are you sure you want to remove this radio schedule slot?")) return;
    try {
      await api.radio.deleteSchedule(id);
      setSuccess("Radio schedule removed.");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to delete schedule.");
    }
  };

  const handleSaveHandover = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.radio.logHandover({
        shift_date: formShiftDate,
        time_slot: formHandoverTime,
        outgoing_presenter: formOutgoingPresenter,
        incoming_presenter: formIncomingPresenter,
        equipment_status: formEquipmentStatus,
        transmission_notes: formTransmissionNotes,
        handover_notes: formHandoverNotes,
      });
      setSuccess("Shift handover logged successfully.");
      setShowHandoverModal(false);
      // Reset form
      setFormOutgoingPresenter("");
      setFormIncomingPresenter("");
      setFormHandoverNotes("");
      fetchData();
    } catch (err) {
      setError(err.message || "Failed to log handover.");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>📻</span>
            <h1 className="page-title">Vox Radio Station Operations</h1>
          </div>
          <p className="page-subtitle">
            Community Broadcast Scheduling, Presenter Lineup, Shift Handovers & Transmission Logs
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            className="btn-secondary"
            onClick={() => setShowHandoverModal(true)}
          >
            + Log Shift Handover
          </button>
          {isLeader && (
            <button className="btn-primary" onClick={openNewScheduleModal}>
              + Add Broadcast Slot
            </button>
          )}
        </div>
      </div>

      {/* Leadership Notification Alert */}
      <div
        className="card"
        style={{
          backgroundColor: "#ffffff",
          borderColor: "#dc2626",
          borderLeftWidth: "4px",
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
            Vox Radio Station Manager: <span style={{ color: "#dc2626" }}>Maureen Buya</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
            The organization operates <strong>Vox Radio Station</strong>. Broadcast hours have been confirmed: Kula Nzomo (05:00–10:00), Zaikun Abdulkarim (10:00–14:00), Yoash Festus (14:00–17:00), and Yusuf Maro (18:00–22:00).
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <span className="badge badge-completed">Manager: Maureen Buya</span>
          <span className="badge badge-completed">✓ Schedule Confirmed</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Presenters Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Vox Presenters Roster
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {presenters.length} On-Air Staff
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            Kula Nzomo, Zaikun Abdulkarim, Yoash Festus, Yusuf Maro
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Active Broadcast Slots
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {schedules.length} Scheduled
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            2 overlapping slots flagged for manager review
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Studio Handover Records
          </div>
          <div style={{ fontSize: "1.75rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {handovers.length} Logs
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            Equipment & transmission compliance logs
          </div>
        </div>
      </div>

      {/* Schedules Table */}
      <div style={{ marginBottom: "2.5rem" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
            Broadcast Programs & Presenter Schedule
          </h2>
          <span style={{ fontSize: "0.8125rem", color: "#71717a" }}>
            Preserved verbatim per organizational instructions
          </span>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Broadcast Program</th>
                <th>Presenter(s)</th>
                <th>Preserved Time Slot</th>
                <th>AM/PM Confirmation</th>
                <th>Schedule Conflict / Overlap</th>
                <th>Status</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {schedules.length === 0 ? (
                <tr>
                  <td colSpan="7" style={{ textAlign: "center", color: "#a1a1aa", padding: "2rem" }}>
                    No broadcast schedules registered.
                  </td>
                </tr>
              ) : (
                schedules.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{s.program_title}</div>
                      <div style={{ fontSize: "0.75rem", color: "#71717a" }}>{s.day_of_week}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "#18181b" }}>{s.presenters}</div>
                      {s.presenters.includes("Cool and Zomo and Luzi") && (
                        <div style={{ fontSize: "0.6875rem", color: "#dc2626", fontWeight: 600 }}>
                          * Provided as 3 names; confirm individual vs joint shifts
                        </div>
                      )}
                    </td>
                    <td>
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.875rem",
                          fontFamily: "var(--font-mono)",
                          background: "#f4f4f5",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #e4e4e7",
                        }}
                      >
                        {s.time_slot}
                      </span>
                    </td>
                    <td>
                      {s.time_period_status === "unconfirmed" ? (
                        <span className="badge badge-pending">⚠️ Unconfirmed</span>
                      ) : (
                        <span className="badge badge-completed">✓ {s.time_period_status} Confirmed</span>
                      )}
                    </td>
                    <td>
                      {s.is_overlap_flagged ? (
                        <div style={{ maxWidth: "260px" }}>
                          <span className="badge badge-needs_changes" style={{ marginBottom: "4px" }}>
                            ⚠️ Overlap Detected
                          </span>
                          <div style={{ fontSize: "0.6875rem", color: "#991b1b", lineHeight: 1.25 }}>
                            {s.overlap_notes}
                          </div>
                        </div>
                      ) : (
                        <span style={{ fontSize: "0.75rem", color: "#71717a" }}>No overlap</span>
                      )}
                    </td>
                    <td>
                      <span className={`badge badge-${s.status === "active" ? "completed" : "pending"}`}>
                        {s.status}
                      </span>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                          onClick={() => openEditScheduleModal(s)}
                        >
                          Edit / Confirm
                        </button>
                        {isAdmin && (
                          <button
                            className="btn-danger"
                            style={{ padding: "0.35rem 0.65rem", fontSize: "0.75rem" }}
                            onClick={() => handleDeleteSchedule(s.id)}
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
      </div>

      {/* Handover Logs Section */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
              Studio & Shift Handover Records
            </h2>
            <p style={{ fontSize: "0.75rem", color: "#71717a" }}>
              Logged handover between on-air and incoming presenters, equipment condition, and broadcast notes.
            </p>
          </div>
          <button className="btn-secondary" onClick={() => setShowHandoverModal(true)}>
            + Log Handover
          </button>
        </div>

        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date & Slot</th>
                <th>Outgoing Presenter</th>
                <th>Incoming Presenter</th>
                <th>Equipment Status</th>
                <th>Handover Notes</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {handovers.length === 0 ? (
                <tr>
                  <td colSpan="6" style={{ textAlign: "center", color: "#a1a1aa", padding: "2rem" }}>
                    No handover logs recorded yet.
                  </td>
                </tr>
              ) : (
                handovers.map((h) => (
                  <tr key={h.id}>
                    <td>
                      <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{h.shift_date}</div>
                      <div style={{ fontSize: "0.75rem", color: "#71717a", fontFamily: "var(--font-mono)" }}>
                        {h.time_slot}
                      </div>
                    </td>
                    <td style={{ fontWeight: 600 }}>{h.outgoing_presenter}</td>
                    <td style={{ fontWeight: 600, color: "#dc2626" }}>{h.incoming_presenter}</td>
                    <td>
                      <span
                        style={{
                          fontSize: "0.75rem",
                          background: "#f4f4f5",
                          padding: "0.2rem 0.5rem",
                          borderRadius: "4px",
                          border: "1px solid #e4e4e7",
                        }}
                      >
                        {h.equipment_status}
                      </span>
                    </td>
                    <td style={{ fontSize: "0.8125rem", maxWidth: "300px" }}>{h.handover_notes}</td>
                    <td style={{ fontSize: "0.75rem", color: "#71717a" }}>{h.logged_by_name || "Staff"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Add/Edit Schedule */}
      {showScheduleModal && (
        <div className="modal-overlay" onClick={() => setShowScheduleModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">
                {editingSchedule ? "Edit Broadcast Schedule & Resolve Overlap" : "New Broadcast Schedule Slot"}
              </h3>
              <button onClick={() => setShowScheduleModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveSchedule}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Program Title *</label>
                  <input
                    type="text"
                    required
                    value={formProgramTitle}
                    onChange={(e) => setFormProgramTitle(e.target.value)}
                    placeholder="e.g. Morning Sunrise Broadcast"
                  />
                </div>

                <div className="form-group">
                  <label>Presenter / Host(s) *</label>
                  <input
                    type="text"
                    required
                    value={formPresenters}
                    onChange={(e) => setFormPresenters(e.target.value)}
                    placeholder="e.g. Yusuf Maro or Cool, Zomo, Luzi"
                  />
                  <span style={{ fontSize: "0.6875rem", color: "#71717a" }}>
                    Administrator may separate group names into individual presenter records if desired.
                  </span>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Time Slot *</label>
                    <input
                      type="text"
                      required
                      value={formTimeSlot}
                      onChange={(e) => setFormTimeSlot(e.target.value)}
                      placeholder="e.g. 4:00–8:00 or 8:00–11:00"
                    />
                  </div>

                  <div className="form-group">
                    <label>AM / PM Confirmation</label>
                    <select
                      value={formTimePeriodStatus}
                      onChange={(e) => setFormTimePeriodStatus(e.target.value)}
                    >
                      <option value="unconfirmed">⚠️ Unconfirmed (Pending Admin Check)</option>
                      <option value="AM">Confirmed AM (Morning)</option>
                      <option value="PM">Confirmed PM (Evening / Afternoon)</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Broadcast Days</label>
                  <input
                    type="text"
                    value={formDayOfWeek}
                    onChange={(e) => setFormDayOfWeek(e.target.value)}
                    placeholder="e.g. Monday - Friday, Daily"
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <input
                      type="checkbox"
                      style={{ width: "auto" }}
                      checked={formIsOverlap}
                      onChange={(e) => setFormIsOverlap(e.target.checked)}
                    />
                    <span>Flag as Overlapping / Schedule Conflict</span>
                  </label>
                </div>

                {formIsOverlap && (
                  <div className="form-group">
                    <label>Overlap / Conflict Details</label>
                    <textarea
                      rows="2"
                      value={formOverlapNotes}
                      onChange={(e) => setFormOverlapNotes(e.target.value)}
                      placeholder="Explain the conflict and instructions for resolution..."
                    />
                  </div>
                )}

                <div className="form-group">
                  <label>Additional Notes / Production Instructions</label>
                  <textarea
                    rows="2"
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Topics, technical setup, or producer instructions..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowScheduleModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Schedule Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Shift Handover */}
      {showHandoverModal && (
        <div className="modal-overlay" onClick={() => setShowHandoverModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Log Studio Shift Handover</h3>
              <button onClick={() => setShowHandoverModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSaveHandover}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Shift Date *</label>
                    <input
                      type="date"
                      required
                      value={formShiftDate}
                      onChange={(e) => setFormShiftDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Shift Time Slot *</label>
                    <input
                      type="text"
                      required
                      value={formHandoverTime}
                      onChange={(e) => setFormHandoverTime(e.target.value)}
                      placeholder="e.g. 4:00–8:00 -> 8:00–11:00"
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Outgoing Presenter *</label>
                    <input
                      type="text"
                      required
                      value={formOutgoingPresenter}
                      onChange={(e) => setFormOutgoingPresenter(e.target.value)}
                      placeholder="e.g. Cool / Zomo / Luzi"
                    />
                  </div>
                  <div className="form-group">
                    <label>Incoming Presenter *</label>
                    <input
                      type="text"
                      required
                      value={formIncomingPresenter}
                      onChange={(e) => setFormIncomingPresenter(e.target.value)}
                      placeholder="e.g. Yusuf Maro"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Equipment & Studio Condition</label>
                  <input
                    type="text"
                    value={formEquipmentStatus}
                    onChange={(e) => setFormEquipmentStatus(e.target.value)}
                    placeholder="e.g. Microphones OK, Mixer OK, Transmitter 98.4 normal"
                  />
                </div>

                <div className="form-group">
                  <label>Transmission / Signal Notes</label>
                  <input
                    type="text"
                    value={formTransmissionNotes}
                    onChange={(e) => setFormTransmissionNotes(e.target.value)}
                    placeholder="e.g. Stable signal across regional coverage"
                  />
                </div>

                <div className="form-group">
                  <label>Handover Notes & Pending Call-ins *</label>
                  <textarea
                    rows="3"
                    required
                    value={formHandoverNotes}
                    onChange={(e) => setFormHandoverNotes(e.target.value)}
                    placeholder="Topics discussed, listeners queued on lines, advertisements run..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowHandoverModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Handover Record
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
