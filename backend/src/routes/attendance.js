const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/attendance/today - Get current user attendance today
router.get("/today", authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const [rows] = await db.query(
      "SELECT * FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [req.user.id, today]
    );

    res.json({
      success: true,
      attendance: rows[0] || null,
    });
  } catch (error) {
    console.error("Fetch today attendance error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch attendance status." });
  }
});

// POST /api/attendance/check-in - Record morning check-in
router.post("/check-in", authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);
    const { notes } = req.body;

    // Check if already checked in
    const [existing] = await db.query(
      "SELECT id FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [req.user.id, today]
    );

    if (existing.length > 0) {
      return res.status(400).json({ success: false, error: "You have already recorded check-in for today." });
    }

    // Determine if late based on threshold (e.g. after 09:15)
    const isLate = nowTime > "09:15:00";
    const status = isLate ? "late" : "present";

    await db.query(
      `INSERT INTO attendance (user_id, attendance_date, check_in_time, status, notes)
       VALUES (?, ?, ?, ?, ?)`,
      [req.user.id, today, nowTime, status, notes || (isLate ? "Late arrival" : "On-time arrival")]
    );

    res.json({
      success: true,
      message: `Checked in successfully at ${nowTime} (${status}).`,
      time: nowTime,
      status,
    });
  } catch (error) {
    console.error("Check-in error:", error);
    res.status(500).json({ success: false, error: "Failed to record check-in." });
  }
});

// POST /api/attendance/check-out - Record afternoon check-out
router.post("/check-out", authRequired, async (req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const nowTime = new Date().toTimeString().slice(0, 8);

    const [rows] = await db.query(
      "SELECT id, check_in_time, check_out_time FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [req.user.id, today]
    );

    if (rows.length === 0) {
      return res.status(400).json({ success: false, error: "Please check in first before checking out." });
    }

    await db.query(
      "UPDATE attendance SET check_out_time = ? WHERE id = ?",
      [nowTime, rows[0].id]
    );

    res.json({
      success: true,
      message: `Checked out successfully at ${nowTime}. Have a restful evening!`,
      time: nowTime,
    });
  } catch (error) {
    console.error("Check-out error:", error);
    res.status(500).json({ success: false, error: "Failed to record check-out." });
  }
});

// GET /api/attendance - List attendance history with scoping
router.get("/", authRequired, async (req, res) => {
  try {
    const { user_id, hub_id, attendance_date, start_date, end_date, scope } = req.query;
    const isStaff = req.user.role === "staff";

    let query = `
      SELECT 
        a.*,
        u.name AS user_name,
        u.email AS user_email,
        u.role AS user_role,
        u.hub_id,
        h.name AS hub_name
      FROM attendance a
      JOIN users u ON a.user_id = u.id
      LEFT JOIN hubs h ON u.hub_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (scope === "my" || (isStaff && !user_id)) {
      query += ` AND a.user_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === "hub_leader") {
      query += ` AND u.hub_id = ?`;
      params.push(req.user.hub_id);
    }

    if (user_id) {
      query += ` AND a.user_id = ?`;
      params.push(user_id);
    }

    if (hub_id && req.user.role === "admin") {
      query += ` AND u.hub_id = ?`;
      params.push(hub_id);
    }

    if (attendance_date) {
      query += ` AND a.attendance_date = ?`;
      params.push(attendance_date);
    } else {
      if (start_date) {
        query += ` AND a.attendance_date >= ?`;
        params.push(start_date);
      }
      if (end_date) {
        query += ` AND a.attendance_date <= ?`;
        params.push(end_date);
      }
    }

    query += ` ORDER BY a.attendance_date DESC, a.check_in_time DESC LIMIT 100`;

    const [attendance] = await db.query(query, params);
    res.json({ success: true, count: attendance.length, attendance });
  } catch (error) {
    console.error("Fetch attendance error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch attendance history." });
  }
});

