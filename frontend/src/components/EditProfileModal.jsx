import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { Camera, Loader2 } from "lucide-react";
import Modal from "./Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

export function resolveProfilePic(pic) {
  if (!pic) return null;
  if (pic.startsWith("http")) return pic;
  return `${API_BASE}${pic}`;
}

function EditProfileModal({ open, onClose }) {
  const { user, setUser } = useAuth();
  const fileRef = useRef(null);

  const [username, setUsername] = useState("");
  const [aboutMe, setAboutMe] = useState("");
  const [previewUrl, setPreviewUrl] = useState(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setUsername(user.username || "");
    setAboutMe(user.aboutMe || "");
    setPreviewUrl(resolveProfilePic(user.profilePic));
    setPendingFile(null);
    setError("");
    setSuccess("");
  }, [open, user]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, or WebP).");
      return;
    }
    setPendingFile(file);
    setPreviewUrl(URL.createObjectURL(file));
    setError("");
  };

  const handleSave = async () => {
    if (!username.trim()) {
      setError("Display name is required.");
      return;
    }
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      let updated = user;

      const profileRes = await axios.post(
        `${API_BASE}/api/custom/profile`,
        { username: username.trim(), aboutMe: aboutMe.trim() },
        { withCredentials: true }
      );
      updated = profileRes.data;
      setUser(updated);

      if (pendingFile) {
        const form = new FormData();
        form.append("profilePic", pendingFile);
        const picRes = await axios.post(`${API_BASE}/api/custom/profile-pic`, form, {
          withCredentials: true,
          headers: { "Content-Type": "multipart/form-data" },
        });
        updated = picRes.data;
        setUser(updated);
        setPreviewUrl(resolveProfilePic(updated.profilePic));
        setPendingFile(null);
      }

      setSuccess("Profile updated.");
      setTimeout(() => onClose?.(), 600);
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to update profile.");
    } finally {
      setSaving(false);
    }
  };

  const initial = (username || user?.username || "U").charAt(0).toUpperCase();

  return (
    <Modal
      open={open}
      title="Edit profile"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border border-white/10 text-sm text-white/80 hover:bg-white/5"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 rounded-lg bg-accent hover:bg-accent/90 text-sm font-medium text-white disabled:opacity-50 flex items-center gap-2"
          >
            {saving && <Loader2 size={16} className="animate-spin" />}
            Save changes
          </button>
        </>
      }
    >
      <div className="space-y-5">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="relative w-20 h-20 rounded-xl border border-white/10 bg-[#11161b] overflow-hidden shrink-0 group"
            title="Upload photo"
          >
            {previewUrl ? (
              <img src={previewUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="w-full h-full flex items-center justify-center text-2xl font-bold text-accent">
                {initial}
              </span>
            )}
            <span className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Camera size={22} className="text-white" />
            </span>
          </button>
          <div className="min-w-0">
            <p className="text-sm text-white/90 font-medium">Profile photo</p>
            <p className="text-xs text-white/50 mt-1">JPG, PNG, or WebP. Shown in sidebar and DMs.</p>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="mt-2 text-xs text-accent hover:underline"
            >
              Upload image
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/60">Display name</span>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#11161b] px-3 py-2.5 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="Your name"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-white/60">About</span>
          <textarea
            value={aboutMe}
            onChange={(e) => setAboutMe(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-white/10 bg-[#11161b] px-3 py-2.5 text-sm text-white resize-none focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            placeholder="A short bio for your teammates"
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
        {success && <p className="text-sm text-emerald-400">{success}</p>}
      </div>
    </Modal>
  );
}

export default EditProfileModal;
