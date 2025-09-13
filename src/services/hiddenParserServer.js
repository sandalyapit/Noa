/**
 * Hidden Parser Server
 * Serverless function wrapper for the Hidden LLM Normalizer
 * 
 * This can be deployed to:
 * - Vercel (api/normalize.js)
 * - Netlify (netlify/functions/normalize.js)
 * - AWS Lambda
 * - Google Cloud Functions
 */

import { normalize, normalizeWithAI, validate, health } from './hiddenParserImplementation.js';

/**
 * CORS headers for cross-origin requests
 */
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Max-Age': '86400'
};

/**
 * Main handler function
 * @param {Object} request - HTTP request object
 * @returns {Object} HTTP response
 */
export async function handler(request) {
  // Handle CORS preflight
  if (request.method === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    const url = new URL(request.url);
    const path = url.pathname;

    // Route requests
    switch (path) {
      case '/normalize':
        return await handleNormalize(request);
      case '/validate':
        return await handleValidate(request);
      case '/health':
        return await handleHealth(request);
      default:
        return createResponse(404, { error: 'Not found' });
    }
  } catch (error) {
    console.error('Handler error:', error);
    return createResponse(500, { error: 'Internal server error' });
  }
}

/**
 * Handles normalization requests
 * @param {Object} request - HTTP request
 * @returns {Object} HTTP response
 */
async function handleNormalize(request) {
  if (request.method !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(request);
    
    if (!body.raw) {
      return createResponse(400, { error: 'Missing raw data' });
    }

    // Use AI-enhanced normalization if enabled, otherwise fall back to rule-based
    const useAI = body.options?.useAI !== false; // Default to true
    
    let result;
    if (useAI) {
      result = await normalizeWithAI(body.raw, body.options || {});
    } else {
      result = normalize(body.raw, body.options || {});
    }
    
    return createResponse(200, result);
  } catch (error) {
    console.error('Normalize error:', error);
    return createResponse(400, { 
      ok: false, 
      error: 'Failed to normalize data: ' + error.message
    });
  }
}

/**
 * Handles validation requests
 * @param {Object} request - HTTP request
 * @returns {Object} HTTP response
 */
async function handleValidate(request) {
  if (request.method !== 'POST') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  try {
    const body = await parseBody(request);
    
    if (!body.data || !body.data.action) {
      return createResponse(400, { error: 'Missing data or action' });
    }

    const result = validate(body.data, body.data.action);
    
    return createResponse(200, result);
  } catch (error) {
    console.error('Validate error:', error);
    return createResponse(400, { 
      valid: false, 
      error: 'Failed to parse request body' 
    });
  }
}

/**
 * Handles health check requests
 * @param {Object} request - HTTP request
 * @returns {Object} HTTP response
 */
async function handleHealth(request) {
  if (request.method !== 'GET') {
    return createResponse(405, { error: 'Method not allowed' });
  }

  const result = health();
  return createResponse(200, result);
}

/**
 * Parses request body
 * @param {Object} request - HTTP request
 * @returns {Object} Parsed body
 */
async function parseBody(request) {
  if (request.body) {
    // Already parsed (some platforms do this automatically)
    return typeof request.body === 'string' ? JSON.parse(request.body) : request.body;
  }

  // Handle different body formats
  if (request.rawBody) {
    return JSON.parse(request.rawBody);
  }

  if (request.text) {
    const text = await request.text();
    return JSON.parse(text);
  }

  if (request.json) {
    return await request.json();
  }

  throw new Error('Could not parse request body');
}

/**
 * Creates standardized HTTP response
 * @param {number} statusCode - HTTP status code
 * @param {Object} body - Response body
 * @returns {Object} HTTP response
 */
function createResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders
    },
    body: JSON.stringify(body)
  };
}

// Platform-specific exports

/**
 * Vercel handler
 */
export default async function vercelHandler(req, res) {
  const request = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  };

  const response = await handler(request);
  
  res.status(response.statusCode);
  Object.entries(response.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.send(response.body);
}

/**
 * Netlify handler
 */
export async function netlifyHandler(event, context) {
  const request = {
    method: event.httpMethod,
    url: event.path,
    headers: event.headers,
    body: event.body
  };

  return await handler(request);
}

/**
 * AWS Lambda handler
 */
export async function lambdaHandler(event, context) {
  const request = {
    method: event.httpMethod,
    url: event.path,
    headers: event.headers,
    body: event.body
  };

  const response = await handler(request);
  
  return {
    statusCode: response.statusCode,
    headers: response.headers,
    body: response.body
  };
}

/**
 * Google Cloud Functions handler
 */
export async function gcfHandler(req, res) {
  const request = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  };

  const response = await handler(request);
  
  res.status(response.statusCode);
  Object.entries(response.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.send(JSON.parse(response.body));
}

/**
 * Express.js handler (for local development)
 */
export async function expressHandler(req, res) {
  const request = {
    method: req.method,
    url: req.url,
    headers: req.headers,
    body: req.body
  };

  const response = await handler(request);
  
  res.status(response.statusCode);
  Object.entries(response.headers).forEach(([key, value]) => {
    res.setHeader(key, value);
  });
  res.send(JSON.parse(response.body));
}