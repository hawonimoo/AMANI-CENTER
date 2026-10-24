const express = require("express");
const router = express.Router();
const db = require("../db");
const { authRequired, leaderOnly } = require("../middleware");

// GET /api/finance/summary - Aggregated financials
router.get("/summary", authRequired, async (req, res) => {
  try {
    const [[totals]] = await db.query(`
      SELECT 
        COALESCE(SUM(CASE WHEN type = 'income' AND status = 'approved' THEN amount ELSE 0 END), 0) as total_income,
        COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'approved' THEN amount ELSE 0 END), 0) as total_expense,
        COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as pending_amount,
        COUNT(*) as total_transactions,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending_count
      FROM finance_transactions
    `);

    const [categoryBreakdown] = await db.query(`
      SELECT category, type, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
      FROM finance_transactions
      WHERE status = 'approved'
      GROUP BY category, type
      ORDER BY total DESC
    `);

    const netBalance = Number(totals.total_income || 0) - Number(totals.total_expense || 0);

    res.json({
      success: true,
      summary: {
        total_income: Number(totals.total_income || 0),
        total_expense: Number(totals.total_expense || 0),
        net_balance: netBalance,
        pending_amount: Number(totals.pending_amount || 0),
        total_transactions: totals.total_transactions || 0,
        pending_count: totals.pending_count || 0,
        category_breakdown: categoryBreakdown || []
      }
    });
  } catch (err) {
    console.error("Finance summary fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch financial summary" });
  }
});

// GET /api/finance/transactions - List transactions
router.get("/transactions", authRequired, async (req, res) => {
  try {
    const { type, status, program_id } = req.query;
    let query = `
      SELECT f.*, p.name as program_name, u.name as recorded_by_name, a.name as approved_by_name
      FROM finance_transactions f
      LEFT JOIN programs p ON f.program_id = p.id
      LEFT JOIN users u ON f.recorded_by = u.id
      LEFT JOIN users a ON f.approved_by = a.id
      WHERE 1=1
    `;
    const params = [];

    if (type) {
      query += " AND f.type = ?";
      params.push(type);
    }
    if (status) {
      query += " AND f.status = ?";
      params.push(status);
    }
    if (program_id) {
      query += " AND f.program_id = ?";
      params.push(program_id);
    }

    query += " ORDER BY f.transaction_date DESC, f.id DESC";

    const [rows] = await db.query(query, params);
    res.json({ success: true, transactions: rows });
  } catch (err) {
    console.error("Finance transactions fetch error:", err);
    res.status(500).json({ success: false, error: "Failed to fetch transactions" });
  }
});

// POST /api/finance/transactions - Record new transaction
router.post("/transactions", authRequired, async (req, res) => {
  try {
    const {
      type,
      category,
      program_id,
      amount,
      currency = "KES",
      transaction_date,
      description,
      receipt_reference
    } = req.body;

    if (!type || !category || !amount || !transaction_date || !description) {
      return res.status(400).json({
        success: false,
        error: "Type, category, amount, transaction date, and description are required."
      });
    }

    // Admins and Salma (finance officer) can record as approved directly, others as pending
    const initialStatus = (req.user.role === "admin" || req.user.job_title?.toLowerCase().includes("finance"))
      ? "approved"
      : "pending";
    const approvedBy = initialStatus === "approved" ? req.user.id : null;

    const [result] = await db.query(
      `INSERT INTO finance_transactions 
        (type, category, program_id, amount, currency, transaction_date, description, receipt_reference, status, recorded_by, approved_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        type,
        category,
        program_id || null,
        Number(amount),
        currency,
        transaction_date,
        description,
        receipt_reference || null,
        initialStatus,
        req.user.id,
        approvedBy
      ]
    );

    const [newTx] = await db.query("SELECT * FROM finance_transactions WHERE id = ?", [result.insertId]);
    res.status(201).json({ success: true, transaction: newTx[0] });
  } catch (err) {
    console.error("Create finance transaction error:", err);
    res.status(500).json({ success: false, error: "Failed to record transaction" });
  }
});

// PUT /api/finance/transactions/:id/status - Approve or reject transaction
router.put("/transactions/:id/status", authRequired, leaderOnly, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["approved", "rejected", "pending"].includes(status)) {
      return res.status(400).json({ success: false, error: "Invalid status value" });
    }

    await db.query(
      `UPDATE finance_transactions SET status = ?, approved_by = ? WHERE id = ?`,
      [status, status === "approved" ? req.user.id : null, id]
    );

    const [updated] = await db.query("SELECT * FROM finance_transactions WHERE id = ?", [id]);
    res.json({ success: true, transaction: updated[0] });
  } catch (err) {
    console.error("Update transaction status error:", err);
    res.status(500).json({ success: false, error: "Failed to update transaction status" });
  }
});

module.exports = router;
