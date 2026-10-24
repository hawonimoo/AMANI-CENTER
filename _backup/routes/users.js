const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { authRequired, leaderOnly, adminOnly } = require("../middleware");

const router = express.Router();

// GET /api/users - List users with filtering
router.get("/", authRequired, async (req, res) => {
  try {
    const { search, role, hub_id, program_id, is_active } = req.query;

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.is_active, 
        u.hub_id, 
        u.created_at,
        h.name AS hub_name,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id) AS total_tasks,
        (SELECT COUNT(*) FROM tasks t WHERE t.assigned_to = u.id AND t.status = 'completed') AS completed_tasks,
        (SELECT COUNT(*) FROM daily_reports dr WHERE dr.user_id = u.id) AS total_reports
      FROM users u
      LEFT JOIN hubs h ON u.hub_id = h.id
      WHERE 1=1
    `;
    const params = [];

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (hub_id) {
      query += ` AND u.hub_id = ?`;
      params.push(hub_id);
    }

    if (is_active !== undefined) {
      query += ` AND u.is_active = ?`;
      params.push(is_active === "true" || is_active === "1" ? 1 : 0);
    }

    if (program_id) {
      query += ` AND u.id IN (SELECT user_id FROM program_members WHERE program_id = ?)`;
      params.push(program_id);
    }

    query += ` ORDER BY u.created_at DESC`;

    const [users] = await db.query(query, params);

    // Fetch programs for all returned users
    if (users.length > 0) {
      const userIds = users.map((u) => u.id);
      const [memberships] = await db.query(
        `SELECT pm.user_id, p.id AS program_id, p.name AS program_name
         FROM program_members pm
         JOIN programs p ON pm.program_id = p.id
         WHERE pm.user_id IN (?)`,
        [userIds]
      );

      const userProgramsMap = {};
      memberships.forEach((m) => {
        if (!userProgramsMap[m.user_id]) userProgramsMap[m.user_id] = [];
        userProgramsMap[m.user_id].push({ id: m.program_id, name: m.program_name });
      });

      users.forEach((u) => {
        u.programs = userProgramsMap[u.id] || [];
      });
    }

    res.json({ success: true, count: users.length, users });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users list." });
  }
});

// GET /api/users/:id - Single user details
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.is_active, u.hub_id, u.created_at, h.name AS hub_name
       FROM users u
       LEFT JOIN hubs h ON u.hub_id = h.id
       WHERE u.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const user = rows[0];

    const [programs] = await db.query(
      `SELECT p.id, p.name, p.description
       FROM program_members pm
       JOIN programs p ON pm.program_id = p.id
       WHERE pm.user_id = ?`,
      [user.id]
    );

    user.programs = programs;

    res.json({ success: true, user });
  } catch (error) {
    console.error("Fetch single user error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch user details." });
  }
});

// POST /api/users - Create new staff/leader (Leader or Admin)
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    const { name, email, password, role = "staff", hub_id = null, program_ids = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    // Role safety: only admin can create other admins
    if (role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only administrators can create admin accounts." });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "A user with this email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, hub_id, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      [name.trim(), email.trim(), password_hash, role, hub_id || null]
    );

    const newUserId = result.insertId;

    // Attach program memberships if provided
    if (Array.isArray(program_ids) && program_ids.length > 0) {
      const values = program_ids.map((pid) => [newUserId, pid]);
      await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
    }

    res.status(201).json({
      success: true,
      message: "Staff member created successfully.",
      user: {
        id: newUserId,
        name: name.trim(),
        email: email.trim(),
        role,
        hub_id: hub_id || null,
        is_active: 1,
      },
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, error: "Failed to create user." });
  }
});

// PUT /api/users/:id - Update user details
router.put("/:id", authRequired, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const isSelf = req.user.id === targetUserId;
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);

    if (!isSelf && !isLeader) {
      return res.status(403).json({ success: false, error: "You do not have permission to edit this user." });
    }

    const [existingRows] = await db.query("SELECT * FROM users WHERE id = ?", [targetUserId]);
    if (existingRows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const existingUser = existingRows[0];
    const { name, email, password, role, hub_id, is_active, program_ids } = req.body;

    const updates = [];
    const params = [];

    if (name) {
      updates.push("name = ?");
      params.push(name.trim());
    }

    if (email && email.trim() !== existingUser.email) {
      const [emailCheck] = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?", [
        email.trim(),
        targetUserId,
      ]);
      if (emailCheck.length > 0) {
        return res.status(409).json({ success: false, error: "Email is already taken by another account." });
      }
      updates.push("email = ?");
      params.push(email.trim());
    }

    if (password) {
      const password_hash = await bcrypt.hash(password, 10);
      updates.push("password_hash = ?");
      params.push(password_hash);
    }

    // Role and active status can only be modified by leaders/admins
    if (isLeader) {
      if (role && (req.user.role === "admin" || role !== "admin")) {
        updates.push("role = ?");
        params.push(role);
      }
      if (hub_id !== undefined) {
        updates.push("hub_id = ?");
        params.push(hub_id || null);
      }
      if (is_active !== undefined) {
        updates.push("is_active = ?");
        params.push(is_active ? 1 : 0);
      }
    }

    if (updates.length > 0) {
      params.push(targetUserId);
      await db.query(`UPDATE users SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    // Update programs if leader provided program_ids
    if (isLeader && Array.isArray(program_ids)) {
      await db.query("DELETE FROM program_members WHERE user_id = ?", [targetUserId]);
      if (program_ids.length > 0) {
        const values = program_ids.map((pid) => [targetUserId, pid]);
        await db.query("INSERT INTO program_members (user_id, program_id) VALUES ?", [values]);
      }
    }

    res.json({ success: true, message: "User updated successfully." });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, error: "Failed to update user." });
  }
});

// DELETE /api/users/:id - Deactivate or remove user
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, error: "You cannot delete your own account." });
    }

    // Check if user exists
    const [rows] = await db.query("SELECT id, role FROM users WHERE id = ?", [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (rows[0].role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only administrators can delete admin accounts." });
    }

    // Soft delete / deactivate
    await db.query("UPDATE users SET is_active = 0 WHERE id = ?", [targetUserId]);

    res.json({ success: true, message: "User deactivated successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, error: "Failed to delete user." });
  }
});

module.exports = router;
