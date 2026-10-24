const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

// GET /api/radio/schedules - Fetch all radio schedules
router.get("/schedules", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM radio_schedules ORDER BY id ASC"
    );
    res.json({ success: true, schedules: rows });
  } catch (err) {
    console.error("Radio schedules fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch radio schedules" });
  }
});

// POST /api/radio/schedules - Add a new radio schedule slot
router.post("/schedules", authRequired, leaderOnly, async (req, res) => {
  try {
    const {
      program_title,
      presenters,
      time_slot,
      time_period_status = "unconfirmed",
      day_of_week = "Monday - Sunday",
      is_overlap_flagged = false,
      overlap_notes = null,
      status = "active",
      notes = null
    } = req.body;

    if (!program_title || !presenters || !time_slot) {
      return res.status(400).json({
        success: false,
        error: "Program title, presenters, and time slot are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO radio_schedules 
        (program_title, presenters, time_slot, time_period_status, day_of_week, is_overlap_flagged, overlap_notes, status, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        program_title,
        presenters,
        time_slot,
        time_period_status,
        day_of_week,
        is_overlap_flagged ? 1 : 0,
        overlap_notes,
        status,
        notes
      ]
    );

    const [newSchedule] = await db.query("SELECT * FROM radio_schedules WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, schedule: newSchedule[0] });
  } catch (err) {
    console.error("Radio schedule creation error:", err);
    res.status(500).json({ success: false, error: "Failed to create radio schedule" });
  }
});

// PUT /api/radio/schedules/:id - Update radio schedule (confirm AM/PM, adjust presenters, resolve overlap)
router.put("/schedules/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      program_title,
      presenters,
      time_slot,
      time_period_status,
      day_of_week,
      is_overlap_flagged,
      overlap_notes,
      status,
      notes
    } = req.body;

    const [existing] = await db.query("SELECT * FROM radio_schedules WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Schedule not found" });
    }

    const current = existing[0];

    await db.query(
      `UPDATE radio_schedules SET
        program_title = ?,
        presenters = ?,
        time_slot = ?,
        time_period_status = ?,
        day_of_week = ?,
        is_overlap_flagged = ?,
        overlap_notes = ?,
        status = ?,
        notes = ?
       WHERE id = ?`,
      [
        program_title !== undefined ? program_title : current.program_title,
        presenters !== undefined ? presenters : current.presenters,
        time_slot !== undefined ? time_slot : current.time_slot,
        time_period_status !== undefined ? time_period_status : current.time_period_status,
        day_of_week !== undefined ? day_of_week : current.day_of_week,
        is_overlap_flagged !== undefined ? (is_overlap_flagged ? 1 : 0) : current.is_overlap_flagged,
        overlap_notes !== undefined ? overlap_notes : current.overlap_notes,
        status !== undefined ? status : current.status,
        notes !== undefined ? notes : current.notes,
        id
      ]
    );

    const [updated] = await db.query("SELECT * FROM radio_schedules WHERE id = ?", [id]);
    res.json({ success: true, schedule: updated[0] });
  } catch (err) {
    console.error("Radio schedule update error:", err);
    res.status(500).json({ success: false, error: "Failed to update radio schedule" });
  }
});

// DELETE /api/radio/schedules/:id - Remove radio schedule
router.delete("/schedules/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM radio_schedules WHERE id = ?", [id]);
    res.json({ success: true, message: "Schedule removed successfully" });
  } catch (err) {
    console.error("Radio schedule delete error:", err);
    res.status(500).json({ success: false, error: "Failed to delete schedule" });
  }
});

// GET /api/radio/handovers - List shift handover logs
router.get("/handovers", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT h.*, u.name as logged_by_name
       FROM radio_handovers h
       LEFT JOIN users u ON h.logged_by = u.id
       ORDER BY h.shift_date DESC, h.id DESC
       LIMIT 50`
    );
    res.json({ success: true, handovers: rows });
  } catch (err) {
    console.error("Radio handovers fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch handover records" });
  }
});

// POST /api/radio/handovers - Create a shift handover log
router.post("/handovers", authRequired, async (req, res) => {
  try {
    const {
      shift_date,
      time_slot,
      outgoing_presenter,
      incoming_presenter,
      equipment_status = "Operational",
      transmission_notes,
      handover_notes
    } = req.body;

    if (!outgoing_presenter || !incoming_presenter || !handover_notes) {
      return res.status(400).json({
        success: false,
        error: "Outgoing presenter, incoming presenter, and handover notes are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO radio_handovers 
        (shift_date, time_slot, outgoing_presenter, incoming_presenter, equipment_status, transmission_notes, handover_notes, logged_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        shift_date || new Date().toISOString().split("T")[0],
        time_slot || "Current Shift",
        outgoing_presenter,
        incoming_presenter,
        equipment_status,
        transmission_notes || null,
        handover_notes,
        req.user.id
      ]
    );

    const [newHandover] = await db.query("SELECT * FROM radio_handovers WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, handover: newHandover[0] });
  } catch (err) {
    console.error("Radio handover create error:", err);
    res.status(500).json({ success: false, error: "Failed to log handover" });
  }
});

// GET /api/radio/presenters - List registered radio team members
router.get("/presenters", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.job_title, u.phone, u.role
       FROM users u
       JOIN program_members pm ON u.id = pm.user_id
       WHERE pm.program_id = 1
       ORDER BY u.name ASC`
    );
    res.json({ success: true, presenters: rows });
  } catch (err) {
    console.error("Radio presenters fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch radio presenters" });
  }
});

module.exports = router;
