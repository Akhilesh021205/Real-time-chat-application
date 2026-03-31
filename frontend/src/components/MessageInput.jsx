import React, { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";

function MessageInput({
  onSend,
  onTypingChange,
  disabled,
  placeholder,
  users = [],
  currentUser = null,
  draftKey = null,
  draftContext = null,
}) {
  const [text, setText] = useState("");
  const [attachmentUrl, setAttachmentUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [mentionIndex, setMentionIndex] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [recordError, setRecordError] = useState("");
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null);

  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);
  const popoverRef = useRef(null);
  const mentionStartRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const recordChunksRef = useRef([]);

  const handleSend = () => {
    if (!text.trim() && !attachmentUrl) return;
    
    // Instead of passing a string, we might need to change how onSend works in ChatWindow
    // For now, if the parent's handleSend takes a text, we can modify it or pass an object.
    // Parent handleSend is expected to be `onSend(text, attachmentUrl)`
    onSend(text, attachmentUrl);
    setText("");
    setAttachmentUrl(null);
    if (draftKey) localStorage.removeItem(draftKey);
    onTypingChange?.(false);
    setShowEmojiPicker(false);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);
    setRecordError("");
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
  };

  const eligibleUsers = useMemo(() => {
    const me = currentUser?._id;
    return (users || [])
      .filter((u) => u && u.username)
      .filter((u) => (me ? u._id !== me : true));
  }, [users, currentUser?._id]);

  const mentionOptions = useMemo(() => {
    const q = mentionQuery.trim().toLowerCase();
    if (!mentionOpen) return [];
    if (!q) return eligibleUsers.slice(0, 8);
    return eligibleUsers
      .filter((u) => String(u.username).toLowerCase().includes(q))
      .slice(0, 8);
  }, [eligibleUsers, mentionOpen, mentionQuery]);

  const syncMentionState = (nextText, caretPos) => {
    const before = nextText.slice(0, caretPos);
    const lastAt = before.lastIndexOf("@");
    if (lastAt === -1) {
      mentionStartRef.current = null;
      setMentionOpen(false);
      setMentionQuery("");
      setMentionIndex(0);
      return;
    }

    const prevChar = lastAt > 0 ? before[lastAt - 1] : " ";
    const boundaryOk = /\s|\(|\[|\{|"|'|`|,|\.|!|\?/.test(prevChar);
    if (!boundaryOk) {
      mentionStartRef.current = null;
      setMentionOpen(false);
      setMentionQuery("");
      setMentionIndex(0);
      return;
    }

    const token = before.slice(lastAt + 1);
    if (token.includes(" ") || token.includes("\n")) {
      mentionStartRef.current = null;
      setMentionOpen(false);
      setMentionQuery("");
      setMentionIndex(0);
      return;
    }

    mentionStartRef.current = lastAt;
    setMentionOpen(true);
    setMentionQuery(token);
    setMentionIndex(0);
  };

  const handleChange = (e) => {
    const next = e.target.value;
    setText(next);

    if (draftKey && draftContext) {
      if (next.trim() === "") {
        localStorage.removeItem(draftKey);
      } else {
        localStorage.setItem(
          draftKey, 
          JSON.stringify({ ...draftContext, text: next, id: draftKey.split("_")[1] })
        );
      }
    }

    onTypingChange?.(next.length > 0);
    const caretPos = e.target.selectionStart ?? next.length;
    syncMentionState(next, caretPos);
  };

  const handleKeyDown = (e) => {
    if (mentionOpen && mentionOptions.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setMentionIndex((i) => Math.min(i + 1, mentionOptions.length - 1));
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setMentionIndex((i) => Math.max(i - 1, 0));
        return;
      }
      if (e.key === "Enter" && !e.shiftKey) {
        // select mention instead of sending
        if (mentionStartRef.current != null) {
          e.preventDefault();
          const chosen = mentionOptions[mentionIndex];
          if (chosen) insertMention(chosen.username);
          return;
        }
      }
      if (e.key === "Escape") {
        setMentionOpen(false);
        setMentionQuery("");
        setMentionIndex(0);
        return;
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const getSelection = () => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    return { start, end, selected: text.slice(start, end) };
  };

  const replaceRange = (start, end, replacement) => {
    const next = text.slice(0, start) + replacement + text.slice(end);
    setText(next);
    onTypingChange?.(next.length > 0);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      const caret = start + replacement.length;
      textareaRef.current.setSelectionRange(caret, caret);
      syncMentionState(next, caret);
    });
  };

  const wrapSelection = (prefix, suffix = prefix) => {
    const { start, end, selected } = getSelection();
    if (start === end) {
      replaceRange(start, end, `${prefix}${suffix}`);
      requestAnimationFrame(() => {
        if (!textareaRef.current) return;
        const caret = start + prefix.length;
        textareaRef.current.setSelectionRange(caret, caret);
      });
      return;
    }
    replaceRange(start, end, `${prefix}${selected}${suffix}`);
  };

  const toggleListPrefix = (prefix) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? 0;
    const end = el?.selectionEnd ?? start;
    const before = text.slice(0, start);
    const selection = text.slice(start, end);
    const after = text.slice(end);

    const lines = (selection || "").split("\n");
    const allPrefixed = lines.every((l) => l.startsWith(prefix) || l.trim() === "");
    const nextLines = lines.map((l) => {
      if (l.trim() === "") return l;
      return allPrefixed ? l.replace(prefix, "") : `${prefix}${l}`;
    });
    const nextSelection = nextLines.join("\n");
    const next = before + nextSelection + after;
    setText(next);
    onTypingChange?.(next.length > 0);
    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(start, start + nextSelection.length);
      syncMentionState(next, start + nextSelection.length);
    });
  };

  const insertAtCursor = (insertText) => {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? text.length;
    const end = el?.selectionEnd ?? start;
    const next = text.slice(0, start) + insertText + text.slice(end);
    setText(next);
    onTypingChange?.(next.length > 0);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const caret = start + insertText.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(caret, caret);
      syncMentionState(next, caret);
    });
  };

  const insertMention = (username) => {
    const startAt = mentionStartRef.current;
    if (startAt == null) return;
    const el = textareaRef.current;
    const caret = el?.selectionStart ?? text.length;
    const before = text.slice(0, startAt);
    const after = text.slice(caret);
    const insertion = `@${username} `;
    const next = before + insertion + after;
    setText(next);
    setMentionOpen(false);
    setMentionQuery("");
    setMentionIndex(0);

    requestAnimationFrame(() => {
      if (!textareaRef.current) return;
      const newCaret = before.length + insertion.length;
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(newCaret, newCaret);
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await axios.post("http://localhost:4000/api/messages/upload", formData, {
        withCredentials: true,
      });
      setAttachmentUrl(res.data.fileUrl);
    } catch (error) {
      console.error("Upload failed", error);
    } finally {
      setIsUploading(false);
    }
  };

  const uploadBlobAsAttachment = async (blob, filename) => {
    setIsUploading(true);
    setRecordError("");
    try {
      const formData = new FormData();
      formData.append("file", new File([blob], filename, { type: blob.type || "application/octet-stream" }));
      const res = await axios.post(
        "http://localhost:4000/api/messages/upload",
        formData,
        { withCredentials: true }
      );
      setAttachmentUrl(res.data.fileUrl);
    } catch (err) {
      console.error("Audio upload failed", err);
      setRecordError("Audio upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const stopRecording = () => {
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((t) => t.stop());
      mediaStreamRef.current = null;
    }
    setIsRecording(false);
  };

  const startRecording = async () => {
    setRecordError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;

      const recorder = new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      recordChunksRef.current = [];

      recorder.ondataavailable = (evt) => {
        if (evt.data && evt.data.size > 0) recordChunksRef.current.push(evt.data);
      };

      recorder.onstop = async () => {
        const chunks = recordChunksRef.current;
        if (!chunks.length) return;

        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/webm" });

        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
        const preview = URL.createObjectURL(blob);
        setAudioPreviewUrl(preview);

        await uploadBlobAsAttachment(blob, `recording-${Date.now()}.webm`);
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic permission / recording error", err);
      setRecordError("Microphone permission denied or unavailable.");
      setIsRecording(false);
    }
  };

  useEffect(() => {
    const onDocDown = (event) => {
      const target = event.target;
      if (popoverRef.current && target && popoverRef.current.contains(target)) return;
      setShowEmojiPicker(false);
    };
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    return () => {
      try {
        if (audioPreviewUrl) URL.revokeObjectURL(audioPreviewUrl);
      } catch {
        // ignore
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach((t) => t.stop());
        mediaStreamRef.current = null;
      }
    };
  }, []);

  // LOAD DRAFT ON MOUNT
  useEffect(() => {
    if (draftKey) {
      const saved = localStorage.getItem(draftKey);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          setText(parsed.text || "");
        } catch {
          setText(saved);
        }
      } else {
        setText("");
      }
    }
  }, [draftKey]);

  return (
    <div className="bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl p-3 ring-1 ring-white/5 shadow-2xl relative overflow-visible">

      {/* 🔥 TOOLBAR */}
      <div className="flex items-center gap-3 text-gray-400 text-sm border-b border-white/10 pb-2 mb-2">
        <button type="button" className="hover:text-white font-bold" onClick={() => wrapSelection("**")}>
          B
        </button>
        <button type="button" className="hover:text-white italic" onClick={() => wrapSelection("*")}>
          I
        </button>
        <button type="button" className="hover:text-white underline" onClick={() => wrapSelection("<u>", "</u>")}>
          U
        </button>
        <button
          type="button"
          className="hover:text-white"
          onClick={() => {
            const { selected } = getSelection();
            const url = window.prompt("Enter URL");
            if (!url) return;
            if (selected) {
              replaceRange(getSelection().start, getSelection().end, `[${selected}](${url})`);
            } else {
              insertAtCursor(`[link](${url})`);
            }
          }}
        >
          🔗
        </button>
        <button type="button" className="hover:text-white" onClick={() => toggleListPrefix("- ")}>
          • List
        </button>
        <button type="button" className="hover:text-white" onClick={() => toggleListPrefix("1. ")}>
          1.
        </button>
        <button type="button" className="hover:text-white" onClick={() => wrapSelection("`")}>
          {`</>`}
        </button>
      </div>

      {/* ATTACHMENT PREVIEW */}
      {attachmentUrl && (
        <div className="mb-2 relative inline-block">
          {attachmentUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
            <img
              src={`http://localhost:4000${attachmentUrl}`}
              alt="attachment"
              className="w-20 h-20 object-cover rounded"
            />
          ) : audioPreviewUrl ? (
            <audio controls src={audioPreviewUrl} className="w-80 max-w-full" />
          ) : (
            <a
              href={`http://localhost:4000${attachmentUrl}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:underline text-sm"
            >
              Download attachment
            </a>
          )}
          <button 
            onClick={() => setAttachmentUrl(null)}
            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
          >
            ×
          </button>
        </div>
      )}
      {isUploading && <div className="text-xs text-blue-400 mb-2">Uploading...</div>}
      {recordError && <div className="text-xs text-red-400 mb-2">{recordError}</div>}

      {/* 🔥 INPUT AREA */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={2}
          placeholder={placeholder || "Message..."}
          className="w-full bg-transparent outline-none resize-none text-sm text-white placeholder-gray-500 custom-scrollbar"
        />

        {/* @ mention suggestions */}
        {mentionOpen && mentionOptions.length > 0 && (
          <div className="absolute left-0 bottom-full mb-3 w-72 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl shadow-2xl overflow-hidden animate-slide-up origin-bottom-left border border-white/10">
            <div className="px-3 py-2 text-[11px] font-medium uppercase tracking-wider text-white/40 border-b border-white/5 bg-white/5">
              Mention a user
            </div>
            <div className="max-h-56 overflow-y-auto custom-scrollbar">
              {mentionOptions.map((u, idx) => (
                <button
                  key={u._id || u.username}
                  type="button"
                  onClick={() => insertMention(u.username)}
                  className={`w-full flex items-center gap-3 px-3 py-2 text-sm text-left transition-colors ${
                    idx === mentionIndex ? "bg-white/10" : "hover:bg-white/5"
                  }`}
                >
                  <div className="w-8 h-8 rounded-lg bg-accent/80 shadow-sm flex items-center justify-center text-[10px] font-bold border border-white/10">
                    {String(u.username).charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <div className="truncate font-semibold">{u.username}</div>
                    <div className="text-xs text-white/40 truncate">@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 🔥 BOTTOM ACTIONS */}
      <div className="flex items-center justify-between mt-2 text-gray-400">

        <div className="flex items-center gap-3">
          <button className="hover:text-white">＋</button>
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              className="hover:text-white"
              onClick={() => setShowEmojiPicker((v) => !v)}
              title="Emoji"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute bottom-10 left-0 z-50">
                <EmojiPicker
                  theme="dark"
                  width={320}
                  height={360}
                  previewConfig={{ showPreview: false }}
                  onEmojiClick={(emojiData) => {
                    insertAtCursor(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            className="hover:text-white"
            title="Mention"
            onClick={() => {
              insertAtCursor("@");
              setMentionOpen(true);
            }}
          >
            @
          </button>
          
          {/* FILE UPLOAD */}
          <button 
            className="hover:text-white"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            📎
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
          />

          <button
            type="button"
            className={`hover:text-white ${isRecording ? "text-red-400" : ""}`}
            onClick={() => {
              if (isRecording) stopRecording();
              else startRecording();
            }}
            disabled={isUploading}
            title={isRecording ? "Stop recording" : "Record audio"}
          >
            🎤
          </button>
          {isRecording && <span className="text-xs text-red-400">Recording…</span>}
        </div>

        <button
          onClick={handleSend}
          disabled={disabled || isUploading || isRecording}
          className="bg-accent hover:bg-accent/90 text-white px-4 py-1.5 rounded-lg shadow-lg shadow-accent/20 transition-all active:scale-95 disabled:opacity-50 border border-accent/50"
        >
          ➤
        </button>
      </div>
    </div>
  );
}

export default MessageInput;