// GET /api/attendance/leave - List leave requests
router.get("/leave", authRequired, async (req, res) => {
  try {
    const { status, scope } = req.query;
    const isStaff = req.user.role === "staff";

    let query = `
      SELECT 
        lr.*,
        u.name AS user_name,
        u.email AS user_email,
        u.hub_id,
        h.name AS hub_name,
        rev.name AS reviewer_name
      FROM leave_requests lr
      JOIN users u ON lr.user_id = u.id
      LEFT JOIN hubs h ON u.hub_id = h.id
      LEFT JOIN users rev ON lr.reviewed_by = rev.id
      WHERE 1=1
    `;
    const params = [];

    if (scope === "my" || (isStaff && !["admin", "hub_leader"].includes(req.user.role))) {
      query += ` AND lr.user_id = ?`;
      params.push(req.user.id);
    } else if (req.user.role === "hub_leader") {
      query += ` AND u.hub_id = ?`;
      params.push(req.user.hub_id);
    }

    if (status) {
      query += ` AND lr.status = ?`;
      params.push(status);
    }

    query += ` ORDER BY lr.created_at DESC`;

    const [leaves] = await db.query(query, params);
    res.json({ success: true, count: leaves.length, leaves });
  } catch (error) {
    console.error("Fetch leave error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch leave requests." });
  }
});

// POST /api/attendance/leave - Submit leave request
router.post("/leave", authRequired, async (req, res) => {
  try {
    const { leave_type, start_date, end_date, reason } = req.body;

    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ success: false, error: "All leave request fields are required." });
    }

    const [result] = await db.query(
      `INSERT INTO leave_requests (user_id, leave_type, start_date, end_date, reason, status)
       VALUES (?, ?, ?, ?, ?, 'pending')`,
      [req.user.id, leave_type, start_date, end_date, reason.trim()]
    );

    // Notify leaders in user's hub
    const [leaders] = await db.query(
      "SELECT id FROM users WHERE (role = 'admin' OR (role = 'hub_leader' AND hub_id = ?)) AND is_active = 1",
      [req.user.hub_id]
    );

    for (const l of leaders) {
      await createNotification({
        userId: l.id,
        title: "New Leave Request",
        message: `${req.user.name} submitted a ${leave_type} leave request (${start_date} to ${end_date}).`,
        type: "leave_status",
        link: "#attendance",
      });
    }

    res.status(201).json({
      success: true,
      message: "Leave application submitted successfully.",
      leaveId: result.insertId,
    });
  } catch (error) {
    console.error("Submit leave error:", error);
    res.status(500).json({ success: false, error: "Failed to submit leave request." });
  }
});

// PATCH /api/attendance/leave/:id - Approve or reject leave
router.patch("/leave/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const leaveId = parseInt(req.params.id, 10);
    const { status, leader_comment } = req.body;

    if (!["approved", "rejected"].includes(status)) {
      return res.status(400).json({ success: false, error: "Status must be 'approved' or 'rejected'." });
    }

    const [existing] = await db.query("SELECT user_id, leave_type FROM leave_requests WHERE id = ?", [leaveId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Leave request not found." });
    }

    await db.query(
      `UPDATE leave_requests 
       SET status = ?, leader_comment = ?, reviewed_by = ? 
       WHERE id = ?`,
      [status, leader_comment || null, req.user.id, leaveId]
    );

    await createNotification({
      userId: existing[0].user_id,
      title: `Leave Request ${status.toUpperCase()}`,
      message: `${req.user.name} has ${status} your ${existing[0].leave_type} leave application. ${leader_comment ? `Note: ${leader_comment}` : ""}`,
      type: "leave_status",
      link: "#attendance",
    });

    await logAudit(req, "REVIEW_LEAVE", "leave_request", leaveId, { status, leader_comment });

    res.json({ success: true, message: `Leave request has been ${status}.` });
  } catch (error) {
    console.error("Review leave error:", error);
    res.status(500).json({ success: false, error: "Failed to update leave request." });
  }
});

module.exports = router;
