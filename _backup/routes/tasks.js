const express = require("express");
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

const router = express.Router();

// GET /api/tasks - List tasks with flexible filters
router.get("/", authRequired, async (req, res) => {
  try {
    const { program_id, assigned_to, status, search, scope } = req.query;
    const isStaff = req.user.role === "staff";

    let query = `
      SELECT 
        t.id, 
        t.program_id, 
        t.assigned_to, 
        t.assigned_by, 
        t.title, 
        t.description, 
        t.due_date, 
        t.status, 
        t.created_at,
        p.name AS program_name,
        u_assignee.name AS assigned_to_name,
        u_assignee.email AS assigned_to_email,
        u_assigner.name AS assigned_by_name
      FROM tasks t
      JOIN programs p ON t.program_id = p.id
      JOIN users u_assignee ON t.assigned_to = u_assignee.id
      JOIN users u_assigner ON t.assigned_by = u_assigner.id
      WHERE 1=1
    `;
    const params = [];

    // If staff requests "my" or default for staff unless explicit filter
    if (scope === "my" || (isStaff && !assigned_to && !program_id)) {
      query += ` AND t.assigned_to = ?`;
      params.push(req.user.id);
    } else if (assigned_to) {
      query += ` AND t.assigned_to = ?`;
      params.push(assigned_to);
    }

    if (program_id) {
      query += ` AND t.program_id = ?`;
      params.push(program_id);
    }

    if (status) {
      query += ` AND t.status = ?`;
      params.push(status);
    }

    if (search) {
      query += ` AND (t.title LIKE ? OR t.description LIKE ?)`;
      params.push(`%${search.trim()}%`, `%${search.trim()}%`);
    }

    query += ` ORDER BY FIELD(t.status, 'pending', 'in_progress', 'completed'), t.due_date ASC, t.id DESC`;

    const [tasks] = await db.query(query, params);

    // Summary counts
    const counts = {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === "pending").length,
      in_progress: tasks.filter((t) => t.status === "in_progress").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };

    res.json({ success: true, counts, tasks });
  } catch (error) {
    console.error("Fetch tasks error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch tasks." });
  }
});

// GET /api/tasks/:id - Single task
router.get("/:id", authRequired, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        t.*, 
        p.name AS program_name,
        u_assignee.name AS assigned_to_name,
        u_assignee.email AS assigned_to_email,
        u_assigner.name AS assigned_by_name
       FROM tasks t
       JOIN programs p ON t.program_id = p.id
       JOIN users u_assignee ON t.assigned_to = u_assignee.id
       JOIN users u_assigner ON t.assigned_by = u_assigner.id
       WHERE t.id = ?`,
      [req.params.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    res.json({ success: true, task: rows[0] });
  } catch (error) {
    console.error("Fetch single task error:", error);
    res.status(500).json({ success: false, error: "Failed to fetch task." });
  }
});

// POST /api/tasks - Create task (Leaders/Admin)
router.post("/", authRequired, leaderOnly, async (req, res) => {
  try {
    const { program_id, assigned_to, title, description, due_date, status = "pending" } = req.body;

    if (!program_id || !assigned_to || !title) {
      return res.status(400).json({
        success: false,
        error: "Program, assignee, and task title are required.",
      });
    }

    const [result] = await db.query(
      `INSERT INTO tasks (program_id, assigned_to, assigned_by, title, description, due_date, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        program_id,
        assigned_to,
        req.user.id,
        title.trim(),
        description || null,
        due_date || null,
        status || "pending",
      ]
    );

    res.status(201).json({
      success: true,
      message: "Task created successfully.",
      taskId: result.insertId,
    });
  } catch (error) {
    console.error("Create task error:", error);
    res.status(500).json({ success: false, error: "Failed to create task." });
  }
});

// PUT /api/tasks/:id - Update full task details
router.put("/:id", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const [existing] = await db.query("SELECT * FROM tasks WHERE id = ?", [taskId]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    const task = existing[0];
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);
    const isAssignee = task.assigned_to === req.user.id;

    if (!isLeader && !isAssignee) {
      return res.status(403).json({ success: false, error: "Not authorized to update this task." });
    }

    const { program_id, assigned_to, title, description, due_date, status } = req.body;

    const updates = [];
    const params = [];

    // Assignee can update status and description; Leaders can update everything
    if (status) {
      updates.push("status = ?");
      params.push(status);
    }
    if (description !== undefined) {
      updates.push("description = ?");
      params.push(description);
    }

    if (isLeader) {
      if (title) {
        updates.push("title = ?");
        params.push(title.trim());
      }
      if (program_id) {
        updates.push("program_id = ?");
        params.push(program_id);
      }
      if (assigned_to) {
        updates.push("assigned_to = ?");
        params.push(assigned_to);
      }
      if (due_date !== undefined) {
        updates.push("due_date = ?");
        params.push(due_date || null);
      }
    }

    if (updates.length > 0) {
      params.push(taskId);
      await db.query(`UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`, params);
    }

    res.json({ success: true, message: "Task updated successfully." });
  } catch (error) {
    console.error("Update task error:", error);
    res.status(500).json({ success: false, error: "Failed to update task." });
  }
});

// PATCH /api/tasks/:id/status - Quick status toggle
router.patch("/:id/status", authRequired, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (!["pending", "in_progress", "completed"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value." });
    }

    const [existing] = await db.query("SELECT assigned_to, assigned_by FROM tasks WHERE id = ?", [taskId]);
    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    const task = existing[0];
    const isLeader = ["admin", "hub_leader", "program_leader"].includes(req.user.role);
    const isAssignee = task.assigned_to === req.user.id;

    if (!isLeader && !isAssignee) {
      return res.status(403).json({ success: false, error: "Not authorized to change this task's status." });
    }

    await db.query("UPDATE tasks SET status = ? WHERE id = ?", [status, taskId]);

    res.json({ success: true, message: `Task status changed to ${status}.` });
  } catch (error) {
    console.error("Update task status error:", error);
    res.status(500).json({ success: false, error: "Failed to update task status." });
  }
});

// DELETE /api/tasks/:id - Delete task
router.delete("/:id", authRequired, leaderOnly, async (req, res) => {
  try {
    const taskId = parseInt(req.params.id, 10);
    const [existing] = await db.query("SELECT id FROM tasks WHERE id = ?", [taskId]);

    if (existing.length === 0) {
      return res.status(404).json({ success: false, error: "Task not found." });
    }

    await db.query("DELETE FROM tasks WHERE id = ?", [taskId]);
    res.json({ success: true, message: "Task deleted successfully." });
  } catch (error) {
    console.error("Delete task error:", error);
    res.status(500).json({ success: false, error: "Failed to delete task." });
  }
});

module.exports = router;
