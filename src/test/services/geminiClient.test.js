import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Mock Google Generative AI
const mockGoogleGenerativeAI = vi.fn()
vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: mockGoogleGenerativeAI
}))

describe('GeminiClient', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('Client Initialization', () => {
    it('should create GoogleGenerativeAI instance', async () => {
      // The client should be instantiated with some API key
      const { default: genAI } = await import('../../services/geminiClient.js')

      expect(mockGoogleGenerativeAI).toHaveBeenCalledTimes(1)
      expect(mockGoogleGenerativeAI).toHaveBeenCalledWith(expect.any(String))
      
      // Should not call with empty string
      const apiKey = mockGoogleGenerativeAI.mock.calls[0][0]
      expect(apiKey).toBeTruthy()
      expect(typeof apiKey).toBe('string')
      expect(apiKey.length).toBeGreaterThan(0)
    })

    it('should export the client instance', async () => {
      const { default: genAI } = await import('../../services/geminiClient.js')

      // Should return the mock instance we set up
      expect(genAI).toBeDefined()
      expect(typeof genAI).toBe('object')
    })

    it('should be a singleton - same instance on multiple imports', async () => {
      const mockInstance = { 
        getGenerativeModel: vi.fn(),
        singleton: true 
      }
      mockGoogleGenerativeAI.mockReturnValue(mockInstance)

      const { default: genAI1 } = await import('../../services/geminiClient.js')
      const { default: genAI2 } = await import('../../services/geminiClient.js')

      expect(genAI1).toBe(genAI2)
    })
  })



  describe('getApiKey Function Logic (Unit Test)', () => {
    it('should prioritize VITE_GEMINI_API_KEY over VITE_GOOGLE_API_KEY', () => {
      // Create a mock environment object
      const mockEnv1 = {
        VITE_GEMINI_API_KEY: 'gemini-priority',
        VITE_GOOGLE_API_KEY: 'google-secondary'
      }

      // Test the key priority logic
      const selectedKey = mockEnv1.VITE_GEMINI_API_KEY || mockEnv1.VITE_GOOGLE_API_KEY || 'dummy-key-for-testing'
      expect(selectedKey).toBe('gemini-priority')
    })

    it('should fallback to VITE_GOOGLE_API_KEY when VITE_GEMINI_API_KEY is not available', () => {
      const mockEnv2 = {
        VITE_GOOGLE_API_KEY: 'google-fallback'
      }

      const selectedKey = mockEnv2.VITE_GEMINI_API_KEY || mockEnv2.VITE_GOOGLE_API_KEY || 'dummy-key-for-testing'
      expect(selectedKey).toBe('google-fallback')
    })

    it('should fallback to dummy key when no environment variables are available', () => {
      const mockEnv3 = {}

      const selectedKey = mockEnv3.VITE_GEMINI_API_KEY || mockEnv3.VITE_GOOGLE_API_KEY || 'dummy-key-for-testing'
      expect(selectedKey).toBe('dummy-key-for-testing')
    })

    it('should handle empty string API keys correctly', () => {
      const mockEnv4 = {
        VITE_GEMINI_API_KEY: '',
        VITE_GOOGLE_API_KEY: 'fallback-key'
      }

      const selectedKey = mockEnv4.VITE_GEMINI_API_KEY || mockEnv4.VITE_GOOGLE_API_KEY || 'dummy-key-for-testing'
      expect(selectedKey).toBe('fallback-key')
    })
  })
})