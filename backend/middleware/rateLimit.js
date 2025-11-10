/**
 * Simple in-memory rate limiter
 * For production, use redis-based solution (express-rate-limit + redis)
 */

const requestCounts = new Map();

/**
 * Rate limiter middleware
 * @param {number} maxRequests - Max requests per window
 * @param {number} windowMs - Time window in milliseconds
 */
function rateLimit(maxRequests = 100, windowMs = 60000) {
  return (req, res, next) => {
    const identifier = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    
    // Get or create request log for this IP
    if (!requestCounts.has(identifier)) {
      requestCounts.set(identifier, []);
    }
    
    const requests = requestCounts.get(identifier);
    
    // Remove old requests outside the window
    const validRequests = requests.filter(timestamp => now - timestamp < windowMs);
    
    if (validRequests.length >= maxRequests) {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Max ${maxRequests} requests per ${windowMs / 1000} seconds.`,
        retry_after: Math.ceil((validRequests[0] + windowMs - now) / 1000)
      });
    }
    
    // Add current request
    validRequests.push(now);
    requestCounts.set(identifier, validRequests);
    
    next();
  };
}

// Cleanup old entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [ip, requests] of requestCounts.entries()) {
    const validRequests = requests.filter(timestamp => now - timestamp < 300000);
    if (validRequests.length === 0) {
      requestCounts.delete(ip);
    } else {
      requestCounts.set(ip, validRequests);
    }
  }
}, 300000);

module.exports = rateLimit;
