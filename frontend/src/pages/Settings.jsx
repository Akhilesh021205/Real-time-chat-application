import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import {
  Bell,
  Video,
  Accessibility,
  Shield,
} from "lucide-react";
import Sidebar from "../components/Sidebar.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = "http://localhost:4000";

function Settings() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [channels, setChannels] = useState([]);
  const [activeArea, setActiveArea] = useState("settings");
  const [activeTab, setActiveTab] = useState("notifications");

  const [notifPerm, setNotifPerm] = useState(
    typeof Notification !== "undefined" ? Notification.permission : "default"
  );
  const [settings, setSettings] = useState({
    notifDesktop: localStorage.getItem("slackClone.notifDesktop") !== "false",
    notifMessages: localStorage.getItem("slackClone.notifMessages") !== "false",
    notifMentions: localStorage.getItem("slackClone.notifMentions") !== "false",
    notifPreview: localStorage.getItem("slackClone.notifPreview") !== "false",
    notifMuteWs: localStorage.getItem("slackClone.notifMuteWs") === "true",
    fontScale: localStorage.getItem("slackClone.fontScale") || "100%",
    reducedMotion: localStorage.getItem("slackClone.reducedMotion") === "true",
    highContrast: localStorage.getItem("slackClone.highContrast") === "true",
    privacyOnline: localStorage.getItem("slackClone.privacyOnline") !== "false",
    privacyRead: localStorage.getItem("slackClone.privacyRead") !== "false",
    privacyLastSeen: localStorage.getItem("slackClone.privacyLastSeen") !== "false",
  });

  const [devices, setDevices] = useState({
    audioinput: [],
    audiooutput: [],
    videoinput: [],
  });
  const [selectedDevices, setSelectedDevices] = useState({
    audioinput: "",
    audiooutput: "",
    videoinput: "",
  });
  const videoRef = useRef(null);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    const syncFromStorage = () => {
      setSettings((prev) => ({
        ...prev,
        notifMuteWs: localStorage.getItem("slackClone.notifMuteWs") === "true",
      }));
    };
    window.addEventListener("slackCloneSettingsChanged", syncFromStorage);
    return () => window.removeEventListener("slackCloneSettingsChanged", syncFromStorage);
  }, []);

  useEffect(() => {
    const load = async () => {
      try {
        const [uRes, cRes] = await Promise.all([
          axios.get(`${API_BASE}/api/users`, { withCredentials: true }),
          axios.get(`${API_BASE}/api/channels`, { withCredentials: true }),
        ]);
        setUsers(uRes.data);
        setChannels(cRes.data);
      } catch (err) {
        console.error(err);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        const allDevices = await navigator.mediaDevices.enumerateDevices();
        const categorized = {
          audioinput: allDevices.filter((d) => d.kind === "audioinput"),
          audiooutput: allDevices.filter((d) => d.kind === "audiooutput"),
          videoinput: allDevices.filter((d) => d.kind === "videoinput"),
        };
        setDevices(categorized);
        setSelectedDevices({
          audioinput: categorized.audioinput[0]?.deviceId || "",
          audiooutput: categorized.audiooutput[0]?.deviceId || "",
          videoinput: categorized.videoinput[0]?.deviceId || "",
        });
      } catch (err) {
        console.warn("Could not access media devices", err);
      }
    };
    if (activeTab === "av") fetchDevices();
  }, [activeTab]);

  useEffect(() => {
    if (activeTab !== "av" || !selectedDevices.videoinput) return;
    navigator.mediaDevices
      .getUserMedia({ video: { deviceId: selectedDevices.videoinput } })
      .then((s) => {
        setStream(s);
        if (videoRef.current) videoRef.current.srcObject = s;
      })
      .catch(console.error);
    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
        setStream(null);
      }
    };
  }, [selectedDevices.videoinput, activeTab]);

  const updateSetting = (key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    localStorage.setItem(`slackClone.${key}`, value.toString());
    if (key === "fontScale") {
      document.documentElement.style.fontSize = value;
    }
    if (key === "reducedMotion" && value) {
      document.documentElement.classList.add("reduce-motion");
    }
    if (key === "reducedMotion" && !value) {
      document.documentElement.classList.remove("reduce-motion");
    }
  };

  const requestNotifPermission = async () => {
    if (typeof Notification === "undefined") return;
    const perm = await Notification.requestPermission();
    setNotifPerm(perm);
  };

  const tabs = [
    { id: "notifications", label: "Notifications", icon: <Bell size={16} /> },
    { id: "av", label: "Audio & Video", icon: <Video size={16} /> },
    { id: "accessibility", label: "Accessibility", icon: <Accessibility size={16} /> },
    { id: "privacy", label: "Privacy & Visibility", icon: <Shield size={16} /> },
  ];

  const renderToggle = (label, key, desc = null) => {
    const checked = settings[key];
    return (
      <div className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
        <div>
          <div className="text-sm font-medium text-white">{label}</div>
          {desc && <div className="text-xs text-gray-500 mt-0.5">{desc}</div>}
        </div>
        <button
          type="button"
          onClick={() => updateSetting(key, !checked)}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
            checked ? "bg-indigo-500" : "bg-white/10"
          }`}
        >
          <span
            className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
              checked ? "translate-x-4" : "translate-x-0.5"
            }`}
          />
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#0a0a0b] text-white overflow-hidden">
      <Sidebar
        users={users}
        channels={channels}
        selectedId={null}
        activeArea={activeArea}
        onSelectArea={setActiveArea}
      />

      <main className="flex-1 min-w-0 flex flex-col bg-[#101418]">
        <header className="h-16 border-b border-white/10 px-8 flex items-center bg-[#11161b]/80 backdrop-blur-md shrink-0">
          <h1 className="text-xl font-bold tracking-tight">Preferences</h1>
          <span className="ml-3 text-sm text-gray-500">
            {user?.username ? `Signed in as ${user.username}` : ""}
          </span>
        </header>

        <div className="flex-1 flex min-h-0 overflow-hidden">
          <aside className="w-[240px] border-r border-white/5 bg-[#11161b] py-6 px-3 shrink-0">
            <nav className="space-y-0.5">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === tab.id
                      ? "bg-indigo-500/15 text-indigo-400"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  {tab.icon}
                  {tab.label}
                </button>
              ))}
            </nav>
          </aside>

          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
            {activeTab === "notifications" && (
              <div className="space-y-6 max-w-xl">
                <h2 className="text-lg font-bold">Notification settings</h2>
                {notifPerm !== "granted" && (
                  <div className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center justify-between gap-4">
                    <div>
                      <div className="text-sm font-bold text-rose-400">
                        Enable desktop notifications
                      </div>
                      <div className="text-xs text-rose-400/70 mt-1">
                        Get alerts when the app is in the background.
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={requestNotifPermission}
                      className="px-4 py-2 bg-rose-500 text-white text-sm font-bold rounded-lg shrink-0"
                    >
                      Enable
                    </button>
                  </div>
                )}
                <div className="bg-white/5 border border-white/10 rounded-xl px-5">
                  {renderToggle(
                    "Desktop notifications",
                    "notifDesktop",
                    "Show OS-level popups for new messages"
                  )}
                  {renderToggle(
                    "Message notifications",
                    "notifMessages",
                    "Notify for new messages in joined channels"
                  )}
                  {renderToggle(
                    "Mentions & keywords",
                    "notifMentions",
                    "Always notify when someone mentions you"
                  )}
                  {renderToggle(
                    "Show previews",
                    "notifPreview",
                    "Show message contents in notifications"
                  )}
                  {renderToggle(
                    "Mute workspace",
                    "notifMuteWs",
                    "Pause all notifications for this workspace"
                  )}
                </div>
              </div>
            )}

            {activeTab === "av" && (
              <div className="space-y-6 max-w-xl">
                <h2 className="text-lg font-bold">Audio & video</h2>
                <div className="bg-black/40 rounded-xl overflow-hidden border border-white/10 aspect-video relative flex items-center justify-center">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  {!stream && (
                    <div className="text-sm text-gray-500 font-medium">
                      Camera preview unavailable
                    </div>
                  )}
                </div>
                <div className="space-y-4">
                  {[
                    { key: "videoinput", label: "Camera", list: devices.videoinput },
                    { key: "audioinput", label: "Microphone", list: devices.audioinput },
                    { key: "audiooutput", label: "Speaker", list: devices.audiooutput },
                  ].map(({ key, label, list }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">
                        {label}
                      </label>
                      <select
                        value={selectedDevices[key]}
                        onChange={(e) =>
                          setSelectedDevices((prev) => ({
                            ...prev,
                            [key]: e.target.value,
                          }))
                        }
                        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                      >
                        {list.map((d) => (
                          <option key={d.deviceId} value={d.deviceId}>
                            {d.label || `Default ${label}`}
                          </option>
                        ))}
                        {list.length === 0 && <option>No devices found</option>}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "accessibility" && (
              <div className="space-y-6 max-w-xl">
                <h2 className="text-lg font-bold">Accessibility</h2>
                <div className="bg-white/5 border border-white/10 rounded-xl px-5 py-2">
                  <div className="py-3 border-b border-white/5">
                    <label className="block text-sm font-medium text-white mb-3">
                      Font scale
                    </label>
                    <select
                      value={settings.fontScale}
                      onChange={(e) => updateSetting("fontScale", e.target.value)}
                      className="w-full bg-gray-900 border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white outline-none focus:border-indigo-500"
                    >
                      <option value="90%">90% (Smaller)</option>
                      <option value="100%">100% (Default)</option>
                      <option value="110%">110% (Larger)</option>
                      <option value="125%">125% (Largest)</option>
                    </select>
                  </div>
                  {renderToggle(
                    "High contrast mode",
                    "highContrast",
                    "Increase contrast for readability"
                  )}
                  {renderToggle(
                    "Reduced motion",
                    "reducedMotion",
                    "Disable non-essential animations"
                  )}
                </div>
              </div>
            )}

            {activeTab === "privacy" && (
              <div className="space-y-6 max-w-xl">
                <h2 className="text-lg font-bold">Privacy & visibility</h2>
                <div className="bg-white/5 border border-white/10 rounded-xl px-5">
                  {renderToggle(
                    "Online status",
                    "privacyOnline",
                    "Let others see when you are active"
                  )}
                  {renderToggle(
                    "Read receipts",
                    "privacyRead",
                    "Show when you have read messages"
                  )}
                  {renderToggle(
                    "Last seen",
                    "privacyLastSeen",
                    "Display your last active time"
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

export default Settings;
