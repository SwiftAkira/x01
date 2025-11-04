/**
 * Vercel Serverless Function Entry Point
 * Wraps the REST API server for Vercel deployment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createServer } from './server.js';
import { redis } from '../database/redis.js';
import { logger } from '../utils/logger.js';

// Cache the Fastify instance
let fastify: Awaited<ReturnType<typeof createServer>> | null = null;

// Initialize connections once
let initialized = false;

async function initialize() {
  if (initialized) return;
  await redis.connect();
  initialized = true;
}

// Create and export the handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    // Initialize connections on first request
    if (!initialized) {
      await initialize();
    }

    // Create or reuse Fastify instance
    if (!fastify) {
      fastify = await createServer();
      await fastify.ready();
    }

    // Handle the request
    fastify.server.emit('request', req, res);
  } catch (error) {
    logger.error('Handler error:', error);
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Server initialization failed',
      },
    });
  }
}
