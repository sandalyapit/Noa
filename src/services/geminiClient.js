import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Initializes the Gemini client with the API key from environment variables.
 * @returns {GoogleGenerativeAI} Configured Gemini client instance.
 */
const getApiKey = () => {
  // Check if import.meta.env is available (browser/Vite environment)
  let env = {};
  try {
    if (typeof globalThis !== 'undefined' && globalThis.import && globalThis.import.meta && globalThis.import.meta.env) {
      env = globalThis.import.meta.env;
    } else if (import.meta && import.meta.env) {
      env = import.meta.env;
    }
  } catch (e) {
    // Fallback to empty env if import.meta is not available
    env = {};
  }
  return env.VITE_GEMINI_API_KEY || env.VITE_GOOGLE_API_KEY || 'dummy-key-for-testing';
};

const genAI = new GoogleGenerativeAI(getApiKey());

export default genAI;