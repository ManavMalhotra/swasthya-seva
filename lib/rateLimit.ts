type RateLimitStore = Map<string, { count: number; lastReset: number }>;

const globalStore: RateLimitStore = new Map();

interface RateLimitConfig {
    limit: number;      // Max requests
    windowMs: number;   // Time window in milliseconds
}

export function rateLimit(
    identifier: string,
    config: RateLimitConfig = { limit: 10, windowMs: 60000 } // Default: 10 req/min
): { success: boolean; remaining: number } {
    const now = Date.now();
    const record = globalStore.get(identifier);

    if (!record) {
        globalStore.set(identifier, { count: 1, lastReset: now });
        return { success: true, remaining: config.limit - 1 };
    }

    // Check if window has passed
    if (now - record.lastReset > config.windowMs) {
        record.count = 1;
        record.lastReset = now;
        return { success: true, remaining: config.limit - 1 };
    }

    // Increment count
    if (record.count >= config.limit) {
        return { success: false, remaining: 0 };
    }

    record.count++;
    return { success: true, remaining: config.limit - record.count };
}
