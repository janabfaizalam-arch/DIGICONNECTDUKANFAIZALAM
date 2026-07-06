// A simple in-memory rate limiter for the new auth system
// For production across multiple instances, you would use Redis or the database, but memory works for demonstration.

const rateLimitMap = new Map<string, { count: number; timestamp: number }>();

export function checkRateLimit(key: string, limit: number = 5, windowMs: number = 60000): { success: boolean } {
  const now = Date.now();
  const record = rateLimitMap.get(key);

  if (!record) {
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return { success: true };
  }

  if (now - record.timestamp > windowMs) {
    // Reset window
    rateLimitMap.set(key, { count: 1, timestamp: now });
    return { success: true };
  }

  if (record.count >= limit) {
    return { success: false };
  }

  record.count += 1;
  rateLimitMap.set(key, record);
  return { success: true };
}
