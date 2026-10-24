const express = require("express");
const bcrypt = require("bcryptjs");
const db = require("../db");
const { authRequired, leaderOnly, adminOnly } = require("../middleware");
const { logAudit } = require("../utils/audit");
const { createNotification } = require("../utils/notifications");

const router = express.Router();

// GET /api/users - List users with role scoping and filters
router.get("/", authRequired, async (req, res) => {
  try {
    const { search, role, hub_id, program_id, is_active, page = 1, limit = 50 } = req.query;
    const offset = (parseInt(page, 10) - 1) * parseInt(limit, 10);

    let query = `
      SELECT 
        u.id, 
        u.name, 
        u.email, 
        u.role, 
        u.phone,
        u.job_title,
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

    // Role-based scope enforcement
    if (req.user.role === "hub_leader") {
      query += ` AND u.hub_id = ?`;
      params.push(req.user.hub_id);
    } else if (req.user.role === "program_leader") {
      query += ` AND u.id IN (
        SELECT user_id FROM program_members WHERE program_id IN (
          SELECT id FROM programs WHERE leader_id = ? OR hub_id = ?
        )
      )`;
      params.push(req.user.id, req.user.hub_id);
    } else if (req.user.role === "staff") {
      // Staff only sees colleagues in their programs or same hub
      query += ` AND (u.hub_id = ? OR u.id IN (
        SELECT user_id FROM program_members WHERE program_id IN (
          SELECT program_id FROM program_members WHERE user_id = ?
        )
      ))`;
      params.push(req.user.hub_id, req.user.id);
    }

    if (search) {
      query += ` AND (u.name LIKE ? OR u.email LIKE ? OR u.job_title LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`, `%${search.trim()}%`);
    }

    if (role) {
      query += ` AND u.role = ?`;
      params.push(role);
    }

    if (hub_id && (req.user.role === "admin" || String(hub_id) === String(req.user.hub_id))) {
      query += ` AND u.hub_id = ?`;
      params.push(hub_id);
    }

    if (is_active !== undefined && is_active !== "") {
      query += ` AND u.is_active = ?`;
      params.push(is_active === "true" || is_active === "1" ? 1 : 0);
    }

    if (program_id) {
      query += ` AND u.id IN (SELECT user_id FROM program_members WHERE program_id = ?)`;
      params.push(program_id);
    }

    // Get total count
    const countSql = `SELECT COUNT(*) AS total FROM (${query}) AS filtered_users`;
    const [countResult] = await db.query(countSql, params);
    const totalCount = countResult[0]?.total || 0;

    query += ` ORDER BY u.created_at DESC LIMIT ? OFFSET ?`;
    params.push(parseInt(limit, 10), offset);

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

    res.json({
      success: true,
      total: totalCount,
      page: parseInt(page, 10),
      totalPages: Math.ceil(totalCount / parseInt(limit, 10)),
      count: users.length,
      users,
    });
  } catch (error) {
    console.error("Fetch users error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch users list." });
  }
});

// GET /api/users/:id - Single user details
router.get("/:id", authRequired, async (req, res) => {
  try {
    const targetId = parseInt(req.params.id, 10);
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.phone, u.job_title, u.is_active, u.hub_id, u.created_at, h.name AS hub_name
       FROM users u
       LEFT JOIN hubs h ON u.hub_id = h.id
       WHERE u.id = ?`,
      [targetId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const user = rows[0];

    // Enforce hub leader restriction
    if (req.user.role === "hub_leader" && user.hub_id !== req.user.hub_id) {
      return res.status(403).json({ success: false, error: "Access denied to staff outside your assigned hub." });
    }

    const [programs] = await db.query(
      `SELECT p.id, p.name, p.description, p.status
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

// POST /api/users - Register staff (Admin or Hub/Program Leader)
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    let { name, email, password, role = "staff", hub_id = null, phone, job_title, program_ids = [] } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters." });
    }

    // Role-specific scoping:
    if (req.user.role === "hub_leader") {
      hub_id = req.user.hub_id; // enforce own hub
      if (role === "admin" || role === "hub_leader") {
        return res.status(403).json({ success: false, error: "Hub leaders can only register staff or program leaders." });
      }
    } else if (req.user.role === "program_leader") {
      hub_id = req.user.hub_id;
      if (role !== "staff") {
        return res.status(403).json({ success: false, error: "Program leaders can only register staff members." });
      }
    }

    const [existing] = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "A user with this email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, hub_id, phone, job_title, is_active) VALUES (?, ?, ?, ?, ?, ?, ?, 1)",
      [name.trim(), email.trim(), password_hash, role, hub_id || null, phone || null, job_title || null]
    );

    const newUserId = result.insertId;

    // Attach program memberships
    if (Array.isArray(program_ids) && program_ids.length > 0) {
      const values = program_ids.map((pid) => [newUserId, pid]);
      await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
    }

    // Audit log
    await logAudit(req, "CREATE_USER", "user", newUserId, {
      name: name.trim(),
      email: email.trim(),
      role,
      hub_id,
    });

    // Notify new user
    await createNotification({
      userId: newUserId,
      title: "Account Initialized",
      message: `Welcome to OrgFlow! Your account has been registered as ${role}.`,
      type: "general",
    });

    res.status(201).json({
      success: true,
      message: "Staff member registered successfully.",
      userId: newUserId,
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ success: false, error: "Failed to create user account." });
  }
});

// PUT /api/users/:id - Edit staff details
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
    if (req.user.role === "hub_leader" && existingUser.hub_id !== req.user.hub_id) {
      return res.status(403).json({ success: false, error: "Cannot modify personnel from another hub." });
    }

    const { name, email, phone, job_title, role, hub_id, is_active, program_ids } = req.body;

    const updates = [];
    const params = [];

    if (name) {
      updates.push("name = ?");
      params.push(name.trim());
    }
    if (phone !== undefined) {
      updates.push("phone = ?");
      params.push(phone || null);
    }
    if (job_title !== undefined) {
      updates.push("job_title = ?");
      params.push(job_title || null);
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

    // Privileged fields (role, hub, active status)
    if (isLeader) {
      if (role && (req.user.role === "admin" || (req.user.role === "hub_leader" && role !== "admin"))) {
        updates.push("role = ?");
        params.push(role);
      }
      if (hub_id !== undefined && req.user.role === "admin") {
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

    // Program assignments
    if (isLeader && Array.isArray(program_ids)) {
      await db.query("DELETE FROM program_members WHERE user_id = ?", [targetUserId]);
      if (program_ids.length > 0) {
        const values = program_ids.map((pid) => [targetUserId, pid]);
        await db.query("INSERT IGNORE INTO program_members (user_id, program_id) VALUES ?", [values]);
      }
    }

    await logAudit(req, "UPDATE_USER", "user", targetUserId, {
      updatedFields: req.body,
    });

    res.json({ success: true, message: "User profile updated successfully." });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, error: "Failed to update user." });
  }
});

// POST /api/users/:id/reset-password - Admin password reset
router.post("/:id/reset-password", authRequired, adminOnly, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "Password must be at least 6 characters long." });
    }

    const password_hash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [password_hash, targetUserId]);

    await logAudit(req, "ADMIN_PASSWORD_RESET", "user", targetUserId, "Admin reset user password");

    await createNotification({
      userId: targetUserId,
      title: "Password Reset",
      message: "An administrator has reset your password. Please log in and change it if desired.",
      type: "general",
    });

    res.json({ success: true, message: "User password reset successfully." });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ success: false, error: "Failed to reset password." });
  }
});

// DELETE /api/users/:id - Deactivate user account
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const targetUserId = parseInt(req.params.id, 10);

    if (targetUserId === req.user.id) {
      return res.status(400).json({ success: false, error: "You cannot deactivate your own account." });
    }

    const [rows] = await db.query("SELECT id, role, hub_id FROM users WHERE id = ?", [targetUserId]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    if (rows[0].role === "admin" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, error: "Only administrators can deactivate admin accounts." });
    }

    if (req.user.role === "hub_leader" && rows[0].hub_id !== req.user.hub_id) {
      return res.status(403).json({ success: false, error: "Cannot deactivate users from other hubs." });
    }

    await db.query("UPDATE users SET is_active = 0 WHERE id = ?", [targetUserId]);

    await logAudit(req, "DEACTIVATE_USER", "user", targetUserId, "Account marked inactive");

    res.json({ success: true, message: "User account deactivated successfully." });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, error: "Failed to deactivate user." });
  }
});

module.exports = router;
