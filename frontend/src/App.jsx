import React, { useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";

import Landing from "./pages/Landing.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import Home from "./pages/Home.jsx";
import Chat from "./pages/Chat.jsx";
import Launch from "./pages/Launch.jsx";
import DMs from "./pages/DMs.jsx";
import Files from "./pages/Files.jsx";
import Tools from "./pages/Tools.jsx";
import Activity from "./pages/Activity.jsx";
import Settings from "./pages/Settings.jsx";
import Huddles from "./pages/Huddles.jsx";
import Workspaces from "./pages/Workspaces.jsx";
import Starred from "./pages/Starred.jsx";
import Apps from "./pages/Apps.jsx";
import CanvasPage from "./pages/CanvasPage.jsx";
import PlaceholderPage from "./pages/PlaceholderPage.jsx";
import JoinWorkspace from "./pages/JoinWorkspace.jsx";
import JoinChannel from "./pages/JoinChannel.jsx";

import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { user, loading } = useAuth();

  useEffect(() => {
    const applyTheme = (themeStr) => {
      if (themeStr === "light") {
        document.documentElement.classList.add("light");
        document.documentElement.classList.remove("dark");
      } else if (themeStr === "dark") {
        document.documentElement.classList.add("dark");
        document.documentElement.classList.remove("light");
      } else {
        // System theme
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
          document.documentElement.classList.add("light");
          document.documentElement.classList.remove("dark");
        } else {
          document.documentElement.classList.add("dark");
          document.documentElement.classList.remove("light");
        }
      }
    };

    const savedTheme = localStorage.getItem("slackClone.theme") || "dark";
    applyTheme(savedTheme);

    const mediaQuery = window.matchMedia('(prefers-color-scheme: light)');
    const handleChange = () => {
      if (localStorage.getItem("slackClone.theme") === "system") {
        applyTheme("system");
      }
    };
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-app text-primary text-lg">
        Loading...
      </div>
    );
  }

  return (
    <Router>
      <Routes>

        {/* Public Routes */}
        {!user && (
          <>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:inviteCode" element={<JoinWorkspace />} />
            <Route path="/join-channel/:code" element={<JoinChannel />} />
            <Route path="*" element={<Navigate to="/" />} />
          </>
        )}

        {/* Protected Routes */}
        {user && (
          <>
            <Route path="/home" element={<Home />} />
            <Route path="/dashboard" element={<Navigate to="/home" />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/chat/:id" element={<Chat />} /> 
            <Route path="/chat" element={<Chat />} />
            <Route path="/dms" element={<DMs />} />
            <Route path="/dms/:id" element={<DMs />} />
            <Route path="/files" element={<Files />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />

            {/* Specialized Routes */}
            <Route path="/huddles" element={<Huddles />} />
            <Route path="/directories" element={<Workspaces />} />
            <Route path="/starred" element={<Starred />} />
            <Route path="/apps" element={<Apps />} />
            <Route path="/canvas" element={<CanvasPage />} />
            <Route path="/join/:inviteCode" element={<JoinWorkspace />} />
            <Route path="/join-channel/:code" element={<JoinChannel />} />

            <Route path="*" element={<Navigate to="/home" />} />
          </>
        )}

      </Routes>
    </Router>
  );
}

export default App;
