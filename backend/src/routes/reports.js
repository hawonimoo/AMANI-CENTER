const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly, canAccessProgram } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/reports - List daily reports with RBAC
router.get("/", authRequired, async (req, res) => {
  try {
    const { report_date, program_id, user_id, status, start_date, end_date, scope } = req.query;
    const isExecutive =
      req.user.role === "admin" ||
      req.user.email === "john.green@amanicenter.org" ||
      req.user.email === "khavai@amanicenter.org";
    const isProgramLeader = req.user.role === "program_leader";
    const isStaff = !isExecutive && !isProgramLeader;

    let query = `
      SELECT 
        dr.id,
        dr.user_id,
        dr.program_id,
        dr.report_date,
        dr.work_done,
        dr.challenges,
        dr.next_steps,
        dr.status,
        dr.leader_comment,
        dr.reviewed_by,
        dr.submitted_at,
        u.name AS user_name,
        u.email AS user_email,
        u.job_title AS user_job_title,
        p.name AS program_name,
        p.hub_id,
        h.name AS hub_name,
        reviewer.name AS reviewer_name
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      JOIN programs p ON dr.program_id = p.id
      LEFT JOIN hubs h ON p.hub_id = h.id
      LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    // RBAC Scoping
    if (isStaff || scope === "my") {
      // Staff members and personal scope query ONLY their own reports
      query += ` AND dr.user_id = ?`;
      params.push(req.user.id);
    } else if (isProgramLeader && !isExecutive) {
      // Program leaders see their own reports and reports from programs they manage
      query += ` AND (p.leader_id = ? OR p.id IN (SELECT program_id FROM program_members WHERE user_id = ?) OR dr.user_id = ?)`;
      params.push(req.user.id, req.user.id, req.user.id);
    }
    // Executives (John Green & Khavai) can see all reports across all units

    if (user_id && isExecutive) {
      query += ` AND dr.user_id = ?`;
      params.push(user_id);
    }

    if (program_id) {
      query += ` AND dr.program_id = ?`;
      params.push(program_id);
    }

    if (status) {
      query += ` AND dr.status = ?`;
      params.push(status);
    }

    if (report_date) {
      query += ` AND dr.report_date = ?`;
      params.push(report_date);
    } else {
      if (start_date) {
        query += ` AND dr.report_date >= ?`;
        params.push(start_date);
      }
      if (end_date) {
        query += ` AND dr.report_date <= ?`;
        params.push(end_date);
      }
    }

    query += ` ORDER BY dr.report_date DESC, dr.submitted_at DESC`;

    const [reports] = await db.query(query, params);

    const counts = {
      total: reports.length,
      submitted: reports.filter((r) => r.status === "submitted").length,
      reviewed: reports.filter((r) => r.status === "reviewed").length,
      needs_changes: reports.filter((r) => r.status === "needs_changes").length,
    };

    res.json({ success: true, counts, reports });
  } catch (error) {
    console.error("Fetch reports error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch reports." });
  }
});

// GET /api/reports/today - Check user's report for today
router.get("/today", authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await db.query(
      `SELECT dr.*, p.name AS program_name
       FROM daily_reports dr
       JOIN programs p ON dr.program_id = p.id
       WHERE dr.user_id = ? AND dr.report_date = ?
       LIMIT 1`,
      [req.user.id, today]
    );

    res.json({
      success: true,
      submitted: rows.length > 0,
      report: rows.length > 0 ? rows[0] : null,
    });
  } catch (error) {
    console.error("Fetch today report error:", error);
    res.status(500).json({ success: false, error: "Failed to check today's report." });
  }
});

// GET /api/reports/:id - Single report details
router.get("/:id", authRequired, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT 
        dr.*,
        u.name AS user_name,
        u.email AS user_email,
        p.name AS program_name,
        reviewer.name AS reviewer_name
       FROM daily_reports dr
       JOIN users u ON dr.user_id = u.id
       JOIN programs p ON dr.program_id = p.id
       LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
       WHERE dr.id = ?`,
      [reportId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    const report = rows[0];
    const isAuthor = report.user_id === req.user.id;
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);

    if (!isAuthor && !isLeader) {
      return res.status(403).json({ success: false, error: "Not authorized to view this report." });
    }

    res.json({ success: true, report });
  } catch (error) {
    console.error("Fetch single report error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch report." });
  }
});

