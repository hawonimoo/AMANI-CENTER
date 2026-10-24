const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly, adminOnly, canAccessProgram, canAccessHub } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/programs/hubs - List hubs with performance summaries
router.get("/hubs", authRequired, async (req, res) => {
  try {
    let query = `
      SELECT 
        h.id, 
        h.name, 
        h.description, 
        h.created_at,
        (SELECT COUNT(*) FROM programs p WHERE p.hub_id = h.id) AS program_count,
        (SELECT COUNT(*) FROM users u WHERE u.hub_id = h.id AND u.is_active = 1) AS user_count,
        (SELECT COUNT(*) FROM tasks t 
         JOIN programs p2 ON t.program_id = p2.id 
         WHERE p2.hub_id = h.id AND t.status != 'completed') AS active_tasks
      FROM hubs h
      WHERE 1=1
    `;
    const params = [];

    // Hub leaders only see their hub unless authorized
    if (req.user.role === "hub_leader") {
      query += ` AND h.id = ?`;
      params.push(req.user.hub_id);
    }

    query += ` ORDER BY h.name ASC`;

    const [hubs] = await db.query(query, params);
    res.json({ success: true, hubs });
  } catch (error) {
    console.error("Fetch hubs error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch hubs." });
  }
});

// POST /api/programs/hubs - Create hub (Admin only)
router.post("/hubs", authRequired, adminOnly, async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Hub name is required." });
    }

    const [result] = await db.query("INSERT INTO hubs (name, description) VALUES (?, ?)", [
      name.trim(),
      description || null,
    ]);

    await logAudit(req, "CREATE_HUB", "hub", result.insertId, { name: name.trim() });

    res.status(201).json({
      success: true,
      message: "Regional hub established successfully.",
      hub: { id: result.insertId, name: name.trim(), description: description || null },
    });
  } catch (error) {
    console.error("Create hub error:", error);
    res.status(500).json({ success: false, error: "Failed to create hub." });
  }
});

// PUT /api/programs/hubs/:id - Update hub
router.put("/hubs/:id", authRequired, async (req, res) => {
  try {
    const hubId = parseInt(req.params.id, 10);
    if (!canAccessHub(req.user, hubId)) {
      return res.status(403).json({ success: false, error: "Access denied to manage this hub." });
    }

    const { name, description } = req.body;
    await db.query("UPDATE hubs SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?", [
      name ? name.trim() : null,
      description,
      hubId,
    ]);

    await logAudit(req, "UPDATE_HUB", "hub", hubId, { name, description });

    res.json({ success: true, message: "Hub updated successfully." });
  } catch (error) {
    console.error("Update hub error:", error);
    res.status(500).json({ success: false, error: "Failed to update hub." });
  }
});

// DELETE /api/programs/hubs/:id - Delete hub (Admin only)
router.delete("/hubs/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const hubId = parseInt(req.params.id, 10);
    await db.query("DELETE FROM hubs WHERE id = ?", [hubId]);
    await logAudit(req, "DELETE_HUB", "hub", hubId, `Deleted hub ID ${hubId}`);
    res.json({ success: true, message: "Hub deleted successfully." });
  } catch (error) {
    console.error("Delete hub error:", error);
    res.status(500).json({ success: false, error: "Failed to delete hub." });
  }
});

