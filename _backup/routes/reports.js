const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

const router = express.Router();

// GET /api/reports - List daily reports
router.get("/", authRequired, async (req, res) => {
  try {
    const { report_date, program_id, user_id, status, scope } = req.query;
    const isStaff = req.user.role === "staff";

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
        p.name AS program_name,
        reviewer.name AS reviewer_name
      FROM daily_reports dr
      JOIN users u ON dr.user_id = u.id
      JOIN programs p ON dr.program_id = p.id
      LEFT JOIN users reviewer ON dr.reviewed_by = reviewer.id
      WHERE 1=1
    `;
    const params = [];

    // Filter by user
    if (scope === "my" || (isStaff && !user_id && !program_id)) {
      query += ` AND dr.user_id = ?`;
      params.push(req.user.id);
    } else if (user_id) {
      query += ` AND dr.user_id = ?`;
      params.push(user_id);
    }

    if (report_date) {
      query += ` AND dr.report_date = ?`;
      params.push(report_date);
    }

    if (program_id) {
      query += ` AND dr.program_id = ?`;
      params.push(program_id);
    }

    if (status) {
      query += ` AND dr.status = ?`;
      params.push(status);
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
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    res.json({ success: true, report: rows[0] });
  } catch (error) {
    console.error("Fetch single report error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch report." });
  }
});

// POST /api/reports - Submit a daily report
router.post("/", authRequired, async (req, res) => {
  try {
    const { program_id, report_date, work_done, challenges, next_steps } = req.body;

    if (!program_id || !work_done) {
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

    res.status(201).json({
      success: true,
      message: "Daily report submitted successfully.",
      reportId: result.insertId,
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

    const [rows] = await db.query("SELECT id FROM daily_reports WHERE id = ?", [reportId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Report not found." });
    }

    await db.query(
      `UPDATE daily_reports 
       SET status = ?, 
           leader_comment = ?, 
           reviewed_by = ? 
       WHERE id = ?`,
      [status, leader_comment || null, req.user.id, reportId]
    );

    res.json({ success: true, message: `Report marked as ${status}. Feedback saved.` });
  } catch (error) {
    console.error("Review report error:", error);
    res.status(500).json({ success: false, error: "Failed to review report." });
  }
});

module.exports = router;
