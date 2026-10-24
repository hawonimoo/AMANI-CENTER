import React, { useState, useEffect, useRef } from "react";
import api from "../services/api";

export default function Navbar({ user, onLogout, toggleSidebar, onNavigate }) {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSuccess, setPasswordSuccess] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);

  const notifRef = useRef(null);
  const profileRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 45000);

    const handleClickOutside = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifDropdown(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      clearInterval(interval);
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const fetchNotifications = async () => {
    try {
      const res = await api.notifications.getAll();
      setNotifications(res.notifications || []);
      setUnreadCount(res.unreadCount || 0);
    } catch {
      // quiet fail for background polling
    }
  };

  const handleMarkRead = async (id, link) => {
    try {
      await api.notifications.markRead(id);
      fetchNotifications();
      if (link && onNavigate) {
        setShowNotifDropdown(false);
        const cleanPage = link.replace("#", "");
        onNavigate(cleanPage);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.notifications.markAllRead();
      fetchNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordError("");
    setPasswordSuccess("");

    if (newPassword !== confirmPassword) {
      setPasswordError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }

    setPasswordLoading(true);
    try {
      await api.auth.changePassword(currentPassword, newPassword);
      setPasswordSuccess("Password updated successfully!");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setTimeout(() => setShowPasswordModal(false), 1500);
    } catch (err) {
      setPasswordError(err.message || "Failed to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case "admin":
        return "Administrator";
      case "hub_leader":
        return "Hub Leader / Program Manager";
      case "program_leader":
        return "Program Leader / Manager";
      default:
        return "Staff Member";
    }
  };

  const todayStr = new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date());

  return (
    <>
      <header
        style={{
          height: "64px",
          background: "#ffffff",
          borderBottom: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 1.75rem",
          position: "sticky",
          top: 0,
          zIndex: 40,
        }}
      >
        {/* Left Side: Logo & Organization Brand & Date */}
        <div style={{ display: "flex", alignItems: "center", gap: "1.25rem" }}>
          <button
            onClick={toggleSidebar}
            style={{
              padding: "0.4rem",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--color-border)",
              alignItems: "center",
              justifyContent: "center",
              display: "none",
            }}
            className="mobile-toggle-btn"
            title="Toggle Menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Official Logo & Organization Name in Top Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <img
              src="/logo.png"
              alt="Amani Center CBO"
              style={{
                height: "38px",
                width: "auto",
                maxWidth: "48px",
                borderRadius: "6px",
                objectFit: "contain",
                background: "#ffffff",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <span
                  style={{
                    fontSize: "1.0625rem",
                    fontWeight: 800,
                    color: "var(--color-dark)",
                    letterSpacing: "-0.015em",
                  }}
                >
                  Amani Center CBO
                </span>
                <span
                  style={{
                    width: "6px",
                    height: "6px",
                    borderRadius: "50%",
                    background: "var(--color-primary)",
                  }}
                  title="Official System Active"
                />
              </div>
              <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                Operations Management System
              </span>
            </div>
          </div>

          <div className="navbar-sub-meta" style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <div
              style={{
                height: "24px",
                width: "1px",
                background: "var(--color-border)",
                margin: "0 0.25rem",
              }}
            />

            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <span style={{ fontSize: "0.8125rem", color: "var(--color-text-muted)", fontWeight: 500 }}>
                📅 <strong style={{ color: "var(--color-text-main)" }}>{todayStr}</strong>
              </span>
              <span
                style={{
                  fontSize: "0.75rem",
                  background: "#f4f4f5",
                  color: "#18181b",
                  padding: "0.2rem 0.6rem",
                  borderRadius: "var(--radius-full)",
                  fontWeight: 600,
                  border: "1px solid #e4e4e7",
                }}
              >
                📍 KijijiConnect Digital Hub
              </span>
            </div>
          </div>
        </div>

        {/* Right Side: Notification Bell, Profile Menu, Logout */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
          {/* Notification Bell */}
          <div style={{ position: "relative" }} ref={notifRef}>
            <button
              onClick={() => setShowNotifDropdown(!showNotifDropdown)}
              style={{
                position: "relative",
                padding: "0.45rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                color: unreadCount > 0 ? "var(--color-primary)" : "var(--color-text-muted)",
                backgroundColor: showNotifDropdown ? "#f4f4f5" : "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
              title="Notifications"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
              {unreadCount > 0 && (
                <span
                  style={{
                    position: "absolute",
                    top: "-4px",
                    right: "-4px",
                    background: "var(--color-primary)",
                    color: "#ffffff",
                    fontSize: "0.625rem",
                    fontWeight: 800,
                    borderRadius: "999px",
                    padding: "0.1rem 0.35rem",
                    lineHeight: 1,
                  }}
                >
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown Panel */}
            {showNotifDropdown && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 8px)",
                  width: "320px",
                  maxHeight: "400px",
                  background: "#ffffff",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "var(--shadow-xl)",
                  zIndex: 50,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    padding: "0.75rem 1rem",
                    borderBottom: "1px solid var(--color-border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    backgroundColor: "#fafafa",
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: "0.8125rem", color: "var(--color-text-main)" }}>
                    Notifications ({unreadCount} new)
                  </span>
                  {unreadCount > 0 && (
                    <button
                      onClick={handleMarkAllRead}
                      style={{ fontSize: "0.6875rem", color: "var(--color-primary)", fontWeight: 600 }}
                    >
                      Mark all read
                    </button>
                  )}
                </div>

                <div style={{ overflowY: "auto", flex: 1, padding: "0.25rem 0" }}>
                  {notifications.length === 0 ? (
                    <div style={{ padding: "1.5rem", textAlign: "center", color: "#a1a1aa", fontSize: "0.8125rem" }}>
                      No notifications right now.
                    </div>
                  ) : (
                    notifications.map((n) => (
                      <div
                        key={n.id}
                        onClick={() => handleMarkRead(n.id, n.link)}
                        style={{
                          padding: "0.65rem 1rem",
                          borderBottom: "1px solid #f4f4f5",
                          backgroundColor: n.is_read ? "#ffffff" : "#fef2f2",
                          cursor: "pointer",
                          transition: "background 0.15s",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <span style={{ fontWeight: 700, fontSize: "0.75rem", color: n.is_read ? "#3f3f46" : "#991b1b" }}>
                            {n.title}
                          </span>
                          {!n.is_read && (
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#dc2626" }}></span>
                          )}
                        </div>
                        <p style={{ fontSize: "0.75rem", color: "#52525b", marginTop: "2px", lineHeight: 1.3 }}>
                          {n.message}
                        </p>
                        <span style={{ fontSize: "0.625rem", color: "#a1a1aa", marginTop: "4px", display: "block" }}>
                          {n.created_at?.slice(0, 16)}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Card & Dropdown */}
          <div style={{ position: "relative" }} ref={profileRef}>
            <div
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.65rem",
                cursor: "pointer",
                padding: "0.35rem 0.65rem",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)",
                backgroundColor: showProfileMenu ? "#f4f4f5" : "#ffffff",
              }}
            >
              {/* User Avatar with Black/Red badge */}
              <div
                style={{
                  width: "32px",
                  height: "32px",
                  borderRadius: "var(--radius-full)",
                  background: "var(--color-dark)",
                  color: "#ffffff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontWeight: 800,
                  fontSize: "0.8125rem",
                  border: "2px solid #dc2626",
                }}
              >
                {user?.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>

              <div style={{ display: "flex", flexDirection: "column", textAlign: "left" }}>
                <span style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-main)", lineHeight: 1.2 }}>
                  {user?.name || "User"}
                </span>
                <span style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)", marginTop: "1px" }}>
                  {user?.job_title ? user.job_title.slice(0, 26) : getRoleLabel(user?.role)}
                </span>
              </div>

              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "#71717a" }}>
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </div>

            {/* Profile Dropdown Menu */}
            {showProfileMenu && (
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: "calc(100% + 6px)",
                  width: "220px",
                  background: "#ffffff",
                  border: "1px solid var(--color-border)",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-lg)",
                  zIndex: 50,
                  padding: "0.35rem 0",
                }}
              >
                <div style={{ padding: "0.6rem 0.85rem", borderBottom: "1px solid #f4f4f5" }}>
                  <div style={{ fontSize: "0.6875rem", color: "var(--color-text-muted)" }}>Signed in as</div>
                  <div style={{ fontSize: "0.8125rem", fontWeight: 700, color: "var(--color-text-main)", wordBreak: "break-all" }}>
                    {user?.email}
                  </div>
                  <div style={{ marginTop: "4px" }}>
                    <span className={`badge badge-${user?.role || "staff"}`} style={{ fontSize: "0.625rem" }}>
                      {getRoleLabel(user?.role)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    setShowPasswordModal(true);
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.8125rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--color-text-main)",
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#f4f4f5")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                  </svg>
                  <span>Change Password</span>
                </button>

                <div style={{ height: "1px", background: "#f4f4f5", margin: "0.25rem 0" }} />

                <button
                  onClick={() => {
                    setShowProfileMenu(false);
                    onLogout();
                  }}
                  style={{
                    width: "100%",
                    padding: "0.5rem 0.85rem",
                    fontSize: "0.8125rem",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    color: "var(--color-primary)",
                    fontWeight: 600,
                    textAlign: "left",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#fef2f2")}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                    <polyline points="16 17 21 12 16 7"></polyline>
                    <line x1="21" y1="12" x2="9" y2="12"></line>
                  </svg>
                  <span>Sign Out</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "420px" }}>
            <div className="modal-header">
              <h3 className="modal-title">Change Account Password</h3>
              <button onClick={() => setShowPasswordModal(false)} style={{ fontSize: "1.25rem", color: "var(--color-text-muted)" }}>
                ✕
              </button>
            </div>

            <form onSubmit={handlePasswordSubmit}>
              <div className="modal-body">
                {passwordError && (
                  <div className="alert alert-error" style={{ marginBottom: "1rem" }}>
                    <span>{passwordError}</span>
                  </div>
                )}
                {passwordSuccess && (
                  <div className="alert alert-success" style={{ marginBottom: "1rem" }}>
                    <span>{passwordSuccess}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Current Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>New Password (min 6 characters) *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label>Confirm New Password *</label>
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn-secondary" onClick={() => setShowPasswordModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn-primary" disabled={passwordLoading}>
                  {passwordLoading ? "Updating..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
