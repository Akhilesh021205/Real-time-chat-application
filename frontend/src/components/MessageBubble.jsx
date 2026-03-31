import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import EmojiPicker from "emoji-picker-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";

const markdownSchema = {
  ...defaultSchema,
  tagNames: Array.from(
    new Set([...(defaultSchema.tagNames || []), "u"])
  ),
  attributes: {
    ...(defaultSchema.attributes || {}),
    a: Array.from(new Set([...(defaultSchema.attributes?.a || []), "target", "rel"])),
  },
};

function MessageBubble({ message, previousMessage, currentUser, onReply }) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.text || message.content || "");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const emojiPickerRef = useRef(null);

  const [isSaved, setIsSaved] = useState(
    currentUser?.savedMessages?.includes(message._id) || false
  );

  const username =
    message.username || message.sender?.username || "User";

  const text =
    message.text || message.content || "";

  const isEdited = message.isEdited;
  const reactions = message.reactions || [];
  const attachment = message.attachment;

  const senderId = message.sender?._id || message.sender;
  const canEdit = currentUser && currentUser._id === senderId;

  const handleSaveEdit = async () => {
    if (!editText.trim() || editText === text) {
      setIsEditing(false);
      return;
    }
    try {
      await axios.put(
        `http://localhost:4000/api/messages/edit/${message._id}`,
        { content: editText },
        { withCredentials: true }
      );
      setIsEditing(false);
    } catch (error) {
      console.error("Failed to edit message:", error);
    }
  };

  const handleToggleReaction = async (emojiStr) => {
    try {
      await axios.post(
        `http://localhost:4000/api/messages/react/${message._id}`,
        { emoji: emojiStr },
        { withCredentials: true }
      );
      setShowEmojiPicker(false);
    } catch (error) {
      console.error("Failed to toggle reaction:", error);
    }
  };

  const handleTogglePin = async () => {
    try {
      await axios.post(
        `http://localhost:4000/api/messages/pin/${message._id}`,
        {},
        { withCredentials: true }
      );
    } catch (error) {
      console.error("Failed to pin message:", error);
    }
  };

  const handleToggleSave = async () => {
    try {
      await axios.post(
        `http://localhost:4000/api/messages/save/${message._id}`,
        {},
        { withCredentials: true }
      );
      setIsSaved((prev) => !prev);
    } catch (error) {
      console.error("Failed to save message:", error);
    }
  };

  // Close emoji picker when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target)) {
        setShowEmojiPicker(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isSameUser =
    previousMessage &&
    (previousMessage.username === username ||
      previousMessage.sender?.username === username);

  const time = message.createdAt
    ? new Date(message.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <div className="group flex gap-3 hover:bg-white/5 hover:backdrop-blur-sm px-3 py-2 rounded-xl transition-all duration-200 relative border border-transparent hover:border-white/5">

      {/* AVATAR */}
      {!isSameUser ? (
        <div className="w-10 h-10 bg-accent/80 shadow-md backdrop-blur-sm shadow-accent/20 rounded-xl flex items-center justify-center font-bold shrink-0 border border-white/10 text-white">
          {username[0]?.toUpperCase()}
        </div>
      ) : (
        <div className="w-9" />
      )}

      <div className="flex flex-col">

        {/* NAME + TIME */}
        {!isSameUser && (
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm text-white">
              {username}
            </span>
            <span className="text-xs text-gray-400">
              {time}
            </span>
          </div>
        )}

        {/* PIN INDICATOR */}
        {message.isPinned && (
          <div className="text-[10px] text-accent font-semibold uppercase tracking-wider mb-0.5 mt-0.5">
            📌 Pinned
          </div>
        )}

        {/* MESSAGE OR EDIT MODE */}
        {isEditing ? (
          <div className="mt-1 flex flex-col gap-2">
            <input
              type="text"
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-lg backdrop-blur-md focus:border-accent/60 focus:ring-1 focus:ring-accent/50 outline-none transition-all duration-200 text-sm text-white px-3 py-2 w-full focus:ring-accent/50 focus:border-accent/60"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveEdit();
                if (e.key === "Escape") setIsEditing(false);
              }}
            />
            <div className="flex gap-2 text-xs">
              <button
                onClick={() => setIsEditing(false)}
                className="bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-sm rounded-lg transition-all duration-200 active:scale-95 text-white/90 px-3 py-1.5"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                className="bg-accent hover:bg-accent/80 text-white px-3 py-1.5 rounded-lg shadow-lg shadow-accent/20 transition-all active:scale-95 border border-accent/50"
              >
                Save
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm text-gray-200 break-words mt-0.5">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[
                rehypeRaw,
                [rehypeSanitize, markdownSchema],
              ]}
              components={{
                p: ({ children }) => <p className="leading-6">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:underline"
                  >
                    {children}
                  </a>
                ),
                code: ({ children }) => (
                  <code className="px-1 py-0.5 rounded bg-black/30 border border-white/10">
                    {children}
                  </code>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc pl-5 space-y-1">{children}</ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal pl-5 space-y-1">{children}</ol>
                ),
                li: ({ children }) => <li>{children}</li>,
              }}
            >
              {text || ""}
            </ReactMarkdown>
            {isEdited && (
              <span className="text-xs text-gray-500 ml-2 italic">(edited)</span>
            )}
            
            {/* ATTACHMENT DISPLAY */}
            {attachment && (
              <div className="mt-2">
                {attachment.match(/\.(jpeg|jpg|gif|png|webp)$/i) ? (
                  <img src={`http://localhost:4000${attachment}`} alt="attachment" className="max-w-xs rounded" />
                ) : (
                  <a href={`http://localhost:4000${attachment}`} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                    📁 Download Attachment
                  </a>
                )}
              </div>
            )}
          </div>
        )}

        {/* REACTIONS DISPLAY */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactions.map((r, i) => {
              const hasReacted = currentUser && r.users.includes(currentUser._id);
              return (
                <button
                  key={i}
                  onClick={() => handleToggleReaction(r.emoji)}
                  className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg border transition-all ${
                    hasReacted 
                      ? "bg-accent/20 border-accent/50 text-accent-100 shadow-sm" 
                      : "bg-white/5 hover:bg-white/10 border border-white/5 backdrop-blur-sm rounded-lg transition-all duration-200 active:scale-95 text-white/90 border-white/10"
                  }`}
                >
                  <span>{r.emoji}</span>
                  <span className="text-[10px]">{r.users.length}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* FLOAT ACTIONS */}
      {!isEditing && (
        <div className="absolute -top-3 right-4 hidden group-hover:flex gap-1.5 bg-panel backdrop-blur-md border border-white/5 rounded-xl shadow-xl p-1 z-10 animate-fade-in shadow-xl">
          
          {/* REPLY BUTTON */}
          <button
            onClick={() => onReply && onReply(message)}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md text-sm transition-colors"
            title="Reply in thread"
          >
            💬
          </button>

          {/* EMOJI BUTTON */}
          <div className="relative" ref={emojiPickerRef}>
            <button
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md text-sm transition-colors"
              title="Add reaction"
            >
              😊
            </button>
            {showEmojiPicker && (
              <div className="absolute top-10 right-0 z-50 shadow-xl">
                <EmojiPicker 
                  theme="dark" 
                  onEmojiClick={(emojiData) => handleToggleReaction(emojiData.emoji)}
                  width={280}
                  height={350}
                  previewConfig={{ showPreview: false }}
                />
              </div>
            )}
          </div>
          {canEdit && (
            <button
              onClick={() => {
                setEditText(text);
                setIsEditing(true);
              }}
              className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md text-sm transition-colors"
              title="Edit message"
            >
              ✏️
            </button>
          )}
          <button
            onClick={handleTogglePin}
            className="text-gray-400 hover:text-white hover:bg-white/10 p-1.5 rounded-md text-sm transition-colors"
            title={message.isPinned ? "Unpin message" : "Pin message"}
          >
            📌
          </button>
          <button
            onClick={handleToggleSave}
            className={`hover:bg-white/10 p-1.5 rounded-md text-sm transition-colors ${isSaved ? "text-accent" : "text-gray-400 hover:text-white"}`}
            title={isSaved ? "Unsave message" : "Save message"}
          >
            🔖
          </button>
        </div>
      )}
    </div>
  );
}

export default MessageBubble;