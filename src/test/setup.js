import '@testing-library/jest-dom'
import { vi } from 'vitest'

// Mock environment variables
vi.mock('../config/environment', () => ({
  GEMINI_API_KEY: 'test-gemini-key',
  APPS_SCRIPT_URL: 'https://script.google.com/macros/s/test-script-id/exec',
  API_TOKEN: 'test-api-token',
  HIDDEN_PARSER_URL: 'https://test-parser.vercel.app/api/normalize'
}))

// Mock fetch globally
global.fetch = vi.fn()

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
}

// Setup DOM globals
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
})

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))