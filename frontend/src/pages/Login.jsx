import React, { useState } from "react";
import api from "../services/api";

const ALL_ROSTER = [
  {
    category: "Leadership",
    name: "John Green",
    title: "The Boss / Executive Director",
    email: "john.green@amanicenter.org",
    password: "amani2026",
    roleBadge: "Executive Admin",
  },
  {
    category: "Leadership",
    name: "Khavai Aghribina",
    title: "Overall Project Manager",
    email: "khavai@amanicenter.org",
    password: "amani2026",
    roleBadge: "Executive PM",
  },
  {
    category: "Managers",
    name: "Maureen Buya",
    title: "Vox Radio Station Manager",
    email: "maureen.buya@amanicenter.org",
    password: "amani2026",
    roleBadge: "Radio Manager",
  },
  {
    category: "Managers",
    name: "Bob Wandati",
    title: "KijijiConnect Digital Hub Manager",
    email: "bob.wandati@amanicenter.org",
    password: "amani2026",
    roleBadge: "Hub Manager",
  },
  {
    category: "Managers",
    name: "Salma",
    title: "Finance Officer",
    email: "salma.finance@amanicenter.org",
    password: "amani2026",
    roleBadge: "Finance Lead",
  },
  {
    category: "Managers",
    name: "Maua",
    title: "Climate Change Program Lead",
    email: "maua@amanicenter.org",
    password: "amani2026",
    roleBadge: "Climate Lead",
  },
  {
    category: "Radio Presenters",
    name: "Kula Nzomo",
    title: "Morning Presenter (05:00 – 10:00)",
    email: "kula.nzomo@amanicenter.org",
    password: "amani2026",
    roleBadge: "05:00 - 10:00",
  },
  {
    category: "Radio Presenters",
    name: "Zaikun Abdulkarim",
    title: "Mid-day Presenter (10:00 – 14:00)",
    email: "zaikun@amanicenter.org",
    password: "amani2026",
    roleBadge: "10:00 - 14:00",
  },
  {
    category: "Radio Presenters",
    name: "Yoash Festus",
    title: "Afternoon Presenter (14:00 – 17:00)",
    email: "yoash@amanicenter.org",
    password: "amani2026",
    roleBadge: "14:00 - 17:00",
  },
  {
    category: "Radio Presenters",
    name: "Yusuf Maro",
    title: "Evening Presenter (18:00 – 22:00)",
    email: "yusuf.maro@amanicenter.org",
    password: "amani2026",
    roleBadge: "18:00 - 22:00",
  },
  {
    category: "Staff & Comms",
    name: "Nimoo Farah",
    title: "Cross-Program Operations Staff",
    email: "nimoo.farah@amanicenter.org",
    password: "amani2026",
    roleBadge: "Cross-Program",
  },
  {
    category: "Staff & Comms",
    name: "Elvis",
    title: "Online & Social Media Lead",
    email: "elvis.comms@amanicenter.org",
    password: "amani2026",
    roleBadge: "Online Comms",
  },
  {
    category: "System Admin",
    name: "Super Admin",
    title: "IT System Administrator",
    email: "admin@amanicenter.org",
    password: "admin123",
    roleBadge: "System Admin",
  },
];

