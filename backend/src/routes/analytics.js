const express = require("express");
const db = require("../db");
const { authRequired, adminOnly, leaderOnly } = require("../middleware");
const { logAudit } = require("../utils/audit");

const router = express.Router();

// Helper to escape CSV cell value
function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

// GET /api/analytics/dashboard - Real role-specific database metrics
router.get("/dashboard", authRequired, async (req, res) => {
  try {
    const role = req.user.role;
    const userId = req.user.id;
    const hubId = req.user.hub_id;
    const today = new Date().toISOString().slice(0, 10);

    const data = {
      role,
      user_name: req.user.name,
      hub_name: req.user.hub_name,
      today,
    };

    if (role === "admin") {
      // 1. Overall counts
      const [hubCount] = await db.query("SELECT COUNT(*) AS total FROM hubs");
      const [progCount] = await db.query("SELECT COUNT(*) AS total FROM programs");
      const [userCount] = await db.query("SELECT COUNT(*) AS total, SUM(CASE WHEN role='staff' THEN 1 ELSE 0 END) AS staff_total FROM users WHERE is_active = 1");
      const [taskCounts] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status != 'completed' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
        FROM tasks
      `);
      const [reportCounts] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pending_review,
          SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed,
          SUM(CASE WHEN report_date = ? THEN 1 ELSE 0 END) AS today_submissions
        FROM daily_reports
      `, [today]);

      // Hub comparison
      const [hubStats] = await db.query(`
        SELECT 
          h.id, h.name,
          (SELECT COUNT(*) FROM programs p WHERE p.hub_id = h.id) AS program_count,
          (SELECT COUNT(*) FROM users u WHERE u.hub_id = h.id AND u.is_active = 1) AS staff_count,
          (SELECT COUNT(*) FROM tasks t JOIN programs p ON t.program_id = p.id WHERE p.hub_id = h.id AND t.status = 'completed') AS completed_tasks,
          (SELECT COUNT(*) FROM tasks t JOIN programs p ON t.program_id = p.id WHERE p.hub_id = h.id) AS total_tasks
        FROM hubs h
        ORDER BY h.name ASC
      `);

      // Attendance today
      const [attendanceStats] = await db.query(`
        SELECT 
          SUM(CASE WHEN status = 'present' THEN 1 ELSE 0 END) AS present,
          SUM(CASE WHEN status = 'late' THEN 1 ELSE 0 END) AS late,
          COUNT(*) AS total_checked_in
        FROM attendance WHERE attendance_date = ?
      `, [today]);

      // Recent audit log entries
      const [recentAudits] = await db.query(`
        SELECT al.*, u.name AS user_name, u.role AS user_role
        FROM audit_logs al
        LEFT JOIN users u ON al.user_id = u.id
        ORDER BY al.created_at DESC LIMIT 6
      `);

      data.metrics = {
        total_hubs: hubCount[0].total,
        total_programs: progCount[0].total,
        total_active_users: userCount[0].total,
        total_staff: userCount[0].staff_total,
        tasks: taskCounts[0],
        reports: reportCounts[0],
        attendance: attendanceStats[0],
        hub_breakdown: hubStats,
        recent_audits: recentAudits,
      };
    } else if (role === "hub_leader") {
      // Hub leader scoped metrics
      const [progCount] = await db.query("SELECT COUNT(*) AS total FROM programs WHERE hub_id = ?", [hubId]);
      const [userCount] = await db.query("SELECT COUNT(*) AS total FROM users WHERE hub_id = ? AND is_active = 1", [hubId]);
      const [taskCounts] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN t.status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN t.status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN t.status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN t.status != 'completed' AND t.due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
        FROM tasks t
        JOIN programs p ON t.program_id = p.id
        WHERE p.hub_id = ?
      `, [hubId]);

      const [reportCounts] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN dr.status = 'submitted' THEN 1 ELSE 0 END) AS pending_review,
          SUM(CASE WHEN dr.status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed
        FROM daily_reports dr
        JOIN programs p ON dr.program_id = p.id
        WHERE p.hub_id = ?
      `, [hubId]);

      const [attendanceStats] = await db.query(`
        SELECT 
          COUNT(*) AS checked_in_today,
          SUM(CASE WHEN a.status = 'present' THEN 1 ELSE 0 END) AS present,
          SUM(CASE WHEN a.status = 'late' THEN 1 ELSE 0 END) AS late
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        WHERE u.hub_id = ? AND a.attendance_date = ?
      `, [hubId, today]);

      data.metrics = {
        hub_programs: progCount[0].total,
        hub_staff: userCount[0].total,
        tasks: taskCounts[0],
        reports: reportCounts[0],
        attendance: attendanceStats[0],
      };
    } else if (role === "program_leader") {
      // Program leader scoped metrics
      const [myPrograms] = await db.query(
        "SELECT id, name FROM programs WHERE leader_id = ? OR hub_id = ?",
        [userId, hubId]
      );
      const progIds = myPrograms.map((p) => p.id);

      let taskStats = { total: 0, pending: 0, in_progress: 0, completed: 0, overdue: 0 };
      let reportStats = { total: 0, pending_review: 0, reviewed: 0 };

      if (progIds.length > 0) {
        const [tc] = await db.query(`
          SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
            SUM(CASE WHEN status != 'completed' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
          FROM tasks WHERE program_id IN (?)
        `, [progIds]);
        taskStats = tc[0];

        const [rc] = await db.query(`
          SELECT 
            COUNT(*) AS total,
            SUM(CASE WHEN status = 'submitted' THEN 1 ELSE 0 END) AS pending_review,
            SUM(CASE WHEN status = 'reviewed' THEN 1 ELSE 0 END) AS reviewed
          FROM daily_reports WHERE program_id IN (?)
        `, [progIds]);
        reportStats = rc[0];
      }

      data.metrics = {
        programs_led: myPrograms,
        tasks: taskStats,
        reports: reportStats,
      };
    } else {
      // Staff personal metrics
      const [taskCounts] = await db.query(`
        SELECT 
          COUNT(*) AS total,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) AS pending,
          SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) AS in_progress,
          SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) AS completed,
          SUM(CASE WHEN status != 'completed' AND due_date < CURDATE() THEN 1 ELSE 0 END) AS overdue
        FROM tasks WHERE assigned_to = ?
      `, [userId]);

      const [reportCount] = await db.query(
        "SELECT COUNT(*) AS total FROM daily_reports WHERE user_id = ?",
        [userId]
      );

      const [todayRep] = await db.query(
        "SELECT id, status, program_id FROM daily_reports WHERE user_id = ? AND report_date = ? LIMIT 1",
        [userId, today]
      );

      const [todayAtt] = await db.query(
        "SELECT check_in_time, check_out_time, status FROM attendance WHERE user_id = ? AND attendance_date = ? LIMIT 1",
        [userId, today]
      );

      data.metrics = {
        tasks: taskCounts[0],
        total_reports: reportCount[0].total,
        today_report: todayRep[0] || null,
        today_attendance: todayAtt[0] || null,
      };
    }

    res.json({ success: true, data });
  } catch (error) {
    console.error("Dashboard analytics error:", error);
    res.status(500).json({ success: false, error: "Failed to generate dashboard analytics." });
  }
});

