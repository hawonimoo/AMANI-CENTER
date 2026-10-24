const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

// GET /api/climate/activities - List climate activities
router.get("/activities", authRequired, async (req, res) => {
  try {
    const { status, activity_type } = req.query;
    let query = "SELECT * FROM climate_activities WHERE 1=1";
    const params = [];

    if (status) {
      query += " AND status = ?";
      params.push(status);
    }
    if (activity_type) {
      query += " AND activity_type = ?";
      params.push(activity_type);
    }

    query += " ORDER BY target_date DESC, id DESC";

    const [rows] = await db.query(query, params);

    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_activities,
        COALESCE(SUM(trees_planted), 0) as total_trees,
        COALESCE(SUM(actual_participants), 0) as total_participants,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed_activities,
        SUM(CASE WHEN status = 'planned' THEN 1 ELSE 0 END) as planned_activities
      FROM climate_activities
    `);

    res.json({ success: true, activities: rows, stats: stats || {} });
  } catch (err) {
    console.error("Climate activities fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch climate activities" });
  }
});

// POST /api/climate/activities - Create climate activity
router.post("/activities", authRequired, async (req, res) => {
  try {
    const {
      title,
      activity_type,
      target_date,
      location,
      lead_officer = "Mauwa",
      target_participants = 0,
      actual_participants = 0,
      trees_planted = 0,
      status = "planned",
      outcomes = null
    } = req.body;

    if (!title || !activity_type || !target_date || !location) {
      return res.status(400).json({
        success: false,
        error: "Title, activity type, target date, and location are required."
      });
    }

    const [result] = await db.query(
      `INSERT INTO climate_activities 
        (title, activity_type, target_date, location, lead_officer, target_participants, actual_participants, trees_planted, status, outcomes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        activity_type,
        target_date,
        location,
        lead_officer,
        Number(target_participants) || 0,
        Number(actual_participants) || 0,
        Number(trees_planted) || 0,
        status,
        outcomes
      ]
    );

    const [newAct] = await db.query("SELECT * FROM climate_activities WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, activity: newAct[0] });
  } catch (err) {
    console.error("Create climate activity error:", err);
    res.status(500).json({ success: false, error: "Failed to create climate activity" });
  }
});

// PUT /api/climate/activities/:id - Update climate activity
router.put("/activities/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      activity_type,
      target_date,
      location,
      lead_officer,
      target_participants,
      actual_participants,
      trees_planted,
      status,
      outcomes
    } = req.body;

    const [existing] = await db.query("SELECT * FROM climate_activities WHERE id = ?", [id]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Activity not found" });
    }
    const current = existing[0];

    await db.query(
      `UPDATE climate_activities SET
        title = ?,
        activity_type = ?,
        target_date = ?,
        location = ?,
        lead_officer = ?,
        target_participants = ?,
        actual_participants = ?,
        trees_planted = ?,
        status = ?,
        outcomes = ?
       WHERE id = ?`,
      [
        title !== undefined ? title : current.title,
        activity_type !== undefined ? activity_type : current.activity_type,
        target_date !== undefined ? target_date : current.target_date,
        location !== undefined ? location : current.location,
        lead_officer !== undefined ? lead_officer : current.lead_officer,
        target_participants !== undefined ? Number(target_participants) : current.target_participants,
        actual_participants !== undefined ? Number(actual_participants) : current.actual_participants,
        trees_planted !== undefined ? Number(trees_planted) : current.trees_planted,
        status !== undefined ? status : current.status,
        outcomes !== undefined ? outcomes : current.outcomes,
        id
      ]
    );

    const [updated] = await db.query("SELECT * FROM climate_activities WHERE id = ?", [id]);
    res.json({ success: true, activity: updated[0] });
  } catch (err) {
    console.error("Update climate activity error:", err);
    res.status(500).json({ success: false, error: "Failed to update climate activity" });
  }
});

// DELETE /api/climate/activities/:id - Remove activity
router.delete("/activities/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("DELETE FROM climate_activities WHERE id = ?", [id]);
    res.json({ success: true, message: "Activity deleted successfully" });
  } catch (err) {
    console.error("Delete climate activity error:", err);
    res.status(500).json({ success: false, error: "Failed to delete activity" });
  }
});

module.exports = router;
