require("dotenv").config();

const express = require("express");
const cors = require("cors");
const db = require("./db");

const authRoutes = require("./routes/auth");
const usersRoutes = require("./routes/users");
const programsRoutes = require("./routes/programs");
const tasksRoutes = require("./routes/tasks");
const reportsRoutes = require("./routes/reports");
const attendanceRoutes = require("./routes/attendance");
const notificationsRoutes = require("./routes/notifications");
const announcementsRoutes = require("./routes/announcements");
const analyticsRoutes = require("./routes/analytics");
const radioRoutes = require("./routes/radio");
const commsRoutes = require("./routes/comms");
const financeRoutes = require("./routes/finance");
const climateRoutes = require("./routes/climate");
const hubRoutes = require("./routes/hub");
const collaborationRoutes = require("./routes/collaboration");

const app = express();

// Secure CORS configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
  "http://localhost:4000",
  "http://127.0.0.1:4000",
];
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(null, true); // Permissive in dev, can restrict with strict whitelist
      }
    },
    credentials: true,
  })
);

app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true, limit: "5mb" }));

// Security headers (lightweight without heavy helmet dependency)
app.use((req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// Mount API routes
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/programs", programsRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/reports", reportsRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/radio", radioRoutes);
app.use("/api/comms", commsRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/climate", climateRoutes);
app.use("/api/hub", hubRoutes);
app.use("/api/collaboration", collaborationRoutes);

// Health check endpoint
app.get("/api/health", async (req, res) => {
  try {
    await db.query("SELECT 1");
    res.json({
      success: true,
      service: "OrgFlow Management System API",
      status: "operational",
      database: process.env.DB_NAME || "org_management",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Database health check error:", error.message);
    res.status(500).json({
      success: false,
      status: "database_disconnected",
      error: error.message,
    });
  }
});

// 404 Handler
app.use((req, res) => {
  res.status(404).json({ success: false, error: `Route not found: ${req.method} ${req.url}` });
});

// Global Centralized Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(err.status || 500).json({
    success: false,
    error: process.env.NODE_ENV === "production" ? "Internal server error" : (err.message || "Internal server error"),
  });
});

const PORT = process.env.PORT || 4000;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`OrgFlow backend server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