// GET /api/programs - List all programs
router.get("/", authRequired, async (req, res) => {
  try {
    const { hub_id, search, status } = req.query;

    let query = `
      SELECT 
        p.id, 
        p.name, 
        p.description, 
        p.hub_id, 
        p.leader_id,
        p.status,
        p.created_at,
        h.name AS hub_name,
        u_lead.name AS leader_name,
        u_lead.email AS leader_email,
        (SELECT COUNT(*) FROM program_members pm WHERE pm.program_id = p.id) AS member_count,
        (SELECT COUNT(*) FROM tasks t WHERE t.program_id = p.id AND t.status != 'completed') AS active_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.program_id = p.id AND t.status = 'completed') AS completed_tasks,
        (SELECT COUNT(*) FROM daily_reports dr WHERE dr.program_id = p.id) AS total_reports
      FROM programs p
      LEFT JOIN hubs h ON p.hub_id = h.id
      LEFT JOIN users u_lead ON p.leader_id = u_lead.id
      WHERE 1=1
    `;
    const params = [];

    // Scope for hub leader
    if (req.user.role === "hub_leader") {
      query += ` AND p.hub_id = ?`;
      params.push(req.user.hub_id);
    } else if (hub_id) {
      query += ` AND p.hub_id = ?`;
      params.push(hub_id);
    }

    if (status) {
      query += ` AND p.status = ?`;
      params.push(status);
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
    const programId = parseInt(req.params.id, 10);
    const hasAccess = await canAccessProgram(req.user, programId);
    if (!hasAccess && req.user.role !== "admin" && req.user.role !== "hub_leader") {
      return res.status(403).json({ success: false, error: "Not authorized to view this program." });
    }

    const [rows] = await db.query(
      `SELECT p.*, h.name AS hub_name, u.name AS leader_name, u.email AS leader_email
       FROM programs p
       LEFT JOIN hubs h ON p.hub_id = h.id
       LEFT JOIN users u ON p.leader_id = u.id
       WHERE p.id = ?`,
      [programId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Program not found." });
    }

    const program = rows[0];

    const [members] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.job_title, u.phone, u.is_active
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
    let { name, description, hub_id, leader_id, member_ids = [] } = req.body;
    if (!name) {
      return res.status(400).json({ success: false, error: "Program name is required." });
    }

    // Hub leader must assign to their hub
    if (req.user.role === "hub_leader") {
      hub_id = req.user.hub_id;
    }

    const [result] = await db.query(
      "INSERT INTO programs (name, description, hub_id, leader_id, status) VALUES (?, ?, ?, ?, 'active')",
      [name.trim(), description || null, hub_id || null, leader_id || null]
    );

    const programId = result.insertId;

    if (Array.isArray(member_ids) && member_ids.length > 0) {
      const values = member_ids.map((uid) => [uid, programId]);
      await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
    }

    await logAudit(req, "CREATE_PROGRAM", "program", programId, { name: name.trim(), hub_id });

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
    const hasAccess = await canAccessProgram(req.user, programId);
    if (!hasAccess && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Not authorized to modify this program." });
    }

    const { name, description, hub_id, leader_id, status, member_ids } = req.body;

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
    if (hub_id !== undefined && req.user.role === "admin") {
      updates.push("hub_id = ?");
      params.push(hub_id || null);
    }
    if (leader_id !== undefined) {
      updates.push("leader_id = ?");
      params.push(leader_id || null);
    }
    if (status) {
      updates.push("status = ?");
      params.push(status);
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

    await logAudit(req, "UPDATE_PROGRAM", "program", programId, req.body);

    res.json({ success: true, message: "Program updated successfully." });
  } catch (error) {
    console.error("Update program error:", error);
    res.status(500).json({ success: false, error: "Failed to update program." });
  }
});

// DELETE /api/programs/:id - Delete program
router.delete("/:id", authRequired, adminOnly, async (req, res) => {
  try {
    const programId = parseInt(req.params.id, 10);
    await db.query("DELETE FROM programs WHERE id = ?", [programId]);
    await logAudit(req, "DELETE_PROGRAM", "program", programId, `Deleted program ${programId}`);
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

    const [prog] = await db.query("SELECT name FROM programs WHERE id = ?", [programId]);
    await createNotification({
      userId: user_id,
      title: "Program Assignment",
      message: `You were assigned as a team member in ${prog[0]?.name || "a program"}.`,
      type: "general",
      link: "#programs",
    });

    res.json({ success: true, message: "Team member assigned to program." });
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

    res.json({ success: true, message: "Member removed from program." });
  } catch (error) {
    console.error("Remove program member error:", error);
    res.status(500).json({ success: false, error: "Failed to remove member." });
  }
});

module.exports = router;
