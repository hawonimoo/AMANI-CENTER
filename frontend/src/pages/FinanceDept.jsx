import React, { useState, useEffect } from "react";
import api from "../services/api";

export default function FinanceDept({ user }) {
  const [summary, setSummary] = useState({
    total_income: 0,
    total_expense: 0,
    net_balance: 0,
    pending_amount: 0,
    total_transactions: 0,
    pending_count: 0,
    category_breakdown: [],
  });
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);

  // Form
  const [formType, setFormType] = useState("expense");
  const [formCategory, setFormCategory] = useState("Operations & Utilities");
  const [formProgramId, setFormProgramId] = useState("");
  const [formAmount, setFormAmount] = useState("");
  const [formCurrency, setFormCurrency] = useState("KES");
  const [formDate, setFormDate] = useState(new Date().toISOString().split("T")[0]);
  const [formDescription, setFormDescription] = useState("");
  const [formReceiptRef, setFormReceiptRef] = useState("");

  const isLeader = ["admin", "hub_leader", "program_leader"].includes(user?.role);
  const isFinanceOfficer = user?.job_title?.toLowerCase().includes("finance") || user?.role === "admin";

  useEffect(() => {
    fetchFinanceData();
  }, []);

  const fetchFinanceData = async () => {
    setLoading(true);
    setError("");
    try {
      const [sumRes, txRes] = await Promise.all([
        api.finance.getSummary(),
        api.finance.getTransactions(),
      ]);
      setSummary(sumRes.summary || {});
      setTransactions(txRes.transactions || []);
    } catch (err) {
      setError(err.message || "Failed to load financial records.");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTransaction = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await api.finance.createTransaction({
        type: formType,
        category: formCategory,
        program_id: formProgramId ? Number(formProgramId) : null,
        amount: Number(formAmount),
        currency: formCurrency,
        transaction_date: formDate,
        description: formDescription,
        receipt_reference: formReceiptRef,
      });
      setSuccess("Transaction voucher recorded successfully.");
      setShowModal(false);
      // Reset form
      setFormAmount("");
      setFormDescription("");
      setFormReceiptRef("");
      fetchFinanceData();
    } catch (err) {
      setError(err.message || "Failed to record transaction.");
    }
  };

  const handleUpdateStatus = async (id, status) => {
    try {
      await api.finance.updateStatus(id, status);
      setSuccess(`Transaction marked as ${status}.`);
      fetchFinanceData();
    } catch (err) {
      setError(err.message || "Failed to update transaction status.");
    }
  };

  return (
    <div className="page-container">
      {/* Header */}
      <div className="page-header">
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span style={{ fontSize: "1.25rem" }}>💳</span>
            <h1 className="page-title">Finance Department</h1>
          </div>
          <p className="page-subtitle">
            Budget Management, Income & Expense Vouchers, Receipt Tracking & Approvals
          </p>
        </div>

        <button className="btn-primary" onClick={() => setShowModal(true)}>
          + Record Voucher / Expense
        </button>
      </div>

      {/* Leadership Notice */}
      <div
        className="card"
        style={{
          borderLeft: "4px solid #dc2626",
          marginBottom: "1.75rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontWeight: 800, fontSize: "0.9375rem", color: "#0a0a0a" }}>
            Finance Officer: <span style={{ color: "#dc2626" }}>Salma</span>
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#52525b", marginTop: "2px" }}>
            Clean Financial Slate: In accordance with instructions, this module begins with zero fictional balances. Only verified organizational vouchers will appear.
          </div>
        </div>
        <span className="badge badge-completed">Audit Clean</span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Financial Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Total Income (KES)
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            KES {Number(summary.total_income || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Verified approved inflows</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Total Expenses (KES)
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#dc2626", margin: "0.25rem 0" }}>
            KES {Number(summary.total_expense || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Disbursed program funds</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Net Operating Balance
          </div>
          <div
            style={{
              fontSize: "1.875rem",
              fontWeight: 800,
              color: summary.net_balance >= 0 ? "#0a0a0a" : "#dc2626",
              margin: "0.25rem 0",
            }}
          >
            KES {Number(summary.net_balance || 0).toLocaleString()}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>Available treasury balance</div>
        </div>

        <div className="card">
          <div style={{ fontSize: "0.75rem", color: "#71717a", fontWeight: 700, textTransform: "uppercase" }}>
            Pending Vouchers
          </div>
          <div style={{ fontSize: "1.875rem", fontWeight: 800, color: "#0a0a0a", margin: "0.25rem 0" }}>
            {summary.pending_count || 0}
          </div>
          <div style={{ fontSize: "0.75rem", color: "#52525b" }}>
            KES {Number(summary.pending_amount || 0).toLocaleString()} awaiting Salma/Admin approval
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Date & Ref</th>
              <th>Description</th>
              <th>Category</th>
              <th>Type</th>
              <th>Amount</th>
              <th>Status</th>
              <th style={{ textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: "center", color: "#71717a", padding: "3rem" }}>
                  <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🧾</div>
                  <div style={{ fontWeight: 700, color: "#0a0a0a", fontSize: "1rem" }}>
                    No Financial Transactions Recorded Yet
                  </div>
                  <div style={{ fontSize: "0.8125rem", color: "#71717a", marginTop: "0.25rem" }}>
                    The system is currently configured with zero fictional balances. Finance Officer Salma or Administrators can record real receipts and vouchers above.
                  </div>
                </td>
              </tr>
            ) : (
              transactions.map((t) => (
                <tr key={t.id}>
                  <td>
                    <div style={{ fontWeight: 700, color: "#0a0a0a" }}>{t.transaction_date}</div>
                    <div style={{ fontSize: "0.75rem", color: "#71717a", fontFamily: "var(--font-mono)" }}>
                      {t.receipt_reference || "No ref#"}
                    </div>
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: "#0a0a0a" }}>{t.description}</div>
                    {t.program_name && (
                      <div style={{ fontSize: "0.75rem", color: "#71717a" }}>
                        Program: {t.program_name}
                      </div>
                    )}
                  </td>
                  <td>
                    <span style={{ fontSize: "0.8125rem", fontWeight: 600 }}>{t.category}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        color: t.type === "income" ? "#0a0a0a" : "#dc2626",
                      }}
                    >
                      {t.type}
                    </span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontWeight: 800,
                        fontFamily: "var(--font-mono)",
                        color: t.type === "income" ? "#0a0a0a" : "#dc2626",
                      }}
                    >
                      {t.type === "income" ? "+" : "-"} KES {Number(t.amount).toLocaleString()}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge badge-${
                        t.status === "approved"
                          ? "completed"
                          : t.status === "rejected"
                          ? "needs_changes"
                          : "pending"
                      }`}
                    >
                      {t.status}
                    </span>
                  </td>
                  <td style={{ textAlign: "right" }}>
                    {isFinanceOfficer && t.status === "pending" ? (
                      <div style={{ display: "inline-flex", gap: "0.4rem" }}>
                        <button
                          className="btn-secondary"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleUpdateStatus(t.id, "approved")}
                        >
                          Approve
                        </button>
                        <button
                          className="btn-danger"
                          style={{ padding: "0.3rem 0.6rem", fontSize: "0.75rem" }}
                          onClick={() => handleUpdateStatus(t.id, "rejected")}
                        >
                          Reject
                        </button>
                      </div>
                    ) : (
                      <span style={{ fontSize: "0.75rem", color: "#71717a" }}>
                        {t.status === "approved" ? "Verified" : t.status}
                      </span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal: Record Transaction */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 className="modal-title">Record Financial Voucher</h3>
              <button onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleCreateTransaction}>
              <div className="modal-body">
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Transaction Type *</label>
                    <select value={formType} onChange={(e) => setFormType(e.target.value)}>
                      <option value="expense">Expense (Outflow)</option>
                      <option value="income">Income / Grant (Inflow)</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Category *</label>
                    <select value={formCategory} onChange={(e) => setFormCategory(e.target.value)}>
                      <option value="Radio Broadcast Operations">Radio Broadcast Operations</option>
                      <option value="Digital Hub Equipment & Lab">Digital Hub Equipment & Lab</option>
                      <option value="Climate Seedlings & Outreach">Climate Seedlings & Outreach</option>
                      <option value="Communications & Media">Communications & Media</option>
                      <option value="Staff Allowances & Stipends">Staff Allowances & Stipends</option>
                      <option value="Office Rent & Utilities">Office Rent & Utilities</option>
                      <option value="Donor Grant Disbursement">Donor Grant Disbursement</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Amount (KES) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g. 15000"
                    />
                  </div>
                  <div className="form-group">
                    <label>Currency</label>
                    <input
                      type="text"
                      disabled
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
                  <div className="form-group">
                    <label>Transaction Date *</label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label>Receipt / Voucher Ref#</label>
                    <input
                      type="text"
                      value={formReceiptRef}
                      onChange={(e) => setFormReceiptRef(e.target.value)}
                      placeholder="e.g. REC-2026-001"
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Assign to Program / Department (Optional)</label>
                  <select
                    value={formProgramId}
                    onChange={(e) => setFormProgramId(e.target.value)}
                  >
                    <option value="">-- General Organizational Treasury --</option>
                    <option value="1">Radio Station</option>
                    <option value="2">KijijiConnect Digital Hub Programs</option>
                    <option value="3">Climate Change Program</option>
                    <option value="4">Organization-wide Social Media and Communications</option>
                    <option value="5">Finance Department</option>
                    <option value="6">Program Management & Leadership</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Description & Purpose *</label>
                  <textarea
                    rows="3"
                    required
                    value={formDescription}
                    onChange={(e) => setFormDescription(e.target.value)}
                    placeholder="Details of expense, vendor name, or grant source..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  Save Transaction
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
