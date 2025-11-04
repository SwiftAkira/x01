import { z } from 'zod';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Environment schema validation
const envSchema = z.object({
  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Server Configuration
  REST_API_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3001'),
  REST_API_HOST: z.string().default('0.0.0.0'),
  REALTIME_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('3002'),
  REALTIME_HOST: z.string().default('0.0.0.0'),

  // CORS Configuration
  CORS_ORIGIN: z.string().default('http://localhost:5173'),

  // Database Configuration (supports both Neon and manual config)
  DATABASE_URL: z.string().url().optional(),
  POSTGRES_URL: z.string().url().optional(), // Neon/Vercel Postgres
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('5432'),
  DB_NAME: z.string().default('speedlink_db'),
  DB_USER: z.string().default('speedlink_user'),
  DB_PASSWORD: z.string().default('speedlink_password'),
  DB_MAX_CONNECTIONS: z.string().transform(Number).pipe(z.number().int().positive()).default('20'),
  DB_IDLE_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('30000'),
  DB_CONNECTION_TIMEOUT: z.string().transform(Number).pipe(z.number().int().positive()).default('5000'),

  // Redis Configuration (supports both Upstash and manual config)
  REDIS_URL: z.string().url().optional(), // Upstash Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().transform(Number).pipe(z.number().int().positive()).default('6379'),
  REDIS_PASSWORD: z.string().optional().default(''),
  REDIS_DB: z.string().transform(Number).pipe(z.number().int().min(0)).default('0'),
  REDIS_KEY_PREFIX: z.string().default('speedlink:'),

  // JWT Configuration
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_ACCESS_TOKEN_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_TOKEN_EXPIRY: z.string().default('7d'),
  JWT_ALGORITHM: z.enum(['HS256', 'HS384', 'HS512']).default('HS256'),

  // Rate Limiting
  RATE_LIMIT_MAX: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),
  RATE_LIMIT_TIME_WINDOW: z.string().transform(Number).pipe(z.number().int().positive()).default('60000'),

  // Logging
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  LOG_PRETTY_PRINT: z.string().transform(val => val === 'true').default('false'),

  // Party Configuration
  MAX_PARTY_SIZE: z.string().transform(Number).pipe(z.number().int().positive()).default('20'),
  PARTY_EXPIRY_HOURS: z.string().transform(Number).pipe(z.number().int().positive()).default('24'),
  PARTY_CODE_LENGTH: z.string().transform(Number).pipe(z.number().int().positive()).default('6'),

  // Location Configuration
  LOCATION_BROADCAST_THROTTLE_MS: z.string().transform(Number).pipe(z.number().int().positive()).default('1000'),
  MAX_LOCATION_HISTORY: z.string().transform(Number).pipe(z.number().int().positive()).default('100'),

  // Security
  BCRYPT_ROUNDS: z.string().transform(Number).pipe(z.number().int().positive()).default('12'),
});

// Parse and validate environment
const parseEnv = () => {
  try {
    return envSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error('❌ Environment validation failed:');
      error.errors.forEach((err) => {
        console.error(`  - ${err.path.join('.')}: ${err.message}`);
      });
      process.exit(1);
    }
    throw error;
  }
};

// Export validated config
export const config = parseEnv();

// Type-safe config object
export type Config = z.infer<typeof envSchema>;

// Derived configurations
export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
export const isTest = config.NODE_ENV === 'test';

// Database connection string (prioritize POSTGRES_URL for Neon)
export const getDatabaseUrl = () => {
  return config.POSTGRES_URL || config.DATABASE_URL || 
    `postgresql://${config.DB_USER}:${config.DB_PASSWORD}@${config.DB_HOST}:${config.DB_PORT}/${config.DB_NAME}`;
};

// CORS origins as array
export const getCorsOrigins = () => {
  return config.CORS_ORIGIN.split(',').map(origin => origin.trim());
};

// Export individual config sections for convenience
export const serverConfig = {
  restApi: {
    port: config.REST_API_PORT,
    host: config.REST_API_HOST,
  },
  realtime: {
    port: config.REALTIME_PORT,
    host: config.REALTIME_HOST,
  },
};

export const databaseConfig = {
  host: config.DB_HOST,
  port: config.DB_PORT,
  database: config.DB_NAME,
  user: config.DB_USER,
  password: config.DB_PASSWORD,
  max: config.DB_MAX_CONNECTIONS,
  idleTimeoutMillis: config.DB_IDLE_TIMEOUT,
  connectionTimeoutMillis: config.DB_CONNECTION_TIMEOUT,
};

export const redisConfig = {
  host: config.REDIS_HOST,
  port: config.REDIS_PORT,
  password: config.REDIS_PASSWORD || undefined,
  db: config.REDIS_DB,
  keyPrefix: config.REDIS_KEY_PREFIX,
};

export const jwtConfig = {
  secret: config.JWT_SECRET,
  accessTokenExpiry: config.JWT_ACCESS_TOKEN_EXPIRY,
  refreshTokenExpiry: config.JWT_REFRESH_TOKEN_EXPIRY,
  algorithm: config.JWT_ALGORITHM,
};

export const partyConfig = {
  maxSize: config.MAX_PARTY_SIZE,
  expiryHours: config.PARTY_EXPIRY_HOURS,
  codeLength: config.PARTY_CODE_LENGTH,
};

export default config;
