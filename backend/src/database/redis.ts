import { createClient } from 'redis';
import { config, redisConfig } from '../config.js';
import { logger } from '../utils/logger.js';

export type RedisClient = ReturnType<typeof createClient>;

/**
 * Redis client singleton
 * Provides caching, pub/sub, and real-time state management
 */
export class RedisConnection {
  private static instance: RedisConnection;
  private client: RedisClient | null = null;
  private subscriber: RedisClient | null = null;
  private isConnected = false;

  private constructor() {}

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisConnection {
    if (!RedisConnection.instance) {
      RedisConnection.instance = new RedisConnection();
    }
    return RedisConnection.instance;
  }

  /**
   * Connect to Redis
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.warn('Redis already connected');
      return;
    }

    try {
      // Create main client (use REDIS_URL for Upstash, fallback to manual config)
      if (config.REDIS_URL) {
        this.client = createClient({
          url: config.REDIS_URL,
        });
      } else {
        this.client = createClient({
          socket: {
            host: redisConfig.host,
            port: redisConfig.port,
          },
          password: redisConfig.password,
          database: redisConfig.db,
        });
      }

      // Create subscriber client (separate connection for pub/sub)
      this.subscriber = this.client.duplicate();

      // Setup event handlers
      this.setupEventHandlers(this.client, 'main');
      this.setupEventHandlers(this.subscriber, 'subscriber');

      // Connect both clients
      await Promise.all([
        this.client.connect(),
        this.subscriber.connect(),
      ]);

      this.isConnected = true;
      logger.info('Redis clients connected successfully');
    } catch (error) {
      logger.error({
        type: 'redis_connection_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  /**
   * Get the main Redis client
   */
  public getClient(): RedisClient {
    if (!this.client || !this.isConnected) {
      throw new Error('Redis client not connected. Call connect() first.');
    }
    return this.client;
  }

  /**
   * Get the subscriber client for pub/sub
   */
  public getSubscriber(): RedisClient {
    if (!this.subscriber || !this.isConnected) {
      throw new Error('Redis subscriber not connected. Call connect() first.');
    }
    return this.subscriber;
  }

  /**
   * Check Redis health
   */
  public async healthCheck(): Promise<{ status: 'up' | 'down'; latency?: number; error?: string }> {
    const start = Date.now();
    try {
      if (!this.client || !this.isConnected) {
        return { status: 'down', error: 'Not connected' };
      }
      await this.client.ping();
      const latency = Date.now() - start;
      return { status: 'up', latency };
    } catch (error) {
      return {
        status: 'down',
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Close Redis connections
   */
  public async close(): Promise<void> {
    try {
      if (this.client) {
        await this.client.quit();
      }
      if (this.subscriber) {
        await this.subscriber.quit();
      }
      this.isConnected = false;
      logger.info('Redis clients disconnected');
    } catch (error) {
      logger.error({
        type: 'redis_disconnect_error',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Setup event handlers for Redis client
   */
  private setupEventHandlers(client: RedisClient, name: string): void {
    client.on('connect', () => {
      logger.debug(`Redis ${name} client connecting...`);
    });

    client.on('ready', () => {
      logger.info(`Redis ${name} client ready`);
    });

    client.on('error', (err) => {
      logger.error({
        type: 'redis_client_error',
        client: name,
        error: err.message,
      });
    });

    client.on('reconnecting', () => {
      logger.warn(`Redis ${name} client reconnecting...`);
    });

    client.on('end', () => {
      logger.info(`Redis ${name} client connection ended`);
    });
  }

  /**
   * Set a key with optional expiry
   */
  public async set(key: string, value: string, expirySeconds?: number): Promise<void> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    
    if (expirySeconds) {
      await client.setEx(fullKey, expirySeconds, value);
    } else {
      await client.set(fullKey, value);
    }
  }

  /**
   * Get a key's value
   */
  public async get(key: string): Promise<string | null> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.get(fullKey);
  }

  /**
   * Delete a key
   */
  public async del(key: string): Promise<number> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.del(fullKey);
  }

  /**
   * Set hash field
   */
  public async hSet(key: string, field: string, value: string): Promise<number> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.hSet(fullKey, field, value);
  }

  /**
   * Get hash field
   */
  public async hGet(key: string, field: string): Promise<string | undefined> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.hGet(fullKey, field);
  }

  /**
   * Get all hash fields
   */
  public async hGetAll(key: string): Promise<Record<string, string>> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.hGetAll(fullKey);
  }

  /**
   * Delete hash field
   */
  public async hDel(key: string, field: string): Promise<number> {
    const client = this.getClient();
    const fullKey = `${redisConfig.keyPrefix}${key}`;
    return await client.hDel(fullKey, field);
  }

  /**
   * Publish message to channel
   */
  public async publish(channel: string, message: string): Promise<number> {
    const client = this.getClient();
    const fullChannel = `${redisConfig.keyPrefix}${channel}`;
    return await client.publish(fullChannel, message);
  }

  /**
   * Subscribe to channel
   */
  public async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    const subscriber = this.getSubscriber();
    const fullChannel = `${redisConfig.keyPrefix}${channel}`;
    await subscriber.subscribe(fullChannel, handler);
  }
}

// Export singleton instance
export const redis = RedisConnection.getInstance();
