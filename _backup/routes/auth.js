const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");
const { authRequired } = require("../middleware");

const router = express.Router();

// Helper to sign JWT
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

// Helper to fetch user programs
async function getUserPrograms(userId) {
  const [programs] = await db.query(
    `SELECT p.id, p.name, p.hub_id, p.description
     FROM program_members pm
     JOIN programs p ON pm.program_id = p.id
     WHERE pm.user_id = ?
     ORDER BY p.name ASC`,
    [userId]
  );
  return programs;
}

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: "Email and password are required." });
    }

    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.password_hash, u.role, u.hub_id, u.is_active, h.name AS hub_name
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
      return res.status(403).json({ success: false, error: "This account has been deactivated. Contact an administrator." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: "Invalid email or password." });
    }

    const programs = await getUserPrograms(user.id);
    const token = generateToken(user);

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
        programs,
      },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ success: false, error: "Failed to log in. Please try again." });
  }
});

// GET /api/auth/me
router.get("/me", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT u.id, u.name, u.email, u.role, u.hub_id, u.is_active, u.created_at, h.name AS hub_name
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

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        hub_id: user.hub_id,
        hub_name: user.hub_name,
        is_active: user.is_active,
        created_at: user.created_at,
        programs,
      },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ success: false, error: "Failed to retrieve user profile." });
  }
});

// POST /api/auth/register (public registration / bootstrap)
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role = "staff", hub_id = null } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: "Name, email, and password are required." });
    }

    const [existing] = await db.query("SELECT id FROM users WHERE LOWER(email) = LOWER(?)", [email.trim()]);
    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: "An account with this email already exists." });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      "INSERT INTO users (name, email, password_hash, role, hub_id, is_active) VALUES (?, ?, ?, ?, ?, 1)",
      [name.trim(), email.trim(), password_hash, role, hub_id || null]
    );

    const newUser = {
      id: result.insertId,
      name: name.trim(),
      email: email.trim(),
      role,
      hub_id: hub_id || null,
    };

    const token = generateToken(newUser);

    res.status(201).json({
      success: true,
      message: "User registered successfully.",
      token,
      user: { ...newUser, programs: [] },
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ success: false, error: "Failed to register user." });
  }
});

module.exports = router;
