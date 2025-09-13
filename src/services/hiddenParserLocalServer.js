/**
 * Local Development Server for Hidden Parser
 * Run this for local testing before deploying to serverless platforms
 * 
 * Usage:
 * node src/services/hiddenParserLocalServer.js
 * 
 * The server will run on http://localhost:3001
 */

import express from 'express';
import cors from 'cors';
import { expressHandler } from './hiddenParserServer.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Hidden Parser Local Server',
    status: 'running',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    endpoints: {
      normalize: 'POST /normalize',
      validate: 'POST /validate',
      health: 'GET /health'
    }
  });
});

// Use the express handler for all routes
app.use('/', expressHandler);

// Error handling middleware
app.use((error, req, res, next) => {
  console.error('Server error:', error);
  res.status(500).json({
    ok: false,
    error: 'Internal server error',
    message: error.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Hidden Parser Local Server running on http://localhost:${PORT}`);
  console.log(`📋 Health check: http://localhost:${PORT}/health`);
  console.log(`🔧 Normalize endpoint: POST http://localhost:${PORT}/normalize`);
  console.log(`✅ Validate endpoint: POST http://localhost:${PORT}/validate`);
  console.log('');
  console.log('Environment variables:');
  console.log(`- GEMINI_API_KEY: ${process.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log(`- OPENROUTER_API_KEY: ${process.env.VITE_OPENROUTER_API_KEY || process.env.OPENROUTER_API_KEY ? '✅ Set' : '❌ Not set'}`);
  console.log('');
  console.log('Ready to receive requests! 🎉');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});