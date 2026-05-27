import { createClient } from "redis";

let redisClient = null;
let isRedisConnected = false;
const memoryCache = new Map();

/**
 * Initialize the caching client (Redis or fallback)
 */
export const initCache = async () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn("REDIS_URL not found in environment variables. Using local memory cache fallback.");
    return;
  }

  try {
    redisClient = createClient({ url: redisUrl });

    redisClient.on("error", (err) => {
      console.error("Redis client error:", err.message || err);
      isRedisConnected = false;
    });

    redisClient.on("connect", () => {
      console.log("Redis client connection established.");
    });

    redisClient.on("ready", () => {
      console.log("Redis client is ready.");
      isRedisConnected = true;
    });

    redisClient.on("end", () => {
      console.warn("Redis client connection ended.");
      isRedisConnected = false;
    });

    await redisClient.connect();
  } catch (err) {
    console.error("Failed to connect to Redis. Caching will fall back to local RAM memory.", err.message || err);
    redisClient = null;
    isRedisConnected = false;
  }
};

/**
 * Retrieve a value from the cache
 */
export const getCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const val = await redisClient.get(key);
      if (val) {
        return JSON.parse(val);
      }
      return null;
    } catch (err) {
      console.error(`Redis get failed for key "${key}", falling back to memory:`, err.message || err);
    }
  }

  // Local Memory Cache Fallback
  const cached = memoryCache.get(key);
  if (cached) {
    if (cached.expiresAt > Date.now()) {
      return cached.value;
    }
    // Evict expired item
    memoryCache.delete(key);
  }
  return null;
};

/**
 * Store a value in the cache with a Time-To-Live (TTL) in seconds
 */
export const setCache = async (key, value, ttlSeconds = 300) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, JSON.stringify(value), {
        EX: ttlSeconds,
      });
      return;
    } catch (err) {
      console.error(`Redis set failed for key "${key}", falling back to memory:`, err.message || err);
    }
  }

  // Local Memory Cache Fallback
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
};

/**
 * Delete a specific key from the cache
 */
export const delCache = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
      return;
    } catch (err) {
      console.error(`Redis del failed for key "${key}", falling back to memory:`, err.message || err);
    }
  }

  // Local Memory Cache Fallback
  memoryCache.delete(key);
};

/**
 * Invalidate all keys matching a specific prefix pattern
 */
export const clearCachePrefix = async (prefix) => {
  if (isRedisConnected && redisClient) {
    try {
      // In production/clustered environments, SCAN is safer than KEYS
      let cursor = 0;
      const keysToDelete = [];
      do {
        const reply = await redisClient.scan(cursor, {
          MATCH: `${prefix}*`,
          COUNT: 100,
        });
        cursor = reply.cursor;
        keysToDelete.push(...reply.keys);
      } while (cursor !== 0);

      if (keysToDelete.length > 0) {
        await redisClient.del(keysToDelete);
      }
      return;
    } catch (err) {
      console.error(`Redis clearCachePrefix failed for pattern "${prefix}*", falling back to memory:`, err.message || err);
    }
  }

  // Local Memory Cache Fallback
  for (const key of memoryCache.keys()) {
    if (key.startsWith(prefix)) {
      memoryCache.delete(key);
    }
  }
};
