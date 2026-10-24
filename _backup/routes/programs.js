const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

const router = express.Router();

// GET /api/programs/hubs - List all hubs
router.get("/hubs", authRequired, async (req, res) => {
  try {
    const [hubs] = await db.query(
      `SELECT h.*, 
        (SELECT COUNT(*) FROM programs p WHERE p.hub_id = h.id) AS program_count,
        (SELECT COUNT(*) FROM users u WHERE u.hub_id = h.id AND u.is_active = 1) AS user_count
       FROM hubs h
       ORDER BY h.name ASC`
    );
    res.json({ success: true, hubs });
  } catch (error) {
    console.error("Fetch hubs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch hubs." });
  }
});

// POST /api/programs/hubs - Create new hub
router.post("/hubs", authRequired, leaderOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Hub name is required." });
    }

    const [result] = await db.query("INSERT INTO hubs (name, description) VALUES (?, ?)", [
      name.trim(),
      description || null,
    ]);

    res.status(201).json({
      success: true,
      message: "Hub created successfully.",
      hub: { id: result.insertId, name: name.trim(), description: description || null },
    });
  } catch (error) {
    console.error("Create hub error:", error);
    res.status(500).json({ success: false, error: "Failed to create hub." });
  }
});

// GET /api/programs - List all programs
router.get("/", authRequired, async (req, res) => {
  try {
    const { hub_id, search } = req.query;

    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.hub_id, 
        p.created_at,
        h.name AS hub_name,
        (SELECT COUNT(*) FROM program_members pm WHERE pm.program_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.program_id = p.id AND t.status != 'completed') AS active_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.program_id = p.id AND t.status = 'completed') AS completed_tasks,
        (SELECT COUNT(*) FROM daily_reports dr WHERE dr.program_id = p.id) AS total_reports
      FROM programs p
      LEFT JOIN hubs h ON p.hub_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (hub_id) {
      query += ` AND p.hub_id = ?`;
      params.push(hub_id);
    }

    if (search) {
      query += ` AND (p.name LIKE ? OR p.description LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY p.name ASC`;

    const [programs] = await db.query(query, params);

    res.json({ success: true, count: programs.length, programs });
  } catch (error) {
    console.error("Fetch programs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch programs." });
  }
});

// GET /api/programs/:id - Program details with member users
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT p.*, h.name AS hub_name
       FROM programs p
       LEFT JOIN hubs h ON p.hub_id = h.id
       WHERE p.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Program not found." });
    }

    const program = rows[0];

    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active
       FROM program_members pm
       JOIN users u ON pm.user_id = u.id
       WHERE pm.program_id = ?
       ORDER BY u.name ASC`,
      [program.id]
    );

    program.members = members;

    res.json({ success: true, program });
  } catch (error) {
    console.error("Fetch single program error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch program details." });
  }
});

// POST /api/programs - Create new program
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    const { name, description, hub_id, member_ids = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Program name is required." });
    }

    const [result] = await db.query(
      "INSERT INTO programs (name, description, hub_id) VALUES (?, ?, ?)",
      [name.trim(), description || null, hub_id || null]
    );

    const programId = result.insertId;

    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const values = member_ids.map((uid) => [uid, programId]);
      await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
    }

    res.status(201).json({
      success: true,
      message: "Program created successfully.",
      program: {
        id: programId,
        name: name.trim(),
        description: description || null,
        hub_id: hub_id || null,
      },
    });
  } catch (error) {
    console.error("Create program error:", error);
    res.status(500).json({ success: false, error: "Failed to create program." });
  }
});

// PUT /api/programs/:id - Update program
router.put("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    const { name, description, hub_id, member_ids } = req.body;

    const [existing] = await db.query("SELECT id FROM programs WHERE id = ?", [programId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Program not found." });
    }

    const updates = [];
    const params = [];

    if (name) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }
    if (hub_id !== undefined) {
      updates.push("hub_id = ?");
      params.push(hub_id || null);
    }

    if (updates.length > 0) {
      params.push(programId);
      await db.query(`UPDATE programs SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    if (Array.isArray(member_ids)) {
      await db.query("DELETE FROM program_members WHERE program_id = ?", [programId]);
      if (member_ids.length > 0) {
        const values = member_ids.map((uid) => [uid, programId]);
        await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
      }
    }

    res.json({ success: true, message: "Program updated successfully." });
  } catch (error) {
    console.error("Update program error:", error);
    res.status(500).json({ success: false, error: "Failed to update program." });
  }
});

// DELETE /api/programs/:id - Delete program
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    const [existing] = await db.query("SELECT id FROM programs WHERE id = ?", [programId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Program not found." });
    }

    await db.query("DELETE FROM programs WHERE id = ?", [programId]);
    res.json({ success: true, message: "Program deleted successfully." });
  } catch (error) {
    console.error("Delete program error:", error);
    res.status(500).json({ success: false, error: "Failed to delete program." });
  }
});

// POST /api/programs/:id/members - Add member to program
router.post("/:id/members", authRequired, leaderOnly, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ success: false, error: "User ID is required." });
    }

    await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES (?, ?)", [
      user_id,
      programId,
    ]);

    res.json({ success: true, message: "User added to program." });
  } catch (error) {
    console.error("Add program member error:", error);
    res.status(500).json({ success: false, error: "Failed to add member to program." });
  }
});

// DELETE /api/programs/:id/members/:userId - Remove member
router.delete("/:id/members/:userId", authRequired, leaderOnly, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    const userId = parseInt(req.params.userId, 10);

    await db.query("DELETE FROM program_members WHERE user_id = ? AND program_id = ?", [
      userId,
      programId,
    ]);

    res.json({ success: true, message: "User removed from program." });
  } catch (error) {
    console.error("Remove program member error:", error);
    res.status(500).json({ success: false, error: "Failed to remove member." });
  }
});

module.exports = router;