// GET /api/analytics/export/:type - Export data to CSV (Protected by RBAC)
router.get("/export/:type", authRequired, async (req, res) => {
  try {
    const { type } = req.params;
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);

    let csv = "";
    let filename = `${type}_export_${Date.now()}.csv`;

    if (type === "tasks") {
      let query = `
        SELECT 
          t.id, t.title, t.priority, t.status, t.due_date, t.completed_at,
          p.name AS program_name,
          u_to.name AS assigned_to,
          u_by.name AS assigned_by
        FROM tasks t
        JOIN programs p ON t.program_id = p.id
        JOIN users u_to ON t.assigned_to = u_to.id
        JOIN users u_by ON t.assigned_by = u_by.id
        WHERE 1=1
      `;
      const params = [];
      if (!isLeader) {
        query += " AND t.assigned_to = ?";
        params.push(req.user.id);
      } else if (req.user.role === "hub_leader") {
        query += " AND p.hub_id = ?";
        params.push(req.user.hub_id);
      }

      const [rows] = await db.query(query, params);
      const headers = ["ID", "Title", "Program", "Priority", "Status", "Assigned To", "Assigned By", "Due Date", "Completed At"];
      csv += headers.map(escapeCsv).join(",") + "\n";
      for (const r of rows) {
        csv += [r.id, r.title, r.program_name, r.priority, r.status, r.assigned_to, r.assigned_by, r.due_date, r.completed_at].map(escapeCsv).join(",") + "\n";
      }
    } else if (type === "reports") {
      let query = `
        SELECT 
          dr.id, dr.report_date, dr.status, dr.work_done, dr.challenges, dr.next_steps, dr.leader_comment,
          u.name AS staff_name,
          p.name AS program_name,
          rev.name AS reviewer_name
        FROM daily_reports dr
        JOIN users u ON dr.user_id = u.id
        JOIN programs p ON dr.program_id = p.id
        LEFT JOIN users rev ON dr.reviewed_by = rev.id
        WHERE 1=1
      `;
      const params = [];
      if (!isLeader) {
        query += " AND dr.user_id = ?";
        params.push(req.user.id);
      } else if (req.user.role === "hub_leader") {
        query += " AND p.hub_id = ?";
        params.push(req.user.hub_id);
      }

      const [rows] = await db.query(query, params);
      const headers = ["ID", "Report Date", "Staff Name", "Program", "Status", "Work Done", "Challenges", "Next Steps", "Reviewer", "Leader Comment"];
      csv += headers.map(escapeCsv).join(",") + "\n";
      for (const r of rows) {
        csv += [r.id, r.report_date, r.staff_name, r.program_name, r.status, r.work_done, r.challenges, r.next_steps, r.reviewer_name, r.leader_comment].map(escapeCsv).join(",") + "\n";
      }
    } else if (type === "staff") {
      if (!isLeader) {
        return res.status(403).json({ success: false, error: "Only leaders can export staff rosters." });
      }

      let query = `
        SELECT u.id, u.name, u.email, u.role, u.phone, u.job_title, u.is_active, h.name AS hub_name
        FROM users u
        LEFT JOIN hubs h ON u.hub_id = h.id
        WHERE 1=1
      `;
      const params = [];
      if (req.user.role === "hub_leader") {
        query += " AND u.hub_id = ?";
        params.push(req.user.hub_id);
      }

      const [rows] = await db.query(query, params);
      const headers = ["ID", "Name", "Email", "Role", "Hub", "Job Title", "Phone", "Active"];
      csv += headers.map(escapeCsv).join(",") + "\n";
      for (const r of rows) {
        csv += [r.id, r.name, r.email, r.role, r.hub_name, r.job_title, r.phone, r.is_active ? "Yes" : "No"].map(escapeCsv).join(",") + "\n";
      }
    } else if (type === "attendance") {
      let query = `
        SELECT a.id, a.attendance_date, a.check_in_time, a.check_out_time, a.status, a.notes,
               u.name AS staff_name, h.name AS hub_name
        FROM attendance a
        JOIN users u ON a.user_id = u.id
        LEFT JOIN hubs h ON u.hub_id = h.id
        WHERE 1=1
      `;
      const params = [];
      if (!isLeader) {
        query += " AND a.user_id = ?";
        params.push(req.user.id);
      } else if (req.user.role === "hub_leader") {
        query += " AND u.hub_id = ?";
        params.push(req.user.hub_id);
      }

      const [rows] = await db.query(query, params);
      const headers = ["ID", "Date", "Staff Name", "Hub", "Check In", "Check Out", "Status", "Notes"];
      csv += headers.map(escapeCsv).join(",") + "\n";
      for (const r of rows) {
        csv += [r.id, r.attendance_date, r.staff_name, r.hub_name, r.check_in_time, r.check_out_time, r.status, r.notes].map(escapeCsv).join(",") + "\n";
      }
    } else {
      return res.status(400).json({ success: false, error: "Invalid export category." });
    }

    await logAudit(req, "EXPORT_DATA", "export", null, `Exported ${type} dataset to CSV`);

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.status(200).send(csv);
  } catch (error) {
    console.error("CSV export error:", error);
    res.status(500).json({ success: false, error: "Failed to generate CSV export." });
  }
});

