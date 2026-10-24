import React, { useState, useEffect } from "react";
import api from "./services/api";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import MyTasks from "./pages/MyTasks";
import DailyReports from "./pages/DailyReports";
import Programs from "./pages/Programs";
import StaffManagement from "./pages/StaffManagement";
import AttendanceLeave from "./pages/AttendanceLeave";
import Announcements from "./pages/Announcements";
import AnalyticsAudit from "./pages/AnalyticsAudit";

// Amani Center CBO Dedicated Modules
import RadioStation from "./pages/RadioStation";
import DigitalHub from "./pages/DigitalHub";
import ClimateProgram from "./pages/ClimateProgram";
import SocialMediaComms from "./pages/SocialMediaComms";
import FinanceDept from "./pages/FinanceDept";
import FieldCollaboration from "./pages/FieldCollaboration";

export default function App() {
  const [user, setUser] = useState(() => api.auth.getCurrentUser());
  const [activePage, setActivePage] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const token = api.auth.getToken();
      if (!token) {
        setInitialLoading(false);
        return;
      }

      try {
        const res = await api.auth.getMe();
        if (res.user) {
          setUser(res.user);
          localStorage.setItem("user", JSON.stringify(res.user));
        }
      } catch (err) {
        console.warn("Session expired or invalid:", err.message);
        api.auth.logout();
      } finally {
        setInitialLoading(false);
      }
    };

    checkSession();

    const handleLogoutEvent = () => {
      setUser(null);
      setActivePage("dashboard");
    };

    window.addEventListener("auth-logout", handleLogoutEvent);
    return () => window.removeEventListener("auth-logout", handleLogoutEvent);
  }, []);

  const handleLogout = () => {
    api.auth.logout();
    setUser(null);
  };

  if (initialLoading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
          fontFamily: "var(--font-main)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img
            src="/logo.png"
            alt="Amani Center CBO"
            style={{
              height: "70px",
              width: "auto",
              objectFit: "contain",
              marginBottom: "1rem",
            }}
          />
          <div style={{ fontSize: "1.125rem", color: "#0a0a0a", fontWeight: 800 }}>
            Amani Center CBO
          </div>
          <div style={{ fontSize: "0.8125rem", color: "#71717a", marginTop: "4px" }}>
            Loading Management System...
          </div>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  const renderActivePage = () => {
    switch (activePage) {
      case "collaboration":
        return <FieldCollaboration user={user} />;
      case "radio":
        return <RadioStation user={user} />;
      case "hub":
        return <DigitalHub user={user} />;
      case "climate":
        return <ClimateProgram user={user} />;
      case "comms":
        return <SocialMediaComms user={user} />;
      case "finance":
        return <FinanceDept user={user} />;
      case "tasks":
        return <MyTasks user={user} />;
      case "reports":
        return <DailyReports user={user} />;
      case "programs":
        return <Programs user={user} />;
      case "attendance":
        return <AttendanceLeave user={user} />;
      case "announcements":
        return <Announcements user={user} />;
      case "staff":
        return <StaffManagement user={user} />;
      case "analytics":
        return <AnalyticsAudit user={user} />;
      case "dashboard":
      default:
        return <Dashboard user={user} onNavigate={setActivePage} />;
    }
  };

  return (
    <div className="app-container">
      <Sidebar
        activePage={activePage}
        setActivePage={setActivePage}
        user={user}
        isOpen={sidebarOpen}
        setIsOpen={setSidebarOpen}
      />

      <div className="main-content">
        <Navbar
          user={user}
          onLogout={handleLogout}
          toggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onNavigate={setActivePage}
        />
        <main>{renderActivePage()}</main>
      </div>
    </div>
  );
}