// POST /api/reports - Submit daily report
router.post("/", authRequired, async (req, res) => {
  try {
    const { program_id, report_date, work_done, challenges, next_steps } = req.body;

    if (!program_id || !work_done || !work_done.trim()) {
      return res.status(400).json({
        success: false,
        error: "Program and work done description are required.",
      });
    }

    const dateVal = report_date || new Date().toISOString().slice(0, 10);

    const [result] = await db.query(
      `INSERT INTO daily_reports (user_id, program_id, report_date, work_done, challenges, next_steps, status)
       VALUES (?, ?, ?, ?, ?, ?, 'submitted')`,
      [
        req.user.id,
        program_id,
        dateVal,
        work_done.trim(),
        challenges ? challenges.trim() : null,
        next_steps ? next_steps.trim() : null,
      ]
    );

    const reportId = result.insertId;

    // Notify program leader if assigned
    const [prog] = await db.query("SELECT name, leader_id FROM programs WHERE id = ?", [program_id]);
    if (prog.length > 0 && prog[0].leader_id && prog[0].leader_id !== req.user.id) {
      await createNotification({
        userId: prog[0].leader_id,
        title: "Daily Report Submitted",
        message: `${req.user.name} logged work for ${prog[0].name} on ${dateVal}.`,
        type: "report_submitted",
        link: "#reports",
      });
    }

    await logAudit(req, "SUBMIT_REPORT", "daily_report", reportId, {
      program_id,
      report_date: dateVal,
    });

    res.status(201).json({
      success: true,
      message: "Daily report submitted successfully.",
      reportId,
    });
  } catch (error) {
    console.error("Submit report error:", error);
    res.status(500).json({ success: false, error: "Failed to submit daily report." });
  }
});

// PUT /api/reports/:id - Edit report (author only if not yet reviewed or needs changes)
router.put("/:id", authRequired, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const [rows] = await db.query("SELECT * FROM daily_reports WHERE id = ?", [reportId]);

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    const report = rows[0];
    const isAuthor = report.user_id === req.user.id;
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);

    if (!isAuthor && !isLeader) {
      return res.status(403).json({ success: false, error: "Not authorized to edit this report." });
    }

    const { work_done, challenges, next_steps, program_id } = req.body;

    await db.query(
      `UPDATE daily_reports 
       SET work_done = COALESCE(?, work_done),
           challenges = COALESCE(?, challenges),
           next_steps = COALESCE(?, next_steps),
           program_id = COALESCE(?, program_id),
           status = 'submitted'
       WHERE id = ?`,
      [
        work_done ? work_done.trim() : null,
        challenges !== undefined ? challenges : null,
        next_steps !== undefined ? next_steps : null,
        program_id || null,
        reportId,
      ]
    );

    res.json({ success: true, message: "Report updated and resubmitted successfully." });
  } catch (error) {
    console.error("Update report error:", error);
    res.status(500).json({ success: false, error: "Failed to update report." });
  }
});

// PATCH /api/reports/:id/review - Leader review & feedback
router.patch("/:id/review", authRequired, leaderOnly, async (req, res) => {
  try {
    const reportId = parseInt(req.params.id, 10);
    const { status, leader_comment } = req.body;

    if (!status || !["reviewed", "needs_changes"].includes(status)) {
      return res.status(400).json({
        success: false,
        error: "Status must be either 'reviewed' or 'needs_changes'.",
      });
    }

    const [rows] = await db.query("SELECT user_id, report_date FROM daily_reports WHERE id = ?", [reportId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    const report = rows[0];

    await db.query(
      `UPDATE daily_reports 
       SET status = ?, 
           leader_comment = ?, 
           reviewed_by = ? 
       WHERE id = ?`,
      [status, leader_comment || null, req.user.id, reportId]
    );

    // Notify author
    await createNotification({
      userId: report.user_id,
      title: status === "reviewed" ? "Daily Report Reviewed" : "Report Clarification Requested",
      message: `${req.user.name} reviewed your report for ${report.report_date}. Feedback: ${leader_comment || "No comment."}`,
      type: "report_reviewed",
      link: "#reports",
    });

    await logAudit(req, "REVIEW_REPORT", "daily_report", reportId, {
      status,
      leader_comment,
    });

    res.json({ success: true, message: `Report marked as ${status}. Feedback saved.` });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(500).json({ success: false, error: "Failed to review report." });
  }
});

module.exports = router;
