const jwt = require("jsonwebtoken");
const db = require("./db");

// Simple in-memory rate limiter for authentication endpoints
const loginAttempts = new Map();

function rateLimiter({ max = 15, windowMs = 15 * 60 * 1000 } = {}) {
  return (req, res, next) => {
    const ip = req.headers["x-forwarded-for"] || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const record = loginAttempts.get(ip) || { count: 0, resetTime: now + windowMs };

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
    } else {
      record.count += 1;
    }

    loginAttempts.set(ip, record);

    if (record.count > max) {
      const waitMinutes = Math.ceil((record.resetTime - now) / 60000);
      return res.status(429).json({
        success: false,
        error: `Too many login attempts. Please try again in ${waitMinutes} minute(s).`,
      });
    }

    next();
  };
}

// Checks that the user is logged in with a valid JWT
async function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");
    
    // Quick verification that user is still active in database
    const [rows] = await db.query(
      "SELECT id, name, email, role, hub_id, is_active FROM users WHERE id = ?",
      [decoded.id]
    );

    if (rows.length === 0 || !rows[0].is_active) {
      return res.status(401).json({ success: false, error: "Account inactive or no longer exists." });
    }

    req.user = rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: "Invalid or expired token. Please log in again." });
  }
}

// Check role helper
function hasRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, error: "Access denied. Insufficient permissions." });
    }
    next();
  };
}

// Allows admins, hub leaders, and program leaders
function leaderOnly(req, res, next) {
  const allowed = ["admin", "hub_leader", "program_leader"];
  if (!req.user || !allowed.includes(req.user.role)) {
    return res.status(403).json({ success: false, error: "Access restricted to leaders and administrators." });
  }
  next();
}

// Allows admin only
function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== "admin") {
    return res.status(403).json({ success: false, error: "Access restricted to system administrators." });
  }
  next();
}

/**
 * Validates if the current user has permission to view/modify a given program.
 * - Admin: All programs
 * - Hub Leader: Programs in their hub
 * - Program Leader & Staff: Programs where they are assigned as members or leader
 */
async function canAccessProgram(user, programId) {
  if (user.role === "admin") return true;

  const [progRows] = await db.query("SELECT hub_id, leader_id FROM programs WHERE id = ?", [programId]);
  if (progRows.length === 0) return false;

  const prog = progRows[0];
  if (user.role === "hub_leader" && prog.hub_id === user.hub_id) return true;
  if (user.role === "program_leader" && prog.leader_id === user.id) return true;

  // Check membership in program_members
  const [memberRows] = await db.query(
    "SELECT id FROM program_members WHERE user_id = ? AND program_id = ?",
    [user.id, programId]
  );
  return memberRows.length > 0;
}

/**
 * Validates if the current user has permission to view/modify a given hub.
 * - Admin: All hubs
 * - Hub Leader: Only their assigned hub
 */
function canAccessHub(user, hubId) {
  if (user.role === "admin") return true;
  if (user.role === "hub_leader" && String(user.hub_id) === String(hubId)) return true;
  return false;
}

module.exports = {
  rateLimiter,
  authRequired,
  leaderOnly,
  adminOnly,
  hasRole,
  canAccessProgram,
  canAccessHub,
};
