/**
 * Vercel Serverless Function for Hidden Parser
 * Deploy this to Vercel by placing in /api/ directory
 */

import { handler } from '../src/services/hiddenParserServer.js';

export default async function(req, res) {
  const request = {
    method: req.method,
    url: `${req.url}`,
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