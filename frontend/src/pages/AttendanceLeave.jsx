import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function AttendanceLeave({ user }) {
  const [activeTab, setActiveTab] = useState("attendance"); // "attendance" or "leaves"
  const [todayAtt, setTodayAtt] = useState(null);
  const [attendanceList, setAttendanceList] = useState([]);
  const [leavesList, setLeavesList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Leave Form Modal
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveForm, setLeaveForm] = useState({
    leave_type: "annual",
    start_date: "",
    end_date: "",
    reason: "",
  });
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);
  const [leaveError, setLeaveError] = useState("");

  // Leave Review Modal (Leaders)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [leaderComment, setLeaderComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  // Filters
  const [searchDate, setSearchDate] = useState("");
  const [actionMessage, setActionMessage] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);

  useEffect(() => {
    loadAllData();
  }, [activeTab, searchDate]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [todayRes, attRes, leavesRes] = await Promise.all([
        api.attendance.getToday(),
        api.attendance.getHistory(searchDate ? { attendance_date: searchDate } : {}),
        api.attendance.getLeaves(),
      ]);

      setTodayAtt(todayRes.attendance || null);
      setAttendanceList(attRes.attendance || []);
      setLeavesList(leavesRes.leaves || []);
    } catch (err) {
      console.error("Failed to load attendance records:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setActionMessage("");
    try {
      const res = await api.attendance.checkIn("On-time desk arrival");
      setActionMessage(res.message);
      loadAllData();
    } catch (err) {
      alert("Check-in error: " + err.message);
    }
  };

  const handleCheckOut = async () => {
    setActionMessage("");
    try {
      const res = await api.attendance.checkOut();
      setActionMessage(res.message);
      loadAllData();
    } catch (err) {
      alert("Check-out error: " + err.message);
    }
  };

  const handleLeaveSubmit = async (e) => {
    e.preventDefault();
    setLeaveError("");
    setLeaveSubmitting(true);
    try {
      await api.attendance.submitLeave(leaveForm);
      setShowLeaveModal(false);
      setLeaveForm({ leave_type: "annual", start_date: "", end_date: "", reason: "" });
      loadAllData();
    } catch (err) {
      setLeaveError(err.message || "Failed to submit leave request.");
    } finally {
      setLeaveSubmitting(false);
    }
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await api.attendance.reviewLeave(selectedLeave.id, {
        status: reviewStatus,
        leader_comment: leaderComment,
      });
      setShowReviewModal(false);
      loadAllData();
    } catch (err) {
      alert("Review error: " + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance & Leave Management</h1>
          <p className="page-subtitle">Track daily work shifts, log check-in/out stamps, and manage official leave requests</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button className="btn-secondary" onClick={() => api.analytics.downloadExport("attendance")}>
            <span>📥 Export CSV</span>
          </button>
          <button className="btn-primary" onClick={() => setShowLeaveModal(true)}>
            <span>+ Apply for Leave</span>
          </button>
        </div>
      </div>

      {actionMessage && (
        <div className="alert alert-success" style={{ marginBottom: "1.25rem" }}>
          <span>✓ {actionMessage}</span>
        </div>
      )}

      {/* Today's Punch Card Banner */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, #1e293b, #0f172a)",
          color: "#ffffff",
          padding: "1.5rem 1.75rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1.5rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.8125rem", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Today's Attendance Station
          </div>
          <div style={{ fontSize: "1.375rem", fontWeight: 800, marginTop: "0.25rem" }}>
            {todayAtt ? (
              <span>
                Checked in at <span style={{ color: "#38bdf8" }}>{todayAtt.check_in_time}</span>
                {todayAtt.check_out_time && (
                  <span> • Out: <span style={{ color: "#34d399" }}>{todayAtt.check_out_time}</span></span>
                )}
              </span>
            ) : (
              <span>Not Checked In Yet Today</span>
            )}
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#cbd5e1", marginTop: "0.25rem" }}>
            Standard working shift: 08:30 AM – 05:00 PM local hub time
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          {!todayAtt ? (
            <button
              onClick={handleCheckIn}
              style={{
                backgroundColor: "#dc2626",
                color: "#ffffff",
                padding: "0.65rem 1.25rem",
                borderRadius: "var(--radius-md)",
                fontWeight: 700,
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>⏱️ Check In Now</span>
            </button>
          ) : !todayAtt.check_out_time ? (
            <button
              onClick={handleCheckOut}
              style={{
                backgroundColor: "#0a0a0a",
                color: "#ffffff",
                padding: "0.65rem 1.25rem",
                borderRadius: "var(--radius-md)",
                fontWeight: 700,
                fontSize: "0.875rem",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <span>🏁 Check Out For The Day</span>
            </button>
          ) : (
            <div
              style={{
                background: "#f4f4f5",
                color: "#0a0a0a",
                border: "1px solid #d4d4d8",
                padding: "0.5rem 1rem",
                borderRadius: "var(--radius-md)",
                fontWeight: 700,
                fontSize: "0.8125rem",
              }}
            >
              ✓ Full Shift Completed Today
            </div>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          marginBottom: "1.5rem",
          gap: "1.5rem",
        }}
      >
        <button
          onClick={() => setActiveTab("attendance")}
          style={{
            padding: "0.65rem 0",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: activeTab === "attendance" ? "var(--color-primary)" : "var(--color-text-muted)",
            borderBottom: activeTab === "attendance" ? "2px solid var(--color-primary)" : "none",
            marginBottom: "-1px",
          }}
        >
          Daily Attendance Records ({attendanceList.length})
        </button>

        <button
          onClick={() => setActiveTab("leaves")}
          style={{
            padding: "0.65rem 0",
            fontSize: "0.9375rem",
            fontWeight: 700,
            color: activeTab === "leaves" ? "var(--color-primary)" : "var(--color-text-muted)",
            borderBottom: activeTab === "leaves" ? "2px solid var(--color-primary)" : "none",
            marginBottom: "-1px",
          }}
        >
          Leave Applications ({leavesList.length})
        </button>
      </div>

      {/* Tab 1: Attendance Table */}
      {activeTab === "attendance" && (
        <>
          <div className="card" style={{ padding: "0.85rem 1.25rem", marginBottom: "1.25rem", display: "flex", gap: "1rem" }}>
            <input
              type="date"
              style={{ width: "220px" }}
              value={searchDate}
              onChange={(e) => setSearchDate(e.target.value)}
            />
            {searchDate && (
              <button onClick={() => setSearchDate("")} style={{ fontSize: "0.8125rem", color: "#dc2626", fontWeight: 600 }}>
                Clear Date Filter ✕
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading records...</div>
          ) : attendanceList.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              No attendance records recorded for this filter.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Staff Member</th>
                    <th>Hub</th>
                    <th>Check In</th>
                    <th>Check Out</th>
                    <th>Status</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceList.map((a) => (
                    <tr key={a.id}>
                      <td style={{ fontWeight: 600 }}>{a.attendance_date}</td>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{a.user_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{a.user_email}</div>
                      </td>
                      <td>{a.hub_name || "Headquarters"}</td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#0369a1" }}>{a.check_in_time || "—"}</span>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "#0a0a0a" }}>{a.check_out_time || "—"}</span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            fontWeight: 600,
                            padding: "0.2rem 0.55rem",
                            borderRadius: "999px",
                            background: a.status === "present" ? "#18181b" : "#fffbeb",
                            color: a.status === "present" ? "#ffffff" : "#b45309",
                          }}
                        >
                          {a.status}
                        </span>
                      </td>
                      <td style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)" }}>{a.notes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Tab 2: Leaves Table */}
      {activeTab === "leaves" && (
        <>
          {loading ? (
            <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading leaves...</div>
          ) : leavesList.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-muted)" }}>
              No leave applications recorded.
            </div>
          ) : (
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Applicant</th>
                    <th>Leave Type</th>
                    <th>Dates</th>
                    <th>Reason</th>
                    <th>Status</th>
                    <th>Leader Feedback</th>
                    {isLeader && <th style={{ textAlign: "right" }}>Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {leavesList.map((l) => (
                    <tr key={l.id}>
                      <td>
                        <div style={{ fontWeight: 700, color: "var(--color-text-main)" }}>{l.user_name}</div>
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>{l.hub_name}</div>
                      </td>
                      <td>
                        <span style={{ textTransform: "capitalize", fontWeight: 600 }}>{l.leave_type} Leave</span>
                      </td>
                      <td>
                        <div style={{ fontSize: "0.8125rem", fontWeight: 600 }}>
                          {l.start_date} <span style={{ color: "#94a3b8" }}>→</span> {l.end_date}
                        </div>
                      </td>
                      <td style={{ fontSize: "0.8125rem", maxWidth: "260px" }}>{l.reason}</td>
                      <td>
                        <span className={`badge badge-${l.status}`}>{l.status}</span>
                      </td>
                      <td>
                        {l.leader_comment ? (
                          <div style={{ fontSize: "0.75rem", fontStyle: "italic", color: "#475569" }}>
                            "{l.leader_comment}" ({l.reviewer_name})
                          </div>
                        ) : (
                          <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>Awaiting review</span>
                        )}
                      </td>
                      {isLeader && (
                        <td style={{ textAlign: "right" }}>
                          {l.status === "pending" && (
                            <button
                              onClick={() => {
                                setSelectedLeave(l);
                                setReviewStatus("approved");
                                setLeaderComment("");
                                setShowReviewModal(true);
                              }}
                              className="btn-primary"
                              style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
                            >
                              Review
                            </button>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Leave Request Form Modal */}
      {showLeaveModal && (
        <div className="modal-overlay" onClick={() => setShowLeaveModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Apply For Leave</h3>
              <button onClick={() => setShowLeaveModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleLeaveSubmit}>
              <div className="modal-body">
                {leaveError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{leaveError}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Leave Category *</label>
                  <select
                    value={leaveForm.leave_type}
                    onChange={(e) => setLeaveForm({ ...leaveForm, leave_type: e.target.value })}
                  >
                    <option value="annual">Annual Leave</option>
                    <option value="sick">Medical / Sick Leave</option>
                    <option value="personal">Personal Leave</option>
                    <option value="maternity">Maternity / Paternity Leave</option>
                    <option value="emergency">Emergency Leave</option>
                  </select>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Start Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.start_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, start_date: e.target.value })}
                    />
                  </div>

                  <div className="form-group">
                    <label>End Date *</label>
                    <input
                      type="date"
                      required
                      value={leaveForm.end_date}
                      onChange={(e) => setLeaveForm({ ...leaveForm, end_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Reason & Justification *</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Provide details regarding the leave request, handover plan, or medical grounds..."
                    value={leaveForm.reason}
                    onChange={(e) => setLeaveForm({ ...leaveForm, reason: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowLeaveModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={leaveSubmitting}>
                  {leaveSubmitting ? "Submitting..." : "Submit Application"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Review Leave Modal (Leaders) */}
      {showReviewModal && selectedLeave && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Review Leave: {selectedLeave.user_name}</h3>
              <button onClick={() => setShowReviewModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="modal-body">
                <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                    {selectedLeave.leave_type.toUpperCase()} Leave ({selectedLeave.start_date} to {selectedLeave.end_date})
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#475569", marginTop: "0.35rem" }}>
                    Reason: {selectedLeave.reason}
                  </div>
                </div>

                <div className="form-group">
                  <label>Decision *</label>
                  <select value={reviewStatus} onChange={(e) => setReviewStatus(e.target.value)}>
                    <option value="approved">Approve Application</option>
                    <option value="rejected">Reject Application</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Leader Notes / Reason for Decision</label>
                  <textarea
                    rows={3}
                    placeholder="Enter approval conditions or justification for rejection..."
                    value={leaderComment}
                    onChange={(e) => setLeaderComment(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowReviewModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={reviewSubmitting}>
                  {reviewSubmitting ? "Saving..." : "Confirm Decision"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
