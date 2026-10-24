import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function Dashboard({ user, onNavigate }) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [announcements, setAnnouncements] = useState([]);
  const [todayReport, setTodayReport] = useState(null);
  const [todayAttendance, setTodayAttendance] = useState(null);
  const [quickPunchLoading, setQuickPunchLoading] = useState(false);
  const [allTodayReports, setAllTodayReports] = useState([]);

  // Check if current user is executive (John Green, Khavai Aghribina, or Super Admin)
  const isExecutive =
    user?.role === "admin" ||
    user?.email === "john.green@amanicenter.org" ||
    user?.email === "khavai@amanicenter.org";

  const userEmail = user?.email?.toLowerCase() || "";
  const userJobTitle = user?.job_title?.toLowerCase() || "";

  useEffect(() => {
    fetchDashboard();
  }, [user]);

  const fetchDashboard = async () => {
    setLoading(true);
    try {
      const promises = [
        api.analytics.getDashboard(),
        api.announcements.getAll(),
        api.reports.getToday(),
        api.attendance.getToday(),
      ];

      // If executive, also fetch all today's submitted reports for the compliance monitor
      if (isExecutive) {
        promises.push(api.reports.getAll({ date: new Date().toISOString().split("T")[0] }));
      }

      const results = await Promise.all(promises);
      setData(results[0].data || null);
      setAnnouncements(results[1].announcements?.slice(0, 3) || []);
      setTodayReport(results[2].report || null);
      setTodayAttendance(results[3].attendance || null);

      if (isExecutive && results[4]) {
        setAllTodayReports(results[4].reports || []);
      }
    } catch (err) {
      console.error("Dashboard data load error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCheckIn = async () => {
    setQuickPunchLoading(true);
    try {
      await api.attendance.checkIn("On-time dashboard arrival");
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setQuickPunchLoading(false);
    }
  };

  const handleQuickCheckOut = async () => {
    setQuickPunchLoading(true);
    try {
      await api.attendance.checkOut();
      fetchDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setQuickPunchLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="page-container" style={{ textAlign: "center", paddingTop: "5rem" }}>
        <div style={{ fontSize: "1.125rem", color: "var(--color-text-muted)" }}>
          Loading your personal operations center...
        </div>
      </div>
    );
  }

  const metrics = data?.metrics || {};

  return (
    <div className="page-container">
      {/* Top Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <h1 className="page-title">
              {isExecutive
                ? `Amani Executive Operations Center: ${user?.name}`
                : `Operations Dashboard: ${user?.name}`}
            </h1>
          </div>
          <p className="page-subtitle">
            {isExecutive
              ? "Organization-wide Governance • All Units, Personnel, Deliverables & Compliance Monitor"
              : `Job Title: ${user?.job_title || "Staff"} • KijijiConnect Digital Hub • Amani Center CBO`}
          </p>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
          {isExecutive && (
            <button className="btn-secondary" onClick={() => onNavigate("analytics")}>
              <span>⚙️ System Audit & Settings</span>
            </button>
          )}

          {!todayReport && (
            <button className="btn-primary" onClick={() => onNavigate("reports")}>
              <span>✍️ Submit Today's Daily Work Report</span>
            </button>
          )}
        </div>
      </div>

      {/* PROMINENT ALL-HANDS COLLABORATION HUB LAUNCHER */}
      <div
        className="card"
        onClick={() => onNavigate("collaboration")}
        style={{
          cursor: "pointer",
          borderLeft: "6px solid #dc2626",
          marginBottom: "1.75rem",
          background: "#ffffff",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
          boxShadow: "var(--shadow-md)",
          transition: "transform 0.15s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "10px",
              background: "#0a0a0a",
              color: "#ffffff",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "1.5rem",
              border: "2px solid #dc2626",
            }}
          >
            🤝
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a" }}>
                Field Work & Ideas Collaboration Hub
              </span>
              <span className="badge badge-completed">All Personnel Access</span>
            </div>
            <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
              Click here to communicate ongoing field activities, pitch new ideas, celebrate milestones, and discuss operational challenges with the whole organization.
            </div>
          </div>
        </div>

        <button className="btn-primary" style={{ pointerEvents: "none" }}>
          Enter Collaboration Hub →
        </button>
      </div>

      {/* MANDATORY DAILY WORK REPORT STATUS (REQUIRED FOR EVERY STAFF & MANAGER) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {/* Daily Accountability Card */}
        <div
          className="card"
          style={{
            background: todayReport ? "#f4f4f5" : "#fffbeb",
            borderColor: todayReport ? "#e4e4e7" : "#fef3c7",
            borderLeft: todayReport ? "4px solid #18181b" : "4px solid #dc2626",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: todayReport ? "#0a0a0a" : "#92400e" }}>
              {todayReport
                ? "✓ Daily Work Report Filed for Today"
                : "⚠️ Daily Work Report Required"}
            </div>
            <div style={{ fontSize: "0.75rem", color: todayReport ? "#52525b" : "#b45309", marginTop: "2px" }}>
              {todayReport
                ? `Logged under ${todayReport.program_name} (${todayReport.status})`
                : "All staff and managers must report today's work done, challenges, and next steps."}
            </div>
          </div>
          <button
            onClick={() => onNavigate("reports")}
            className={todayReport ? "btn-secondary" : "btn-primary"}
            style={{ fontSize: "0.8125rem", padding: "0.45rem 0.85rem" }}
          >
            {todayReport ? "View My Report" : "Submit Report Now"}
          </button>
        </div>

        {/* Shift Attendance Card */}
        <div
          className="card"
          style={{
            background: "#ffffff",
            borderColor: "#e4e4e7",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a" }}>
              ⏱️ Shift Attendance: {todayAttendance ? (todayAttendance.check_out_time ? "Shift Finished" : `Clocked In: ${todayAttendance.check_in_time}`) : "Not Clocked In Today"}
            </div>
            <div style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
              {todayAttendance?.check_out_time ? `Clocked out at ${todayAttendance.check_out_time}` : "Standard hub shift schedule"}
            </div>
          </div>
          {!todayAttendance ? (
            <button
              onClick={handleQuickCheckIn}
              disabled={quickPunchLoading}
              className="btn-primary"
              style={{ fontSize: "0.8125rem", padding: "0.45rem 0.85rem" }}
            >
              Clock In
            </button>
          ) : !todayAttendance.check_out_time ? (
            <button
              onClick={handleQuickCheckOut}
              disabled={quickPunchLoading}
              className="btn-secondary"
              style={{ fontSize: "0.8125rem", padding: "0.45rem 0.85rem" }}
            >
              Clock Out
            </button>
          ) : (
            <span className="badge badge-completed">Shift Complete</span>
          )}
        </div>
      </div>

      {/* Announcements Broadcast */}
      {announcements.length > 0 && (
        <div style={{ marginBottom: "2rem" }}>
          {announcements.map((ann) => (
            <div
              key={ann.id}
              onClick={() => onNavigate("announcements")}
              style={{
                background: ann.priority === "urgent" ? "#fef2f2" : "#f4f4f5",
                border: `1px solid ${ann.priority === "urgent" ? "#fecaca" : "#e4e4e7"}`,
                borderRadius: "var(--radius-lg)",
                padding: "0.85rem 1.25rem",
                marginBottom: "0.75rem",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <span style={{ fontSize: "1.25rem" }}>{ann.priority === "urgent" ? "🚨" : "📢"}</span>
                <div>
                  <span style={{ fontWeight: 800, fontSize: "0.875rem", color: ann.priority === "urgent" ? "#991b1b" : "#0a0a0a" }}>
                    {ann.title}
                  </span>
                  <span style={{ fontSize: "0.8125rem", color: "#52525b", marginLeft: "0.75rem" }}>
                    {ann.content.length > 80 ? `${ann.content.slice(0, 80)}...` : ann.content}
                  </span>
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 700 }}>Read Notice →</span>
            </div>
          ))}
        </div>
      )}

      {/* VIEW A: EXECUTIVE DASHBOARD (JOHN GREEN & KHAVAI AGHRIBINA) */}
      {isExecutive ? (
        <>
          {/* Executive Overview KPIs */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
              gap: "1.25rem",
              marginBottom: "2rem",
            }}
          >
            <div className="card">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#71717a" }}>
                Executive Leadership
              </span>
              <div style={{ fontSize: "1.25rem", fontWeight: 800, color: "#0a0a0a", marginTop: "0.35rem" }}>
                John Green & Khavai
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b" }}>The Boss & Project Manager</div>
            </div>

            <div className="card">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#71717a" }}>
                Active Personnel
              </span>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", marginTop: "0.25rem" }}>
                {metrics.total_active_users || 13}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Across 6 operational units</div>
            </div>

            <div className="card">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#71717a" }}>
                Today's Report Compliance
              </span>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#dc2626", marginTop: "0.25rem" }}>
                {allTodayReports.length} Submitted
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Daily accountability logs</div>
            </div>

            <div className="card">
              <span style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", color: "#71717a" }}>
                Cross-Program Deliverables
              </span>
              <div style={{ fontSize: "2rem", fontWeight: 800, color: "#0a0a0a", marginTop: "0.25rem" }}>
                {metrics.tasks?.completed || 0} / {metrics.tasks?.total || 0}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
                {metrics.tasks?.in_progress || 0} actively underway
              </div>
            </div>
          </div>

          {/* Executive Vox Radio Station Oversight Widget */}
          <div
            className="card"
            style={{
              marginBottom: "2rem",
              borderLeft: "5px solid #dc2626",
              backgroundColor: "#ffffff",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "1rem",
                marginBottom: "1rem",
                paddingBottom: "0.75rem",
                borderBottom: "1px solid var(--color-border)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                <div
                  style={{
                    width: "42px",
                    height: "42px",
                    borderRadius: "10px",
                    background: "#fef2f2",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "1.35rem",
                  }}
                >
                  📻
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
                      Vox Radio Station — Executive Operations Overview
                    </h2>
                    <span className="badge badge-completed">Manager: Maureen Buya</span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
                    Full station broadcast schedule, live on-air shifts, studio handovers & transmission status.
                  </p>
                </div>
              </div>

              <button
                className="btn-primary"
                onClick={() => onNavigate("radio")}
                style={{ fontSize: "0.8125rem", padding: "0.45rem 1rem" }}
              >
                Open Vox Radio Control Desk →
              </button>
            </div>

            {/* Confirmed Presenter Lineup Chips */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "0.75rem",
              }}
            >
              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "#f4f4f5",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    05:00 – 10:00
                  </span>
                  <span style={{ fontSize: "0.6875rem", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, color: "#18181b" }}>
                    Morning
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a", marginTop: "4px" }}>
                  Kula Nzomo
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>Kumekucha Sunrise Show</div>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "#f4f4f5",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    10:00 – 14:00
                  </span>
                  <span style={{ fontSize: "0.6875rem", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, color: "#18181b" }}>
                    Mid-Day
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a", marginTop: "4px" }}>
                  Zaikun Abdulkarim
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>KijijiConnect Midday Magazine</div>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "#f4f4f5",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    14:00 – 17:00
                  </span>
                  <span style={{ fontSize: "0.6875rem", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, color: "#18181b" }}>
                    Afternoon
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a", marginTop: "4px" }}>
                  Yoash Festus
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>Drive-Time Jamhuri Beats</div>
              </div>

              <div
                style={{
                  padding: "0.75rem",
                  borderRadius: "8px",
                  background: "#f4f4f5",
                  border: "1px solid #e4e4e7",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "0.6875rem", fontWeight: 800, color: "#dc2626", textTransform: "uppercase" }}>
                    18:00 – 22:00
                  </span>
                  <span style={{ fontSize: "0.6875rem", background: "#ffffff", padding: "1px 6px", borderRadius: "4px", fontWeight: 700, color: "#18181b" }}>
                    Night
                  </span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a", marginTop: "4px" }}>
                  Yusuf Maro
                </div>
                <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>Vox Night Edition & Debates</div>
              </div>
            </div>
          </div>

          {/* Today's Daily Accountability Reports Monitor (Executive View) */}
          <div className="card" style={{ marginBottom: "2.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <div>
                <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a" }}>
                  Staff & Manager Daily Reporting Compliance (Today)
                </h2>
                <p style={{ fontSize: "0.75rem", color: "#71717a" }}>
                  Live tracking of daily work done, field challenges, and next steps submitted across all programs.
                </p>
              </div>
              <button className="btn-secondary" onClick={() => onNavigate("reports")}>
                View All Reports →
              </button>
            </div>

            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Staff / Manager</th>
                    <th>Unit / Program</th>
                    <th>Work Done Today</th>
                    <th>Challenges Encountered</th>
                    <th>Next Steps</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {allTodayReports.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: "center", color: "#a1a1aa", padding: "2rem" }}>
                        No daily reports filed for today yet.
                      </td>
                    </tr>
                  ) : (
                    allTodayReports.map((rep) => (
                      <tr key={rep.id}>
                        <td>
                          <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{rep.user_name}</div>
                          <div style={{ fontSize: "0.6875rem", color: "#71717a" }}>{rep.user_job_title}</div>
                        </td>
                        <td>
                          <span style={{ fontSize: "0.75rem", fontWeight: 600 }}>{rep.program_name}</span>
                        </td>
                        <td style={{ fontSize: "0.8125rem", maxWidth: "240px" }}>{rep.work_done}</td>
                        <td style={{ fontSize: "0.8125rem", maxWidth: "200px", color: rep.challenges ? "#dc2626" : "#71717a" }}>
                          {rep.challenges || "None reported"}
                        </td>
                        <td style={{ fontSize: "0.8125rem", maxWidth: "200px" }}>{rep.next_steps || "—"}</td>
                        <td>
                          <span className={`badge badge-${rep.status === "reviewed" ? "completed" : "pending"}`}>
                            {rep.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* All Organizational Units Master Directory */}
          <div style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a", marginBottom: "1rem" }}>
              Operational Units & Departments
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {/* Vox Radio */}
              <div
                onClick={() => onNavigate("radio")}
                className="card"
                style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.75rem" }}>📻</span>
                  <span className="badge badge-completed">Manager: Maureen Buya</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a", marginTop: "0.75rem" }}>
                  Vox Radio Station
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.35rem" }}>
                  Confirmed Swahili broadcast slots: Kula Nzomo (05:00-10:00), Zaikun (10:00-14:00), Yoash (14:00-17:00), Yusuf Maro (18:00-22:00).
                </p>
              </div>

              {/* KijijiConnect Hub */}
              <div
                onClick={() => onNavigate("hub")}
                className="card"
                style={{ cursor: "pointer", borderTop: "3px solid #0a0a0a" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.75rem" }}>💻</span>
                  <span className="badge badge-completed">Manager: Bob Wandati</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a", marginTop: "0.75rem" }}>
                  KijijiConnect Digital Hub
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.35rem" }}>
                  Cohort 1 & Cohort 2 digital skills, computer lab workstations, learner projects, and participant tracking.
                </p>
              </div>

              {/* Climate Change */}
              <div
                onClick={() => onNavigate("climate")}
                className="card"
                style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.75rem" }}>🌱</span>
                  <span className="badge badge-completed">Lead: Maua</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a", marginTop: "0.75rem" }}>
                  Climate Change Program
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.35rem" }}>
                  1,000 indigenous tree planting drive, community water catchment resilience, outreach workshops.
                </p>
              </div>

              {/* Online & Social Media */}
              <div
                onClick={() => onNavigate("comms")}
                className="card"
                style={{ cursor: "pointer", borderTop: "3px solid #0a0a0a" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.75rem" }}>📢</span>
                  <span className="badge badge-completed">Lead: Elvis</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a", marginTop: "0.75rem" }}>
                  Online & Social Media
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.35rem" }}>
                  Cross-unit publishing calendar, Facebook/X/Instagram outreach, live post links, and reach metrics.
                </p>
              </div>

              {/* Finance */}
              <div
                onClick={() => onNavigate("finance")}
                className="card"
                style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "1.75rem" }}>💳</span>
                  <span className="badge badge-completed">Officer: Salma</span>
                </div>
                <div style={{ fontWeight: 800, fontSize: "1.0625rem", color: "#0a0a0a", marginTop: "0.75rem" }}>
                  Finance Department
                </div>
                <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.35rem" }}>
                  Zero fictional balance baseline, program budgets, verified vouchers, and financial approvals.
                </p>
              </div>
            </div>
          </div>
        </>
      ) : (
        /* VIEW B: PERSONAL DASHBOARD FOR MANAGERS & STAFF */
        <>
          {/* Personal Unit Quick Jumps */}
          <div style={{ marginBottom: "2rem" }}>
            <h2 style={{ fontSize: "1.125rem", fontWeight: 800, color: "#0a0a0a", marginBottom: "1rem" }}>
              My Assigned Operations & Programs
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
              {/* Vox Radio Staff/Manager */}
              {(userEmail.includes("maureen") || userJobTitle.includes("radio") || userJobTitle.includes("vox") || userEmail.includes("kula") || userEmail.includes("zaikun") || userEmail.includes("yoash") || userEmail.includes("yusuf") || userEmail.includes("nimoo")) && (
                <div
                  onClick={() => onNavigate("radio")}
                  className="card"
                  style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.75rem" }}>📻</span>
                    <span className="badge badge-completed">Vox Radio</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", marginTop: "0.5rem" }}>
                    Vox Radio Broadcast Schedule
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
                    View daily show line-up, studio handover logs, and transmitter notes.
                  </p>
                </div>
              )}

              {/* Digital Hub Staff/Manager */}
              {(userEmail.includes("bob") || userJobTitle.includes("hub") || userEmail.includes("nimoo")) && (
                <div
                  onClick={() => onNavigate("hub")}
                  className="card"
                  style={{ cursor: "pointer", borderTop: "3px solid #0a0a0a" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.75rem" }}>💻</span>
                    <span className="badge badge-completed">Digital Hub</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", marginTop: "0.5rem" }}>
                    KijijiConnect Training Cohorts
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
                    Manage youth learners, attendance registers, and workstation health.
                  </p>
                </div>
              )}

              {/* Climate Lead */}
              {(userEmail.includes("maua") || userJobTitle.includes("climate") || userEmail.includes("nimoo")) && (
                <div
                  onClick={() => onNavigate("climate")}
                  className="card"
                  style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.75rem" }}>🌱</span>
                    <span className="badge badge-completed">Climate Program</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", marginTop: "0.5rem" }}>
                    Climate Outreach & Seedlings
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
                    Track tree planting campaigns, farmer meetings, and water projects.
                  </p>
                </div>
              )}

              {/* Online Comms */}
              {(userEmail.includes("elvis") || userJobTitle.includes("online") || userEmail.includes("nimoo")) && (
                <div
                  onClick={() => onNavigate("comms")}
                  className="card"
                  style={{ cursor: "pointer", borderTop: "3px solid #0a0a0a" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.75rem" }}>📢</span>
                    <span className="badge badge-completed">Online Comms</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", marginTop: "0.5rem" }}>
                    Social Media Calendar
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
                    Publish updates, coordinate coverage, and track reach.
                  </p>
                </div>
              )}

              {/* Finance Officer */}
              {(userEmail.includes("salma") || userJobTitle.includes("finance")) && (
                <div
                  onClick={() => onNavigate("finance")}
                  className="card"
                  style={{ cursor: "pointer", borderTop: "3px solid #dc2626" }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: "1.75rem" }}>💳</span>
                    <span className="badge badge-completed">Finance</span>
                  </div>
                  <div style={{ fontWeight: 800, fontSize: "1rem", color: "#0a0a0a", marginTop: "0.5rem" }}>
                    Financial Vouchers & Audit
                  </div>
                  <p style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "0.25rem" }}>
                    Record receipts, review vouchers, and balance expenditure records.
                  </p>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Quick Nav Shortcuts */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "1rem",
        }}
      >
        <button
          onClick={() => onNavigate("tasks")}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ fontSize: "1.5rem" }}>📋</div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", marginTop: "0.5rem", color: "#0a0a0a" }}>
            Tasks & Deliverables
          </div>
          <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
            Track assigned deadlines and update progress
          </p>
        </button>

        <button
          onClick={() => onNavigate("reports")}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ fontSize: "1.5rem" }}>📄</div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", marginTop: "0.5rem", color: "#0a0a0a" }}>
            Daily Work Logs
          </div>
          <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
            Report daily work done, challenges, and next steps
          </p>
        </button>

        <button
          onClick={() => onNavigate("collaboration")}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ fontSize: "1.5rem" }}>🤝</div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", marginTop: "0.5rem", color: "#0a0a0a" }}>
            Field Work & Ideas Hub
          </div>
          <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
            Share field progress, discuss challenges, and pitch ideas
          </p>
        </button>

        <button
          onClick={() => onNavigate("attendance")}
          className="card"
          style={{ textAlign: "left", cursor: "pointer" }}
        >
          <div style={{ fontSize: "1.5rem" }}>⏱️</div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", marginTop: "0.5rem", color: "#0a0a0a" }}>
            Attendance & Shifts
          </div>
          <p style={{ fontSize: "0.75rem", color: "#71717a", marginTop: "2px" }}>
            Check-in/out records and official leave requests
          </p>
        </button>
      </div>
    </div>
  );
}
