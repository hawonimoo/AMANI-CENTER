const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired } = require("../middleware");

// GET /api/collaboration - Fetch all field work updates, ideas, and challenges
router.get("/", authRequired, async (req, res) => {
  try {
    const { category, status, search } = req.query;
    let query = `
      SELECT 
        fc.*,
        u.name as author_name,
        u.job_title as author_job_title,
        p.name as program_name,
        (SELECT COUNT(*) FROM field_collaboration_comments fcc WHERE fcc.post_id = fc.id) as comments_count
      FROM field_collaborations fc
      JOIN users u ON fc.author_id = u.id
      LEFT JOIN programs p ON fc.program_id = p.id
      WHERE 1=1
    `;
    const params = [];

    if (category) {
      query += " AND fc.category = ?";
      params.push(category);
    }
    if (status) {
      query += " AND fc.status = ?";
      params.push(status);
    }
    if (search) {
      query += " AND (fc.title LIKE ? OR fc.content LIKE ? OR fc.location LIKE ?)";
      const term = `%${search}%`;
      params.push(term, term, term);
    }

    query += " ORDER BY fc.created_at DESC";

    const [rows] = await db.query(query, params);

    // Summary counts
    const [[stats]] = await db.query(`
      SELECT 
        COUNT(*) as total_posts,
        SUM(CASE WHEN category = 'field_work' THEN 1 ELSE 0 END) as field_work_count,
        SUM(CASE WHEN category = 'idea' THEN 1 ELSE 0 END) as idea_count,
        SUM(CASE WHEN category = 'challenge' THEN 1 ELSE 0 END) as challenge_count,
        SUM(CASE WHEN category = 'success_story' THEN 1 ELSE 0 END) as success_count
      FROM field_collaborations
    `);

    res.json({ success: true, posts: rows, stats: stats || {} });
  } catch (err) {
    console.error("Fetch collaborations error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch collaboration board items" });
  }
});

// POST /api/collaboration - Create a new field update, idea, or challenge
router.post("/", authRequired, async (req, res) => {
  try {
    const { title, category = "field_work", program_id, content, location } = req.body;

    if (!title || !content) {
      return res.status(400).json({ success: false, error: "Title and content description are required." });
    }

    const [result] = await db.query(
      `INSERT INTO field_collaborations (author_id, title, category, program_id, content, location, status)
       VALUES (?, ?, ?, ?, ?, ?, 'open')`,
      [req.user.id, title, category, program_id ? Number(program_id) : null, content, location || null]
    );

    const [newPost] = await db.query(
      `SELECT fc.*, u.name as author_name, u.job_title as author_job_title, p.name as program_name
       FROM field_collaborations fc
       JOIN users u ON fc.author_id = u.id
       LEFT JOIN programs p ON fc.program_id = p.id
       WHERE fc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, post: newPost[0] });
  } catch (err) {
    console.error("Create collaboration post error:", err);
    res.status(500).json({ success: false, error: "Failed to publish collaboration post" });
  }
});

// GET /api/collaboration/:id - Get a single post and its discussion comments
router.get("/:id", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const [postRows] = await db.query(
      `SELECT fc.*, u.name as author_name, u.job_title as author_job_title, p.name as program_name
       FROM field_collaborations fc
       JOIN users u ON fc.author_id = u.id
       LEFT JOIN programs p ON fc.program_id = p.id
       WHERE fc.id = ?`,
      [id]
    );

    if (postRows.length === 0) {
      return res.status(404).json({ success: false, error: "Post not found" });
    }

    const [comments] = await db.query(
      `SELECT fcc.*, u.name as author_name, u.job_title as author_job_title, u.role as author_role
       FROM field_collaboration_comments fcc
       JOIN users u ON fcc.author_id = u.id
       WHERE fcc.post_id = ?
       ORDER BY fcc.created_at ASC`,
      [id]
    );

    res.json({ success: true, post: postRows[0], comments });
  } catch (err) {
    console.error("Fetch single post error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch post details" });
  }
});

// POST /api/collaboration/:id/comments - Add a discussion comment
router.post("/:id/comments", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { comment } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, error: "Comment text cannot be empty." });
    }

    const [result] = await db.query(
      `INSERT INTO field_collaboration_comments (post_id, author_id, comment)
       VALUES (?, ?, ?)`,
      [id, req.user.id, comment.trim()]
    );

    const [newComment] = await db.query(
      `SELECT fcc.*, u.name as author_name, u.job_title as author_job_title, u.role as author_role
       FROM field_collaboration_comments fcc
       JOIN users u ON fcc.author_id = u.id
       WHERE fcc.id = ?`,
      [result.insertId]
    );

    res.status(201).json({ success: true, comment: newComment[0] });
  } catch (err) {
    console.error("Add comment error:", err);
    res.status(500).json({ success: false, error: "Failed to post comment" });
  }
});

// POST /api/collaboration/:id/like - Like or cheer a post
router.post("/:id/like", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    await db.query("UPDATE field_collaborations SET likes_count = likes_count + 1 WHERE id = ?", [id]);
    const [row] = await db.query("SELECT likes_count FROM field_collaborations WHERE id = ?", [id]);
    res.json({ success: true, likes_count: row[0]?.likes_count || 0 });
  } catch (err) {
    console.error("Like error:", err);
    res.status(500).json({ success: false, error: "Failed to like post" });
  }
});

// PATCH /api/collaboration/:id/status - Update collaboration status
router.patch("/:id/status", authRequired, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["open", "in_discussion", "implemented", "resolved"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status" });
    }

    await db.query("UPDATE field_collaborations SET status = ? WHERE id = ?", [status, id]);
    res.json({ success: true, status });
  } catch (err) {
    console.error("Status update error:", err);
    res.status(500).json({ success: false, error: "Failed to update status" });
  }
});

module.exports = router;