export default function Login({ onLoginSuccess }) {
  const [email, setEmail] = useState("john.green@amanicenter.org");
  const [password, setPassword] = useState("amani2026");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState("All");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await api.auth.login(email, password);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const fillQuickAccount = (quickEmail, quickPassword) => {
    setEmail(quickEmail);
    setPassword(quickPassword);
    setError("");
  };

  const handleInstantSignIn = async (acc) => {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
    setLoading(true);
    try {
      const res = await api.auth.login(acc.email, acc.password);
      onLoginSuccess(res.user);
    } catch (err) {
      setError(err.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  const categories = ["All", "Leadership", "Managers", "Radio Presenters", "Staff & Comms"];

  const filteredRoster =
    activeFilter === "All"
      ? ALL_ROSTER
      : ALL_ROSTER.filter((m) => m.category === activeFilter);

  const selectedPerson = ALL_ROSTER.find((m) => m.email === email);

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#0a0a0a",
        padding: "2rem 1rem",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "580px",
          background: "#ffffff",
          borderRadius: "16px",
          padding: "2.25rem 2rem",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.5)",
          borderTop: "6px solid #dc2626",
        }}
      >
        {/* Brand header */}
        <div style={{ textAlign: "center", marginBottom: "1.75rem" }}>
          <img
            src="/logo.png"
            alt="Amani Center CBO"
            style={{
              height: "72px",
              width: "auto",
              maxWidth: "180px",
              objectFit: "contain",
              marginBottom: "0.75rem",
            }}
          />
          <h1
            style={{
              fontSize: "1.5rem",
              fontWeight: 800,
              color: "#0a0a0a",
              letterSpacing: "-0.02em",
            }}
          >
            Amani Center CBO
          </h1>
          <p style={{ fontSize: "0.875rem", color: "#52525b", marginTop: "0.25rem" }}>
            Operations & Unit Management Portal
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: "1.25rem" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <line x1="12" y1="8" x2="12" y2="12"></line>
              <line x1="12" y1="16" x2="12.01" y2="16"></line>
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Work Email Address</label>
              {selectedPerson && (
                <span
                  style={{
                    fontSize: "0.75rem",
                    color: "#dc2626",
                    fontWeight: 700,
                    background: "#fef2f2",
                    padding: "2px 8px",
                    borderRadius: "4px",
                    border: "1px solid #fee2e2",
                  }}
                >
                  Selected: {selectedPerson.name} ({selectedPerson.roleBadge})
                </span>
              )}
            </div>
            <input
              type="email"
              required
              placeholder="name@amanicenter.org"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: "1.5rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Password</label>
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{ fontSize: "0.75rem", color: "#dc2626", fontWeight: 600, padding: 0 }}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
            <input
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary"
            style={{ width: "100%", padding: "0.75rem", fontSize: "0.9375rem" }}
          >
            {loading ? "Authenticating..." : `Sign In as ${selectedPerson ? selectedPerson.name : "Team Member"}`}
          </button>
        </form>

        {/* Quick Accounts Roster for Amani Center */}
        <div style={{ marginTop: "1.75rem", paddingTop: "1.25rem", borderTop: "1px solid #e4e4e7" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "0.65rem",
            }}
          >
            <div
              style={{
                fontSize: "0.75rem",
                fontWeight: 800,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
                color: "#18181b",
              }}
            >
              All 13 Team Members (Click Any to Sign In)
            </div>
            <span style={{ fontSize: "0.6875rem", color: "#71717a" }}>
              Password: <code style={{ color: "#dc2626", fontWeight: 700 }}>amani2026</code>
            </span>
          </div>

          {/* Category Filter Pills */}
          <div
            style={{
              display: "flex",
              gap: "0.35rem",
              flexWrap: "wrap",
              marginBottom: "0.75rem",
            }}
          >
            {categories.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveFilter(cat)}
                style={{
                  padding: "0.25rem 0.6rem",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  borderRadius: "20px",
                  border: activeFilter === cat ? "1px solid #dc2626" : "1px solid #e4e4e7",
                  backgroundColor: activeFilter === cat ? "#dc2626" : "#f4f4f5",
                  color: activeFilter === cat ? "#ffffff" : "#3f3f46",
                  cursor: "pointer",
                }}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Complete Scrollable Grid of All 13 Personnel */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "0.5rem",
              maxHeight: "280px",
              overflowY: "auto",
              paddingRight: "4px",
            }}
          >
            {filteredRoster.map((person) => {
              const isSelected = email === person.email;
              return (
                <button
                  key={person.email}
                  type="button"
                  onClick={() => fillQuickAccount(person.email, person.password)}
                  onDoubleClick={() => handleInstantSignIn(person)}
                  title={`Click to select ${person.name}. Double click to sign in directly.`}
                  style={{
                    padding: "0.55rem 0.65rem",
                    borderRadius: "8px",
                    border: isSelected ? "2px solid #dc2626" : "1px solid #e4e4e7",
                    fontSize: "0.75rem",
                    textAlign: "left",
                    backgroundColor: isSelected ? "#fef2f2" : "#ffffff",
                    transition: "all 0.15s ease",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    minHeight: "68px",
                  }}
                >
                  <div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span style={{ fontWeight: 800, color: "#0a0a0a", fontSize: "0.8125rem" }}>
                        {person.name}
                      </span>
                      <span
                        style={{
                          fontSize: "0.625rem",
                          fontWeight: 700,
                          backgroundColor: isSelected ? "#dc2626" : "#f4f4f5",
                          color: isSelected ? "#ffffff" : "#52525b",
                          padding: "1px 5px",
                          borderRadius: "4px",
                        }}
                      >
                        {person.roleBadge}
                      </span>
                    </div>
                    <div
                      style={{
                        color: "#52525b",
                        fontSize: "0.6875rem",
                        marginTop: "2px",
                        lineHeight: 1.25,
                      }}
                    >
                      {person.title}
                    </div>
                  </div>
                  <div
                    style={{
                      color: isSelected ? "#dc2626" : "#a1a1aa",
                      fontSize: "0.625rem",
                      marginTop: "4px",
                      fontFamily: "monospace",
                    }}
                  >
                    {person.email}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
