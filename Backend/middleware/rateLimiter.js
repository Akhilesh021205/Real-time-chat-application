import rateLimit from "express-rate-limit";

// Global rate limiter: 100 requests per 15 minutes per IP
export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, 
  standardHeaders: true, 
  legacyHeaders: false, 
  message: {
    message: "Too many requests from this IP, please try again after 15 minutes.",
  },
});

// Stricter rate limiter for authentication routes: 15 requests per 15 minutes per IP
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, 
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many login or registration attempts. Please try again after 15 minutes.",
  },
});
