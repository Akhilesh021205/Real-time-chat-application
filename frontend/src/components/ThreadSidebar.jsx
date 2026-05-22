import React, { useEffect, useState, useRef } from "react";
import { X } from "lucide-react";
import axios from "axios";
import { socket } from "../socket/socket";
import MessageBubble from "./MessageBubble.jsx";
import MessageInput from "./MessageInput.jsx";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:4000";

function ThreadSidebar({ parentMessage, currentUser, users = [], onClose, room }) {
  const [replies, setReplies] = useState([]);
  const listEndRef = useRef(null);

  // Fetch thread replies
  useEffect(() => {
    if (!parentMessage) return;
    const fetchReplies = async () => {
      try {
        const res = await axios.get(
          `${API_BASE}/api/messages/thread/${parentMessage._id}`,
          { withCredentials: true }
        );
        // dedupe replies
        const deduped = [];
        const seen = new Set();
        (res.data || []).forEach((r) => {
          const id = r._id || r.createdAt || JSON.stringify(r);
          if (!seen.has(id)) {
            seen.add(id);
            deduped.push(r);
          }
        });
        setReplies(deduped);
      } catch (err) {
        console.error("Failed to fetch thread replies", err);
      }
    };
    fetchReplies();
  }, [parentMessage]);

  // Socket listener for new replies in the room
  useEffect(() => {
    if (!room || !parentMessage) return;

    const onNewReply = (newReply) => {
      // Only add if it belongs to this thread
      if (newReply.parentMessage === parentMessage._id) {
        setReplies((prev) => {
          if (prev.some((m) => m._id === newReply._id)) return prev;
          return [...prev, newReply];
        });
      }
    };

    const onMessageUpdated = (updatedMsg) => {
      if (updatedMsg._id === parentMessage._id) {
        // Parent message updated (could handle it here if passed as state, but we rely on ChatWindow for parent)
      } else {
        setReplies((prev) =>
          prev.map((m) => (m._id === updatedMsg._id ? { ...m, ...updatedMsg } : m))
        );
      }
    };

    socket.on("newReply", onNewReply);
    socket.on("messageEdited", onMessageUpdated);
    socket.on("messageReacted", onMessageUpdated);

    return () => {
      socket.off("newReply", onNewReply);
      socket.off("messageEdited", onMessageUpdated);
      socket.off("messageReacted", onMessageUpdated);
    };
  }, [room, parentMessage]);

  // Auto scroll
  useEffect(() => {
    listEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [replies]);

  const handleSendReply = async (text, attachmentUrl) => {
    if ((!text || !text.trim()) && !attachmentUrl) return;

    try {
      const payload = {
        content: text || "",
        attachment: attachmentUrl,
        channelId: room, // using 'room' as the channelId for the reply payload
        parentMessageId: parentMessage._id,
      };

      await axios.post(`${API_BASE}/api/messages/reply`, payload, {
        withCredentials: true,
      });
    } catch (err) {
      console.error("Failed to send reply", err);
    }
  };

  if (!parentMessage) return null;

  return (
    <div className="w-80 border-l border-[#1f2937] bg-[#0b132b] flex flex-col h-full text-white">
      {/* Header */}
      <div className="px-4 py-3 border-b border-[#1f2937] flex items-center justify-between">
        <h2 className="font-bold text-lg">Thread</h2>
        <button onClick={onClose} className="text-gray-400 hover:text-white p-1" aria-label="Close thread">
          <X size={18} strokeWidth={2} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Parent Message (Original) */}
        <div className="pb-4 border-b border-[#1f2937] border-dashed">
          <MessageBubble message={parentMessage} currentUser={currentUser} />
        </div>

        {/* Replies */}
        <div className="mt-4 space-y-4">
          <div className="text-xs text-gray-500 font-semibold uppercase tracking-wider">
            {replies.length} replies
          </div>
          {replies.map((reply, i) => (
            <MessageBubble
              key={`${reply._id || reply.createdAt || i}-${i}`}
              message={reply}
              previousMessage={replies[i - 1]}
              currentUser={currentUser}
              onRetry={() => {}}
            />
          ))}
          <div ref={listEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-[#1f2937]">
        <MessageInput
          onSend={handleSendReply}
          onTypingChange={() => {}}
          placeholder="Reply..."
          disabled={false}
          users={users}
          currentUser={currentUser}
          draftKey={`draft_${parentMessage._id}`}
          draftContext={{ title: `Thread: ${parentMessage.sender?.username || 'User'}` }}
        />
      </div>
    </div>
  );
}

export default ThreadSidebar;
