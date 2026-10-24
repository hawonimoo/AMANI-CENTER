const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

// GET /api/hub/cohorts - List all training cohorts with participant counts
router.get("/cohorts", authRequired, async (req, res) => {
  try {
    const [cohorts] = await db.query(`
      SELECT c.*, COUNT(p.id) as enrolled_count
      FROM digital_hub_cohorts c
      LEFT JOIN digital_hub_participants p ON c.id = p.cohort_id
      GROUP BY c.id
      ORDER BY c.start_date DESC
    `);
    res.json({ success: true, cohorts });
  } catch (err) {
    console.error("Hub cohorts fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch training cohorts" });
  }
});

// POST /api/hub/cohorts - Create new training cohort
router.post("/cohorts", authRequired, leaderOnly, async (req, res) => {
  try {
    const { name, track, start_date, end_date, status = "active", mentor_name, capacity = 30 } = req.body;

    if (!name || !track || !start_date || !end_date) {
      return res.status(400).json({
        success: false,
        error: "Cohort name, track, start date, and end date are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO digital_hub_cohorts (name, track, start_date, end_date, status, mentor_name, capacity)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [name, track, start_date, end_date, status, mentor_name || null, Number(capacity) || 30]
    );

    const [newCohort] = await db.query("SELECT * FROM digital_hub_cohorts WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, cohort: newCohort[0] });
  } catch (err) {
    console.error("Create cohort error:", err);
    res.status(500).json({ success: false, error: "Failed to create cohort" });
  }
});

// GET /api/hub/cohorts/:id/participants - List participants in cohort
router.get("/cohorts/:id/participants", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await db.query(
      "SELECT * FROM digital_hub_participants WHERE cohort_id = ? ORDER BY full_name ASC",
      [id]
    );
    res.json({ success: true, participants: rows });
  } catch (err) {
    console.error("Cohort participants fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch participants" });
  }
});

// POST /api/hub/cohorts/:id/participants - Enroll participant
router.post("/cohorts/:id/participants", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, contact_email, contact_phone, project_title, attendance_rate = 100, status = "enrolled" } = req.body;

    if (!full_name) {
      return res.status(400).json({ success: false, error: "Participant name is required." });
    }

    const [result] = await db.query(
      `INSERT INTO digital_hub_participants 
        (cohort_id, full_name, contact_email, contact_phone, attendance_rate, project_title, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [id, full_name, contact_email || null, contact_phone || null, Number(attendance_rate) || 100, project_title || null, status]
    );

    const [newPart] = await db.query("SELECT * FROM digital_hub_participants WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, participant: newPart[0] });
  } catch (err) {
    console.error("Enroll participant error:", err);
    res.status(500).json({ success: false, error: "Failed to enroll participant" });
  }
});

// PUT /api/hub/participants/:id - Update participant
router.put("/participants/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, contact_email, contact_phone, attendance_rate, project_title, status } = req.body;

    const [existing] = await db.query("SELECT * FROM digital_hub_participants WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Participant not found" });
    }
    const current = existing[0];

    await db.query(
      `UPDATE digital_hub_participants SET
        full_name = ?,
        contact_email = ?,
        contact_phone = ?,
        attendance_rate = ?,
        project_title = ?,
        status = ?
       WHERE id = ?`,
      [
        full_name !== undefined ? full_name : current.full_name,
        contact_email !== undefined ? contact_email : current.contact_email,
        contact_phone !== undefined ? contact_phone : current.contact_phone,
        attendance_rate !== undefined ? Number(attendance_rate) : current.attendance_rate,
        project_title !== undefined ? project_title : current.project_title,
        status !== undefined ? status : current.status,
        id
      ]
    );

    const [updated] = await db.query("SELECT * FROM digital_hub_participants WHERE id = ?", [id]);
    res.json({ success: true, participant: updated[0] });
  } catch (err) {
    console.error("Update participant error:", err);
    res.status(500).json({ success: false, error: "Failed to update participant" });
  }
});

// DELETE /api/hub/participants/:id - Remove participant
router.delete("/participants/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM digital_hub_participants WHERE id = ?", [id]);
    res.json({ success: true, message: "Participant removed successfully" });
  } catch (err) {
    console.error("Delete participant error:", err);
    res.status(500).json({ success: false, error: "Failed to remove participant" });
  }
});

module.exports = router;
