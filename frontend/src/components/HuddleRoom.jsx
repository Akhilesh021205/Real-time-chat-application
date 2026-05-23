import React, { useEffect, useRef, useState } from "react";
import { Camera, Headphones, MicOff, X } from "lucide-react";
import { socket } from "../socket/socket.js";
import { useAuth } from "../context/AuthContext.jsx";

const iceServers = [{ urls: "stun:stun.l.google.com:19302" }];

async function getBestAvailableStream() {
  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
  } catch (videoErr) {
    console.warn("Camera + microphone unavailable, trying audio only", videoErr);
  }

  try {
    return await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
  } catch (audioErr) {
    console.warn("Audio unavailable, joining huddle without local media", audioErr);
    return null;
  }
}

function RemoteVideo({ stream, label }) {
  const videoRef = useRef(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return (
    <div className="relative aspect-video bg-black/60 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
      <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
      <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-md">
        {label || "Guest"}
      </div>
    </div>
  );
}

export default function HuddleRoom({ room, onClose, name }) {
  const { user } = useAuth();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peersRef = useRef(new Map());
  const [stream, setStream] = useState(null);
  const [remoteStreams, setRemoteStreams] = useState([]);
  const [error, setError] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [vidMuted, setVidMuted] = useState(false);

  useEffect(() => {
    let mounted = true;

    const removePeer = (socketId) => {
      const peer = peersRef.current.get(socketId);
      if (peer) peer.close();
      peersRef.current.delete(socketId);
      setRemoteStreams((prev) => prev.filter((item) => item.socketId !== socketId));
    };

    const createPeer = (socketId) => {
      const existing = peersRef.current.get(socketId);
      if (existing) return existing;

      const peer = new RTCPeerConnection({ iceServers });
      peersRef.current.set(socketId, peer);

      localStreamRef.current?.getTracks().forEach((track) => {
        peer.addTrack(track, localStreamRef.current);
      });

      peer.onicecandidate = (event) => {
        if (event.candidate) {
          socket.emit("huddle:ice-candidate", { to: socketId, candidate: event.candidate });
        }
      };

      peer.ontrack = (event) => {
        const [remoteStream] = event.streams;
        if (!remoteStream) return;
        setRemoteStreams((prev) => {
          const exists = prev.some((item) => item.socketId === socketId);
          if (exists) {
            return prev.map((item) =>
              item.socketId === socketId ? { ...item, stream: remoteStream } : item
            );
          }
          return [...prev, { socketId, stream: remoteStream, label: "Guest" }];
        });
      };

      peer.onconnectionstatechange = () => {
        if (["failed", "closed", "disconnected"].includes(peer.connectionState)) {
          removePeer(socketId);
        }
      };

      return peer;
    };

    const callPeer = async (socketId) => {
      const peer = createPeer(socketId);
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit("huddle:offer", { to: socketId, offer });
    };

    const start = async () => {
      const joinRoom = () => {
        if (!socket.connected) socket.connect();
        socket.emit("huddle:join", {
          roomId: room,
          user: {
            id: user?._id,
            username: user?.username || "Guest",
          },
        });
      };

      try {
        const currentStream = await getBestAvailableStream();
        if (!mounted) {
          currentStream?.getTracks().forEach((track) => track.stop());
          return;
        }

        localStreamRef.current = currentStream;
        setStream(currentStream);
        if (localVideoRef.current && currentStream) localVideoRef.current.srcObject = currentStream;
        if (!currentStream) setError("Joined without camera/microphone. You can still see others.");
        joinRoom();
      } catch (err) {
        console.error("Failed to start huddle", err);
        setError("Joined without camera/microphone. You can still see others.");
        joinRoom();
      }
    };

    const onParticipants = ({ participants = [] }) => {
      participants.forEach((socketId) => callPeer(socketId).catch(console.error));
    };

    const onUserJoined = ({ socketId }) => {
      createPeer(socketId);
    };

    const onOffer = async ({ from, offer, user: remoteUser }) => {
      const peer = createPeer(from);
      await peer.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit("huddle:answer", { to: from, answer });

      if (remoteUser?.username) {
        setRemoteStreams((prev) =>
          prev.map((item) =>
            item.socketId === from ? { ...item, label: remoteUser.username } : item
          )
        );
      }
    };

    const onAnswer = async ({ from, answer }) => {
      const peer = peersRef.current.get(from);
      if (!peer || peer.signalingState === "stable") return;
      await peer.setRemoteDescription(new RTCSessionDescription(answer));
    };

    const onIceCandidate = async ({ from, candidate }) => {
      const peer = peersRef.current.get(from);
      if (!peer || !candidate) return;
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.warn("Could not add ICE candidate", err);
      }
    };

    socket.on("huddle:participants", onParticipants);
    socket.on("huddle:user-joined", onUserJoined);
    socket.on("huddle:offer", onOffer);
    socket.on("huddle:answer", onAnswer);
    socket.on("huddle:ice-candidate", onIceCandidate);
    socket.on("huddle:user-left", ({ socketId }) => removePeer(socketId));

    start();

    return () => {
      mounted = false;
      socket.emit("huddle:leave", { roomId: room });
      socket.off("huddle:participants", onParticipants);
      socket.off("huddle:user-joined", onUserJoined);
      socket.off("huddle:offer", onOffer);
      socket.off("huddle:answer", onAnswer);
      socket.off("huddle:ice-candidate", onIceCandidate);
      socket.off("huddle:user-left");
      peersRef.current.forEach((peer) => peer.close());
      peersRef.current.clear();
      localStreamRef.current?.getTracks().forEach((track) => track.stop());
      localStreamRef.current = null;
    };
  }, [room, user?._id, user?.username]);

  const toggleMic = () => {
    if (!stream) return;
    stream.getAudioTracks().forEach((track) => {
      track.enabled = micMuted;
    });
    setMicMuted((prev) => !prev);
  };

  const toggleVid = () => {
    if (!stream) return;
    stream.getVideoTracks().forEach((track) => {
      track.enabled = vidMuted;
    });
    setVidMuted((prev) => !prev);
  };

  const participantCount = remoteStreams.length + 1;

  return (
    <div className="absolute inset-0 z-50 bg-[#101418]/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white animate-fade-in shadow-2xl">
      <div className="absolute top-6 left-6 font-bold text-lg flex items-center gap-2">
        <Headphones size={22} strokeWidth={2} /> Huddle: {name || "Room"}
      </div>

      <button
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center font-bold transition-transform active:scale-95"
      >
        <X size={20} strokeWidth={2} />
      </button>

      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">
        <div className="relative aspect-video bg-black/50 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center">
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            className={`w-full h-full object-cover ${vidMuted ? "opacity-0" : "opacity-100"} transition-opacity`}
          />

          {vidMuted && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-24 h-24 bg-accent/30 rounded-full flex items-center justify-center text-4xl shadow-xl border border-white/5 opacity-80 backdrop-blur-sm">
                <Camera size={40} strokeWidth={1.75} className="opacity-80" />
              </div>
            </div>
          )}

          <div className="absolute bottom-4 left-4 bg-black/60 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-md flex items-center gap-2">
            <span>You</span>
            {micMuted && <MicOff size={14} className="text-red-400" strokeWidth={2} />}
          </div>

          {error && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 px-4 text-center">
              <p className="text-red-400 text-lg">{error}</p>
            </div>
          )}
        </div>

        {remoteStreams.map((item) => (
          <RemoteVideo key={item.socketId} stream={item.stream} label={item.label} />
        ))}
      </div>

      <div className="text-xl font-medium text-gray-300 mb-8">
        {remoteStreams.length > 0
          ? `${participantCount} people in huddle`
          : "Waiting for others to join..."}
      </div>

      <div className="flex items-center gap-6">
        <button
          onClick={toggleMic}
          className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-2xl active:scale-90 ${micMuted ? "bg-red-500 text-white" : "bg-[#dce4f2] text-[#1a1c1e] hover:bg-[#c9d5e8]"}`}
          title={micMuted ? "Unmute Microphone" : "Mute Microphone"}
        >
          {micMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
              <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
              <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
              <line x1="12" y1="19" x2="12" y2="22" />
            </svg>
          )}
        </button>

        <button
          onClick={toggleVid}
          className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-2xl active:scale-90 ${vidMuted ? "bg-red-500 text-white" : "bg-[#dce4f2] text-[#1a1c1e] hover:bg-[#c9d5e8]"}`}
          title={vidMuted ? "Turn on Camera" : "Turn off Camera"}
        >
          {vidMuted ? (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34" />
              <line x1="1" y1="1" x2="23" y2="23" />
              <path d="M23 19.11l-7-5v-1.22" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-7 h-7">
              <path d="M23 7l-7 5 7 5V7z" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          )}
        </button>

        <button
          onClick={onClose}
          className="w-16 h-16 rounded-full bg-[#f23f43] hover:bg-red-500 flex items-center justify-center transition-all active:scale-90 shadow-2xl text-white ml-8"
          title="Leave Huddle"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 rotate-[135deg]">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
