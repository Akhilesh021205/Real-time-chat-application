import React, { useEffect, useRef, useState } from "react";

export default function HuddleRoom({ room, onClose, name }) {
  const localVideoRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [error, setError] = useState("");
  const [micMuted, setMicMuted] = useState(false);
  const [vidMuted, setVidMuted] = useState(false);

  useEffect(() => {
    let currentStream = null;
    
    const startMedia = async () => {
      try {
        currentStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        setStream(currentStream);
        if (localVideoRef.current) {
          localVideoRef.current.srcObject = currentStream;
        }
      } catch (err) {
        console.error("Failed to get local stream", err);
        setError("Could not access camera/microphone. Please check permissions.");
      }
    };
    
    startMedia();

    return () => {
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const toggleMic = () => {
    if (stream) {
      stream.getAudioTracks().forEach(t => t.enabled = !t.enabled);
      setMicMuted(!micMuted);
    }
  };

  const toggleVid = () => {
    if (stream) {
      stream.getVideoTracks().forEach(t => t.enabled = !t.enabled);
      setVidMuted(!vidMuted);
    }
  };

  return (
    <div className="absolute inset-0 z-50 bg-[#0b1220]/90 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-white animate-fade-in shadow-2xl">
      <div className="absolute top-6 left-6 font-bold text-lg flex items-center gap-2">
        <span className="text-2xl">🎧</span> Huddle: {name || "Room"}
      </div>
      
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center font-bold transition-transform active:scale-95"
      >
        ✕
      </button>

      <div className="relative w-full max-w-4xl aspect-video bg-black/50 border border-white/10 rounded-2xl overflow-hidden shadow-2xl flex items-center justify-center mb-10">
        <video 
          ref={localVideoRef} 
          autoPlay 
          playsInline 
          muted 
          className={`w-full h-full object-cover ${vidMuted ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        />
        
        {vidMuted && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 bg-accent/30 rounded-full flex items-center justify-center text-4xl shadow-xl border border-white/5 opacity-80 backdrop-blur-sm">
              📷
            </div>
          </div>
        )}

        <div className="absolute bottom-6 left-6 bg-black/60 px-3 py-1.5 rounded-lg text-sm font-semibold backdrop-blur-md flex items-center gap-2">
          <span>You</span>
          {micMuted && <span className="text-red-400">🔇</span>}
        </div>
        
        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 z-10 px-4 text-center">
            <p className="text-red-400 text-lg">{error}</p>
          </div>
        )}
      </div>

      <div className="text-xl font-medium text-gray-300 animate-pulse mb-8">
        Waiting for others to join...
      </div>

      <div className="flex items-center gap-6">
        <button 
          onClick={toggleMic}
          className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-2xl active:scale-90 ${micMuted ? 'bg-red-500 text-white' : 'bg-[#dce4f2] text-[#1a1c1e] hover:bg-[#c9d5e8]'}`}
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
              <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
              <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
              <line x1="12" y1="19" x2="12" y2="22"/>
            </svg>
          )}
        </button>
        
        <button 
          onClick={toggleVid}
          className={`w-16 h-16 rounded-[28px] flex items-center justify-center transition-all shadow-2xl active:scale-90 ${vidMuted ? 'bg-red-500 text-white' : 'bg-[#dce4f2] text-[#1a1c1e] hover:bg-[#c9d5e8]'}`}
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
              <path d="M23 7l-7 5 7 5V7z"/>
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
            </svg>
          )}
        </button>
        
        <button 
          onClick={onClose}
          className="w-16 h-16 rounded-full bg-[#f23f43] hover:bg-red-500 flex items-center justify-center transition-all active:scale-90 shadow-2xl text-white ml-8"
          title="Leave Huddle"
        >
          <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8 rotate-[135deg]">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
          </svg>
        </button>
      </div>
    </div>
  );
}
