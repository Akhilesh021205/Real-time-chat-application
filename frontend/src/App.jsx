import React from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router";

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
import PlaceholderPage from "./pages/PlaceholderPage.jsx";

import { useAuth } from "./context/AuthContext.jsx";

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-[#1d1c1d] text-white text-lg">
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
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="*" element={<Navigate to="/login" />} />
          </>
        )}

        {/* Protected Routes */}
        {user && (
          <>
            <Route path="/home" element={<Home />} />
            <Route path="/launch" element={<Launch />} />
            <Route path="/chat/:id" element={<Chat />} /> {/* ✅ dynamic */}
            <Route path="/chat" element={<Chat />} />
            <Route path="/dms" element={<DMs />} />
            <Route path="/files" element={<Files />} />
            <Route path="/tools" element={<Tools />} />
            <Route path="/activity" element={<Activity />} />
            <Route path="/settings" element={<Settings />} />

            {/* Specialized Routes */}
            <Route path="/huddles" element={<Huddles />} />
            <Route path="/directories" element={<Workspaces />} />
            <Route path="/starred" element={<Starred />} />
            <Route path="/apps" element={<Apps />} />

            <Route path="*" element={<Navigate to="/home" />} />
          </>
        )}

      </Routes>
    </Router>
  );
}

export default App;