import React from "react";

export default function SlackLogo({ size = 32, showText = true, textClassName = "text-primary" }) {
  return (
    <div className="flex items-center gap-2 select-none">
      <svg 
        width={size} 
        height={size} 
        viewBox="0 0 40 40" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="transform rotate-12 transition-transform duration-300 hover:rotate-45"
      >
        <defs>
          <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#818cf8" />
            <stop offset="50%" stopColor="#c084fc" />
            <stop offset="100%" stopColor="#f472b6" />
          </linearGradient>
          <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Futuristic Interlocking Loops forming a high-tech "S" / Chat Bubbles */}
        <rect x="4" y="4" width="32" height="32" rx="9" fill="#171c22" stroke="url(#logo-grad)" strokeWidth="1.5" />
        
        <path 
          d="M12 18C12 14.6863 14.6863 12 18 12H22V18C22 21.3137 19.3137 24 16 24C12.6863 24 12 21.3137 12 18Z" 
          fill="#38bdf8" 
        />
        <path 
          d="M28 12C31.3137 12 34 14.6863 34 18V22H28C24.6863 22 22 19.3137 22 16C22 12.6863 24.6863 12 28 12Z" 
          fill="#34d399" 
        />
        <path 
          d="M28 22C28 25.3137 25.3137 28 22 28H18V22C18 18.6863 20.6863 16 24 16C27.3137 16 28 18.6863 28 22Z" 
          fill="#fb7185" 
        />
        <path 
          d="M12 28C8.68629 28 6 25.3137 6 22V18H12C15.3137 18 18 20.6863 18 24C18 27.3137 15.3137 28 12 28Z" 
          fill="#fbbf24" 
        />

        {/* Dynamic Center Dot */}
        <circle cx="20" cy="20" r="3" fill="#ffffff" filter="url(#logo-glow)" />
      </svg>
      {showText && (
        <span className={`font-bold tracking-tight mb-0.5 ${textClassName}`} style={{ fontSize: `${Math.max(14, size * 0.75)}px` }}>
          slack
        </span>
      )}
    </div>
  );
}