// GET /api/analytics/audit-logs - Admin view of audit log history
router.get("/audit-logs", authRequired, adminOnly, async (req, res) => {
  try {
    const { action, limit = 100 } = req.query;

    let query = `
      SELECT al.*, u.name AS user_name, u.email AS user_email, u.role AS user_role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE 1=1
    `;
    const params = [];

    if (action) {
      query += " AND al.action = ?";
      params.push(action);
    }

    query += " ORDER BY al.created_at DESC LIMIT ?";
    params.push(parseInt(limit, 10));

    const [logs] = await db.query(query, params);
    res.json({ success: true, count: logs.length, logs });
  } catch (error) {
    console.error("Fetch audit logs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch audit logs." });
  }
});

// GET /api/analytics/settings - Admin system settings
router.get("/settings", authRequired, adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM system_settings");
    const settingsMap = {};
    rows.forEach((r) => (settingsMap[r.setting_key] = r.setting_value));
    res.json({ success: true, settings: settingsMap });
  } catch (error) {
    console.error("Fetch settings error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch settings." });
  }
});

// PUT /api/analytics/settings - Admin update system settings
router.put("/settings", authRequired, adminOnly, async (req, res) => {
  try {
    const { settings } = req.body;
    if (!settings || typeof settings !== "object") {
      return res.status(400).json({ success: false, error: "Settings object required." });
    }

    for (const [key, value] of Object.entries(settings)) {
      await db.query(
        `INSERT INTO system_settings (setting_key, setting_value)
         VALUES (?, ?)
         ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value)`,
        [key, String(value)]
      );
    }

    await logAudit(req, "UPDATE_SYSTEM_SETTINGS", "settings", null, settings);

    res.json({ success: true, message: "System settings updated." });
  } catch (error) {
    console.error("Update settings error:", error);
    res.status(500).json({ success: false, error: "Failed to update settings." });
  }
});

module.exports = router;
