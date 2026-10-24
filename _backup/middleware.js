const jwt = require("jsonwebtoken");

// Checks that the user is logged in with a valid JWT
function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ success: false, error: "Authentication required. Please log in." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "default_jwt_secret_key");
    req.user = decoded;
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
  const allowed = ["admin", "hub_leader", "program_leader", "leader"];
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

module.exports = {
  authRequired,
  leaderOnly,
  adminOnly,
  hasRole
};
