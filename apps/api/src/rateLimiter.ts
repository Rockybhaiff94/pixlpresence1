import rateLimit from 'express-rate-limit';

// Global API Rate Limiter (300 requests / 15 minutes per IP)
export const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

// Authentication Rate Limiter (15 attempts / 15 minutes per IP)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts. Please wait 15 minutes before trying again.' },
});

// File Upload Rate Limiter (30 uploads / hour per IP)
export const uploadRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Upload limit exceeded. Maximum 30 uploads per hour.' },
});

// Profile View Telemetry Rate Limiter (60 requests / minute per IP)
export const viewRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Rate limit exceeded for profile telemetry.' },
});
