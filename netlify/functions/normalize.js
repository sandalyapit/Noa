/**
 * Netlify Function for Hidden Parser
 * Deploy this to Netlify by placing in /netlify/functions/ directory
 */

import { handler } from '../../src/services/hiddenParserServer.js';

export async function handler(event, context) {
  const request = {
    method: event.httpMethod,
    url: event.path,
    headers: event.headers,
    body: event.body
  };

  return await handler(request);
}