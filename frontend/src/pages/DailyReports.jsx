import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function DailyReports({ user }) {
  const [reports, setReports] = useState([]);
  const [counts, setCounts] = useState({ total: 0, submitted: 0, reviewed: 0, needs_changes: 0 });
  const [todayReport, setTodayReport] = useState(null);
  const [programs, setPrograms] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedProgram, setSelectedProgram] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [viewScope, setViewScope] = useState("my"); // "my" or "all"

  // New/Edit Form
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingReportId, setEditingReportId] = useState(null);
  const [formData, setFormData] = useState({
    program_id: "",
    report_date: new Date().toISOString().slice(0, 10),
    work_done: "",
    challenges: "",
    next_steps: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Review Modal (Leaders)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewReport, setReviewReport] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("reviewed");
  const [leaderComment, setLeaderComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  const isExecutive =
    user?.role === "admin" ||
    user?.email === "john.green@amanicenter.org" ||
    user?.email === "khavai@amanicenter.org";
  const isProgramLeader = user?.role === "program_leader";
  const isLeader = isExecutive || isProgramLeader;

  useEffect(() => {
    fetchMeta();
  }, []);

  useEffect(() => {
    fetchReports();
  }, [selectedStatus, selectedProgram, startDate, endDate, viewScope]);

  const fetchMeta = async () => {
    try {
      const [progRes, todayRes] = await Promise.all([
        api.programs.getAll(),
        api.reports.getToday(),
      ]);
      setPrograms(progRes.programs || []);
      setTodayReport(todayRes.report || null);
    } catch (err) {
      console.error("Meta fetch error:", err);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedStatus) params.status = selectedStatus;
      if (selectedProgram) params.program_id = selectedProgram;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;
      if (!isLeader || viewScope === "my") params.scope = "my";

      const res = await api.reports.getAll(params);
      setReports(res.reports || []);
      setCounts(res.counts || { total: 0, submitted: 0, reviewed: 0, needs_changes: 0 });
    } catch (err) {
      console.error("Reports fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const openNewReportModal = () => {
    setEditingReportId(null);
    setFormData({
      program_id: user?.programs?.[0]?.id || programs[0]?.id || "",
      report_date: new Date().toISOString().slice(0, 10),
      work_done: "",
      challenges: "",
      next_steps: "",
    });
    setFormError("");
    setShowFormModal(true);
  };

  const openEditReportModal = (rep) => {
    setEditingReportId(rep.id);
    setFormData({
      program_id: rep.program_id,
      report_date: rep.report_date ? rep.report_date.slice(0, 10) : new Date().toISOString().slice(0, 10),
      work_done: rep.work_done,
      challenges: rep.challenges || "",
      next_steps: rep.next_steps || "",
    });
    setFormError("");
    setShowFormModal(true);
  };

  const handleReportSubmit = async (e) => {
    e.preventDefault();
    setFormError("");
    setSubmitting(true);

    try {
      if (!formData.program_id || !formData.work_done.trim()) {
        throw new Error("Program and Work Done summary are required.");
      }

      if (editingReportId) {
        await api.reports.update(editingReportId, formData);
      } else {
        await api.reports.submit(formData);
      }

      setShowFormModal(false);
      fetchMeta();
      fetchReports();
    } catch (err) {
      setFormError(err.message || "Failed to submit report.");
    } finally {
      setSubmitting(false);
    }
  };

  const openReviewModal = (rep) => {
    setReviewReport(rep);
    setReviewStatus(rep.status === "needs_changes" ? "needs_changes" : "reviewed");
    setLeaderComment(rep.leader_comment || "");
    setShowReviewModal(true);
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    setReviewSubmitting(true);
    try {
      await api.reports.review(reviewReport.id, {
        status: reviewStatus,
        leader_comment: leaderComment,
      });
      setShowReviewModal(false);
      fetchReports();
    } catch (err) {
      alert("Failed to submit review: " + err.message);
    } finally {
      setReviewSubmitting(false);
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Daily Work Reports</h1>
          <p className="page-subtitle">Submit daily accountability logs, track roadblocks, and review team progress</p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          <button className="btn-secondary" onClick={() => api.analytics.downloadExport("reports")}>
            <span>📥 Export CSV</span>
          </button>

          {isLeader && (
            <div
              style={{
                display: "flex",
                background: "#ffffff",
                border: "1px solid var(--color-border)",
                borderRadius: "var(--radius-md)",
                padding: "2px",
              }}
            >
              <button
                onClick={() => setViewScope("my")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: viewScope === "my" ? "var(--color-primary)" : "transparent",
                  color: viewScope === "my" ? "#fff" : "var(--color-text-muted)",
                }}
              >
                My Reports
              </button>
              <button
                onClick={() => setViewScope("all")}
                style={{
                  padding: "0.4rem 0.85rem",
                  fontSize: "0.8125rem",
                  fontWeight: 600,
                  borderRadius: "6px",
                  background: viewScope === "all" ? "var(--color-primary)" : "transparent",
                  color: viewScope === "all" ? "#fff" : "var(--color-text-muted)",
                }}
              >
                Team Submissions
              </button>
            </div>
          )}

          <button className="btn-primary" onClick={openNewReportModal}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            <span>Submit Daily Report</span>
          </button>
        </div>
      </div>

      {/* Today's Submission Status Card */}
      {todayReport ? (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            background: "#f4f4f5",
            borderColor: "#e4e4e7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ color: "#dc2626", fontWeight: 800 }}>✓</span>
              <span style={{ fontWeight: 700, color: "#0a0a0a", fontSize: "0.9375rem" }}>
                You have submitted your daily report for today ({todayReport.report_date})
              </span>
              <span className={`badge badge-${todayReport.status}`}>{todayReport.status.replace("_", " ")}</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
              Program: <strong>{todayReport.program_name}</strong>
              {todayReport.leader_comment && ` • Feedback: "${todayReport.leader_comment}"`}
            </div>
          </div>

          <button
            onClick={() => openEditReportModal(todayReport)}
            className="btn-secondary"
            style={{ fontSize: "0.8125rem", padding: "0.4rem 0.85rem" }}
          >
            Edit Submission
          </button>
        </div>
      ) : (
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            background: "#fffbeb",
            borderColor: "#fde68a",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "1rem",
          }}
        >
          <div>
            <span style={{ fontWeight: 700, color: "#92400e", fontSize: "0.9375rem" }}>
              ⚠️ Today's report has not been submitted yet
            </span>
            <div style={{ fontSize: "0.8125rem", color: "#b45309", marginTop: "0.25rem" }}>
              Please take 2 minutes before the end of your shift to record what was achieved.
            </div>
          </div>

          <button
            onClick={openNewReportModal}
            className="btn-primary"
            style={{ fontSize: "0.8125rem", padding: "0.45rem 1rem" }}
          >
            Submit Now
          </button>
        </div>
      )}

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
        <div style={{ flex: "0 1 200px" }}>
          <select value={selectedProgram} onChange={(e) => setSelectedProgram(e.target.value)}>
            <option value="">All Programs</option>
            {programs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div style={{ flex: "0 1 180px" }}>
          <select value={selectedStatus} onChange={(e) => setSelectedStatus(e.target.value)}>
            <option value="">All Statuses ({counts.total})</option>
            <option value="submitted">Submitted ({counts.submitted})</option>
            <option value="reviewed">Reviewed ({counts.reviewed})</option>
            <option value="needs_changes">Needs Changes ({counts.needs_changes})</option>
          </select>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>From:</span>
          <input
            type="date"
            style={{ width: "150px" }}
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>To:</span>
          <input
            type="date"
            style={{ width: "150px" }}
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>

        {(selectedProgram || selectedStatus || startDate || endDate) && (
          <button
            onClick={() => {
              setSelectedProgram("");
              setSelectedStatus("");
              setStartDate("");
              setEndDate("");
            }}
            style={{ fontSize: "0.8125rem", color: "var(--color-danger-text)", fontWeight: 600 }}
          >
            Clear Filters
          </button>
        )}
      </div>

      {/* Reports List */}
      {loading ? (
        <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-muted)" }}>Loading reports...</div>
      ) : reports.length === 0 ? (
        <div className="card" style={{ textAlign: "center", padding: "4rem 2rem", color: "var(--color-text-muted)" }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>📄</div>
          <h3 style={{ fontSize: "1.125rem", fontWeight: 700, color: "var(--color-text-main)" }}>No Reports Found</h3>
          <p style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>No reports match the current filter selection.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {reports.map((rep) => (
            <div key={rep.id} className="card" style={{ padding: "1.25rem 1.5rem" }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                  gap: "0.75rem",
                  paddingBottom: "0.75rem",
                  borderBottom: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                    <span style={{ fontSize: "1rem", fontWeight: 700, color: "var(--color-text-main)" }}>
                      {rep.user_name}
                    </span>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        background: "#f1f5f9",
                        padding: "0.2rem 0.55rem",
                        borderRadius: "6px",
                        fontWeight: 600,
                        color: "#334155",
                      }}
                    >
                      {rep.program_name}
                    </span>
                  </div>
                  <div style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    Report Date: <strong>{rep.report_date}</strong> • Logged {rep.submitted_at?.slice(0, 16)}
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  <span className={`badge badge-${rep.status}`}>{rep.status.replace("_", " ")}</span>
                  {isLeader && (
                    <button
                      onClick={() => openReviewModal(rep)}
                      className="btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.75rem" }}
                    >
                      Review / Feedback
                    </button>
                  )}
                  {rep.user_id === user.id && (
                    <button
                      onClick={() => openEditReportModal(rep)}
                      style={{
                        padding: "0.35rem 0.75rem",
                        fontSize: "0.75rem",
                        color: "var(--color-primary)",
                        fontWeight: 600,
                      }}
                    >
                      Edit
                    </button>
                  )}
                </div>
              </div>

              {/* Card Body */}
              <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                <div>
                  <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#64748b" }}>
                    Work Done Today
                  </div>
                  <div style={{ fontSize: "0.875rem", color: "var(--color-text-main)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                    {rep.work_done}
                  </div>
                </div>

                {rep.challenges && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#dc2626" }}>
                      Challenges & Roadblocks
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#991b1b", marginTop: "0.25rem", lineHeight: 1.5 }}>
                      {rep.challenges}
                    </div>
                  </div>
                )}

                {rep.next_steps && (
                  <div>
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#0a0a0a" }}>
                      Next Steps / Priorities For Tomorrow
                    </div>
                    <div style={{ fontSize: "0.875rem", color: "#27272a", marginTop: "0.25rem", lineHeight: 1.5 }}>
                      {rep.next_steps}
                    </div>
                  </div>
                )}

                {rep.leader_comment && (
                  <div
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "var(--radius-md)",
                      padding: "0.75rem 1rem",
                      marginTop: "0.5rem",
                    }}
                  >
                    <div style={{ fontSize: "0.75rem", fontWeight: 700, color: "#475569" }}>
                      Leader Feedback by {rep.reviewer_name || "Coordinator"}:
                    </div>
                    <div style={{ fontSize: "0.8125rem", color: "#1e293b", marginTop: "0.25rem", fontStyle: "italic" }}>
                      "{rep.leader_comment}"
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Submit / Edit Report Modal */}
      {showFormModal && (
        <div className="modal-overlay" onClick={() => setShowFormModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">{editingReportId ? "Edit Daily Report" : "Submit Daily Work Report"}</h3>
              <button onClick={() => setShowFormModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleReportSubmit}>
              <div className="modal-body">
                {formError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{formError}</span>
                  </div>
                )}

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Program *</label>
                    <select
                      required
                      value={formData.program_id}
                      onChange={(e) => setFormData({ ...formData, program_id: e.target.value })}
                    >
                      <option value="">Select Program</option>
                      {programs.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Report Date *</label>
                    <input
                      type="date"
                      required
                      value={formData.report_date}
                      onChange={(e) => setFormData({ ...formData, report_date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>1. Work Accomplished Today *</label>
                  <textarea
                    rows={4}
                    required
                    placeholder="List specific tasks accomplished, broadcasts completed, community field activities conducted, meetings held, or outputs delivered today..."
                    value={formData.work_done}
                    onChange={(e) => setFormData({ ...formData, work_done: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>2. Challenges & Obstacles Faced *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="Describe any field obstacles, technical hiccups, equipment issues, delays, or challenges encountered (or write 'None')..."
                    value={formData.challenges}
                    onChange={(e) => setFormData({ ...formData, challenges: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>3. Next Steps & Priorities For Tomorrow *</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="What specific tasks, broadcasts, or field activities will you focus on next?"
                    value={formData.next_steps}
                    onChange={(e) => setFormData({ ...formData, next_steps: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowFormModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={submitting}>
                  {submitting ? "Saving..." : editingReportId ? "Update Report" : "Submit Report"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Leader Review Modal */}
      {showReviewModal && reviewReport && (
        <div className="modal-overlay" onClick={() => setShowReviewModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Review Daily Report - {reviewReport.user_name}</h3>
              <button onClick={() => setShowReviewModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handleReviewSubmit}>
              <div className="modal-body">
                <div style={{ background: "#f8fafc", padding: "0.85rem", borderRadius: "8px", marginBottom: "1rem" }}>
                  <div style={{ fontSize: "0.75rem", color: "#64748b" }}>
                    {reviewReport.report_date} • {reviewReport.program_name}
                  </div>
                  <div style={{ fontSize: "0.875rem", marginTop: "0.35rem", fontWeight: 500 }}>
                    {reviewReport.work_done}
                  </div>
                </div>

                <div className="form-group">
                  <label>Review Decision *</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                  >
                    <option value="reviewed">Approved / Reviewed</option>
                    <option value="needs_changes">Needs Changes / Clarification</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Feedback & Comments for Staff</label>
                  <textarea
                    rows={3}
                    placeholder="Add recognition, guidance, follow-up instructions, or questions..."
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
                  {reviewSubmitting ? "Submitting Review..." : "Save Review"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
