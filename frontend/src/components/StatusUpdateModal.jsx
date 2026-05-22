import React, { useEffect, useState } from "react";
import Modal from "./Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { STATUS_PRESETS } from "./StatusIcon.jsx";

function StatusUpdateModal({ open, onClose }) {
  const { user, updateStatus } = useAuth();
  const [text, setText] = useState("");
  const [iconKey, setIconKey] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open || !user) return;
    setText(user.customStatus?.text || "");
    setIconKey(user.customStatus?.emoji || "");
    setError("");
  }, [open, user]);

  const handleSave = async () => {
    setSaving(true);
    setError("");
    try {
      await updateStatus(text.trim(), iconKey);
      onClose();
    } catch (err) {
      setError(err.message || "Could not update status");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setSaving(true);
    setError("");
    try {
      await updateStatus("", "");
      onClose();
    } catch (err) {
      setError(err.message || "Could not clear status");
    } finally {
      setSaving(false);
    }
  };

  const selectPreset = (preset) => {
    setIconKey(preset.id);
    if (!text.trim()) setText(preset.label);
  };

  return (
    <Modal
      open={open}
      title="Set a status"
      onClose={onClose}
      footer={
        <>
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white/80"
            onClick={handleClear}
            disabled={saving}
          >
            Clear
          </button>
          <button
            type="button"
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            className="px-4 py-2 rounded-md bg-accent text-white font-semibold hover:bg-accent/90 disabled:opacity-50 text-sm"
            onClick={handleSave}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex gap-2 flex-wrap">
          {STATUS_PRESETS.map((preset) => {
            const Icon = preset.Icon;
            const selected = iconKey === preset.id;
            return (
              <button
                key={preset.id}
                type="button"
                title={preset.label}
                onClick={() => selectPreset(preset)}
                className={`w-9 h-9 rounded-lg border flex items-center justify-center transition-colors ${
                  selected
                    ? "border-accent bg-accent/20 text-accent"
                    : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                }`}
              >
                <Icon size={18} strokeWidth={2} />
              </button>
            );
          })}
        </div>

        <label className="block">
          <span className="text-xs font-medium text-white/60">Status message</span>
          <input
            autoFocus
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            placeholder="What's your status?"
            className="mt-1.5 w-full rounded-lg border border-white/10 bg-[#11161b] px-3 py-2.5 text-sm text-white focus:border-accent/50 focus:outline-none focus:ring-1 focus:ring-accent/30"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !saving) handleSave();
            }}
          />
        </label>

        {error && <p className="text-sm text-red-400">{error}</p>}
      </div>
    </Modal>
  );
}

export default StatusUpdateModal;
