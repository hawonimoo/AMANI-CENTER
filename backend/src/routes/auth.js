const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authRequired, rateLimiter } = require("../middleware");
const { logAudit } = require("../utils/audit");

const router = express.Router();

function generateToken(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      hub_id: user.hub_id,
    },
    process.env.JWT_SECRET || "default_jwt_secret_key",
    { expiresIn: "7d" }
  );
}

async function getUserPrograms(userId) {
  const [programs] = await db.query(
    `SELECT p.id, p.name, p.hub_id, p.description, p.leader_id, p.status,
            h.name AS hub_name
     FROM program_members pm
     JOIN programs p ON pm.program_id = p.id
     LEFT JOIN hubs h ON p.hub_id = h.id
     WHERE pm.user_id = ?
     ORDER BY p.name ASC`,
    [userId]
  );
  return programs;
}

// POST /api/auth/login
router.post("/login", rateLimiter({ max: 20, windowMs: 15 * 60 * 1000 }), async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.hub_id, u.phone, u.job_title, u.is_active, h.name AS hub_name
       FROM users u
       LEFT JOIN hubs h ON u.hub_id = h.id
       WHERE LOWER(u.email) = LOWER(?)`,
      [email.trim()]
    );

    if (rows.length === 0) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const user = rows[0];
    if (!user.is_active) {
      return res.status(403).json({
        success: false,
        error: "This account has been deactivated. Please contact an organization administrator.",
      });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const programs = await getUserPrograms(user.id);
    const token = generateToken(user);

    // Audit log
    await logAudit(
      { user, headers: req.headers, socket: req.socket },
      "LOGIN_SUCCESS",
      "user",
      user.id,
      `User ${user.email} signed in successfully`
    );

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hub_id: user.hub_id,
        hub_name: user.hub_name,
        phone: user.phone,
        job_title: user.job_title,
        programs,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Failed to authenticate. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.hub_id, u.phone, u.job_title, u.is_active, u.created_at, h.name AS hub_name
       FROM users u
       LEFT JOIN hubs h ON u.hub_id = h.id
       WHERE u.id = ?`,
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User account not found." });
    }

    const user = rows[0];
    const programs = await getUserPrograms(user.id);

    // Unread notifications count
    const [notifCount] = await db.query(
      "SELECT COUNT(*) AS unread FROM notifications WHERE user_id = ? AND is_read = 0",
      [user.id]
    );

    // Today's attendance status
    const today = new Date().toISOString().slice(0, 10);
    const [attRows] = await db.query(
      "SELECT check_in_time, check_out_time, status FROM attendance WHERE user_id = ? AND attendance_date = ?",
      [user.id, today]
    );

    // Today's report status
    const [repRows] = await db.query(
      "SELECT id, status, program_id FROM daily_reports WHERE user_id = ? AND report_date = ? LIMIT 1",
      [user.id, today]
    );

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hub_id: user.hub_id,
        hub_name: user.hub_name,
        phone: user.phone,
        job_title: user.job_title,
        is_active: user.is_active,
        created_at: user.created_at,
        programs,
        unread_notifications: notifCount[0]?.unread || 0,
        today_attendance: attRows[0] || null,
        today_report: repRows[0] || null,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve user profile." });
  }
});

// POST /api/auth/change-password
router.post("/change-password", authRequired, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: "Current and new password are required." });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, error: "New password must be at least 6 characters long." });
    }

    const [rows] = await db.query("SELECT password_hash FROM users WHERE id = ?", [req.user.id]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "User not found." });
    }

    const isMatch = await bcrypt.compare(currentPassword, rows[0].password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Current password does not match." });
    }

    const newHash = await bcrypt.hash(newPassword, 10);
    await db.query("UPDATE users SET password_hash = ? WHERE id = ?", [newHash, req.user.id]);

    await logAudit(req, "PASSWORD_CHANGE", "user", req.user.id, "User changed account password");

    res.json({ success: true, message: "Password updated successfully." });
  } catch (error) {
    console.error("Change password error:", error);
    res.status(500).json({ success: false, error: "Failed to update password." });
  }
});

// POST /api/auth/logout
router.post("/logout", authRequired, async (req, res) => {
  try {
    await logAudit(req, "LOGOUT", "user", req.user.id, "User signed out");
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: "Failed to logout." });
  }
});

module.exports = router;
