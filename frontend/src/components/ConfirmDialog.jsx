import React from "react";
import { AlertTriangle, Trash2 } from "lucide-react";
import Modal from "./Modal.jsx";

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Delete",
  cancelLabel = "Cancel",
  onConfirm,
  onClose,
  loading = false,
  variant = "danger",
}) {
  const isDanger = variant === "danger";
  const Icon = isDanger ? Trash2 : AlertTriangle;

  return (
    <Modal
      open={open}
      title={title}
      onClose={() => {
        if (!loading) onClose?.();
      }}
      footer={
        <>
          <button
            type="button"
            disabled={loading}
            className="px-4 py-2 rounded-md border border-white/10 bg-white/5 hover:bg-white/10 text-sm text-white/90 disabled:opacity-50"
            onClick={onClose}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            disabled={loading}
            className={`px-4 py-2 rounded-md text-sm font-semibold disabled:opacity-50 ${
              isDanger
                ? "bg-red-600 hover:bg-red-500 text-white"
                : "bg-accent hover:bg-accent/90 text-white"
            }`}
            onClick={onConfirm}
          >
            {loading ? "Deleting…" : confirmLabel}
          </button>
        </>
      }
    >
      <div className="flex gap-3">
        <div
          className={`shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
            isDanger ? "bg-red-500/15 text-red-400" : "bg-accent/15 text-accent"
          }`}
        >
          <Icon size={20} strokeWidth={2} />
        </div>
        <p className="text-sm text-white/80 leading-relaxed pt-1.5">{description}</p>
      </div>
    </Modal>
  );
}

export default ConfirmDialog;
